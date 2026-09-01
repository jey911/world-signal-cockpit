"use client";

import type { LocalBaseline, MarketQuote, WorldFrame } from "@/types/market";

const DB_NAME = "world-signal-cockpit";
const DB_VERSION = 1;
const BASELINES = "baselines";
const FRAMES = "frames";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BASELINES)) {
        db.createObjectStore(BASELINES, { keyPath: "symbol" });
      }
      if (!db.objectStoreNames.contains(FRAMES)) {
        const store = db.createObjectStore(FRAMES, { keyPath: "generatedAt" });
        store.createIndex("generatedAt", "generatedAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadBaselines(): Promise<Record<string, LocalBaseline>> {
  if (typeof indexedDB === "undefined") return {};
  const db = await openDb();
  const tx = db.transaction(BASELINES, "readonly");
  const rows = await requestResult<LocalBaseline[]>(tx.objectStore(BASELINES).getAll());
  db.close();
  return Object.fromEntries(rows.map((row) => [row.symbol, row]));
}

export async function updateBaselines(
  quotes: MarketQuote[],
  previous: Record<string, LocalBaseline>,
): Promise<Record<string, LocalBaseline>> {
  if (typeof indexedDB === "undefined") return previous;
  const next = { ...previous };
  const db = await openDb();
  const tx = db.transaction(BASELINES, "readwrite");
  const store = tx.objectStore(BASELINES);

  for (const quote of quotes) {
    if (!quote.price || !quote.regularMarketTime) continue;
    const old = next[quote.symbol];
    if (!old) {
      const created: LocalBaseline = {
        symbol: quote.symbol,
        count: 0,
        meanReturn: 0,
        m2Return: 0,
        lastPrice: quote.price,
        lastTs: quote.regularMarketTime,
        updatedAt: Date.now(),
      };
      next[quote.symbol] = created;
      store.put(created);
      continue;
    }
    if (old.lastTs === quote.regularMarketTime || !old.lastPrice) continue;

    const value = (quote.price / old.lastPrice - 1) * 100;
    const count = old.count + 1;
    const delta = value - old.meanReturn;
    const meanReturn = old.meanReturn + delta / count;
    const delta2 = value - meanReturn;
    const updated: LocalBaseline = {
      ...old,
      count,
      meanReturn,
      m2Return: old.m2Return + delta * delta2,
      lastPrice: quote.price,
      lastTs: quote.regularMarketTime,
      updatedAt: Date.now(),
    };
    next[quote.symbol] = updated;
    store.put(updated);
  }

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
  return next;
}

export async function saveWorldFrame(frame: WorldFrame): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  const tx = db.transaction(FRAMES, "readwrite");
  const store = tx.objectStore(FRAMES);
  store.put(frame);
  const allKeys = await requestResult<IDBValidKey[]>(store.getAllKeys());
  if (allKeys.length > 500) {
    const deleteCount = allKeys.length - 500;
    for (const key of allKeys.slice(0, deleteCount)) store.delete(key);
  }
  await new Promise<void>((resolve) => {
    tx.oncomplete = () => resolve();
  });
  db.close();
}

export function loadWatchlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("wse-watchlist") ?? "[]");
  } catch {
    return [];
  }
}

export function saveWatchlist(symbols: string[]) {
  localStorage.setItem("wse-watchlist", JSON.stringify(symbols));
}

export async function loadWorldFrames(limit = 100): Promise<WorldFrame[]> {
  if (typeof indexedDB === "undefined") return [];
  const db = await openDb();
  const tx = db.transaction(FRAMES, "readonly");
  const rows = await requestResult<WorldFrame[]>(tx.objectStore(FRAMES).getAll());
  db.close();
  return rows.slice(-limit).reverse();
}
