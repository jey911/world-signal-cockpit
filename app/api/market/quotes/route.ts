import { NextRequest, NextResponse } from "next/server";
import type { MarketQuote } from "@/types/market";

export const dynamic = "force-dynamic";

const USER_AGENT =
  "Mozilla/5.0 (compatible; WorldSignalCockpit/0.1; +https://github.com/) AppleWebKit/537.36 Chrome/140 Safari/537.36";
const SYMBOL_RE = /^[A-Za-z0-9^=.\-]{1,24}$/;
const CACHE_TTL = 20_000;

let sessionCache: { crumb: string; cookie: string; expiresAt: number } | null = null;
const responseCache = new Map<string, { expiresAt: number; quotes: MarketQuote[] }>();

function chunks<T>(values: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size));
  return out;
}

async function yahooSession() {
  if (sessionCache && sessionCache.expiresAt > Date.now()) return sessionCache;

  const bootstrap = await fetch("https://fc.yahoo.com", {
    headers: { "user-agent": USER_AGENT, accept: "text/html,*/*" },
    redirect: "manual",
    cache: "no-store",
  });
  const cookie = bootstrap.headers.get("set-cookie")?.split(";")[0] ?? "";
  const crumbResponse = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/plain,*/*",
      ...(cookie ? { cookie } : {}),
    },
    cache: "no-store",
  });
  if (!crumbResponse.ok) throw new Error(`Yahoo crumb ${crumbResponse.status}`);
  const crumb = (await crumbResponse.text()).trim();
  if (!crumb || crumb.length > 128) throw new Error("Yahoo crumb invalid");
  sessionCache = { crumb, cookie, expiresAt: Date.now() + 20 * 60_000 };
  return sessionCache;
}

function normalizeQuote(item: Record<string, unknown>): MarketQuote {
  const n = (key: string) => (typeof item[key] === "number" ? (item[key] as number) : null);
  const s = (key: string) => (typeof item[key] === "string" ? (item[key] as string) : null);
  return {
    symbol: String(item.symbol ?? ""),
    name: String(item.shortName ?? item.longName ?? item.symbol ?? ""),
    price: n("regularMarketPrice"),
    change: n("regularMarketChange"),
    changePercent: n("regularMarketChangePercent"),
    currency: s("currency"),
    marketState: s("marketState"),
    regularMarketTime: n("regularMarketTime"),
    volume: n("regularMarketVolume"),
    averageVolume: n("averageDailyVolume3Month"),
    fiftyDayAverage: n("fiftyDayAverage"),
    twoHundredDayAverage: n("twoHundredDayAverage"),
    fiftyTwoWeekHigh: n("fiftyTwoWeekHigh"),
    fiftyTwoWeekLow: n("fiftyTwoWeekLow"),
    exchange: s("fullExchangeName") ?? s("exchange"),
    source: "yahoo-quote",
  };
}

async function quoteChunk(symbols: string[]): Promise<MarketQuote[]> {
  const { crumb, cookie } = await yahooSession();
  const params = new URLSearchParams({
    symbols: symbols.join(","),
    crumb,
    formatted: "false",
  });
  const response = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?${params}`, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "application/json",
      ...(cookie ? { cookie } : {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) sessionCache = null;
    throw new Error(`Yahoo quote ${response.status}`);
  }
  const json = (await response.json()) as {
    quoteResponse?: { result?: Record<string, unknown>[]; error?: unknown };
  };
  return (json.quoteResponse?.result ?? []).map(normalizeQuote);
}

async function chartQuote(symbol: string): Promise<MarketQuote | null> {
  const params = new URLSearchParams({ range: "5d", interval: "1d", events: "div,splits" });
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${params}`,
    { headers: { "user-agent": USER_AGENT, accept: "application/json" }, cache: "no-store" },
  );
  if (!response.ok) return null;
  const json = (await response.json()) as {
    chart?: {
      result?: Array<{
        meta?: Record<string, unknown>;
        timestamp?: number[];
        indicators?: { quote?: Array<{ close?: Array<number | null>; volume?: Array<number | null> }> };
      }>;
    };
  };
  const result = json.chart?.result?.[0];
  if (!result) return null;
  const meta = result.meta ?? {};
  const closes = (result.indicators?.quote?.[0]?.close ?? []).filter(
    (value): value is number => typeof value === "number",
  );
  const volumes = (result.indicators?.quote?.[0]?.volume ?? []).filter(
    (value): value is number => typeof value === "number",
  );
  const price =
    typeof meta.regularMarketPrice === "number"
      ? (meta.regularMarketPrice as number)
      : closes.at(-1) ?? null;
  const prev =
    typeof meta.chartPreviousClose === "number"
      ? (meta.chartPreviousClose as number)
      : closes.length > 1
        ? closes.at(-2) ?? null
        : null;
  const change = price !== null && prev !== null ? price - prev : null;
  const changePercent = price !== null && prev ? ((price / prev) - 1) * 100 : null;
  const timestamps = result.timestamp ?? [];

  return {
    symbol,
    name: typeof meta.shortName === "string" ? meta.shortName : symbol,
    price,
    change,
    changePercent,
    currency: typeof meta.currency === "string" ? meta.currency : null,
    marketState: typeof meta.marketState === "string" ? meta.marketState : null,
    regularMarketTime:
      typeof meta.regularMarketTime === "number"
        ? (meta.regularMarketTime as number)
        : timestamps.at(-1) ?? null,
    volume: volumes.at(-1) ?? null,
    averageVolume: null,
    fiftyDayAverage: null,
    twoHundredDayAverage: null,
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    exchange:
      typeof meta.fullExchangeName === "string"
        ? meta.fullExchangeName
        : typeof meta.exchangeName === "string"
          ? meta.exchangeName
          : null,
    source: "yahoo-chart",
  };
}

async function fallbackCharts(symbols: string[]): Promise<MarketQuote[]> {
  const output: MarketQuote[] = [];
  for (const batch of chunks(symbols, 10)) {
    const results = await Promise.allSettled(batch.map(chartQuote));
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) output.push(result.value);
    }
  }
  return output;
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("symbols") ?? "";
  const symbols = [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))]
    .filter((symbol) => SYMBOL_RE.test(symbol))
    .slice(0, 150);
  if (!symbols.length) {
    return NextResponse.json({ error: "symbols is required" }, { status: 400 });
  }

  const key = [...symbols].sort().join(",");
  const cached = responseCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ quotes: cached.quotes, cached: true, asOf: new Date().toISOString() });
  }

  let quotes: MarketQuote[] = [];
  let degraded = false;
  try {
    const results = await Promise.allSettled(chunks(symbols, 45).map(quoteChunk));
    for (const result of results) {
      if (result.status === "fulfilled") quotes.push(...result.value);
      else degraded = true;
    }
    if (results.some((result) => result.status === "rejected")) sessionCache = null;
  } catch {
    degraded = true;
    sessionCache = null;
  }

  const found = new Set(quotes.map((quote) => quote.symbol));
  const missing = symbols.filter((symbol) => !found.has(symbol));
  if (missing.length) {
    const fallbacks = await fallbackCharts(missing);
    quotes = [...quotes, ...fallbacks];
    degraded = degraded || fallbacks.length < missing.length;
  }

  responseCache.set(key, { quotes, expiresAt: Date.now() + CACHE_TTL });
  return NextResponse.json(
    { quotes, degraded, cached: false, asOf: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": "public, max-age=10, stale-while-revalidate=20",
      },
    },
  );
}
