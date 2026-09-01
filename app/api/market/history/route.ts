import { NextRequest, NextResponse } from "next/server";

const USER_AGENT =
  "Mozilla/5.0 (compatible; WorldSignalCockpit/0.1) AppleWebKit/537.36 Chrome/140 Safari/537.36";
const SYMBOL_RE = /^[A-Za-z0-9^=.\-]{1,24}$/;
const RANGES = new Set(["1d", "5d", "1mo", "3mo", "6mo", "1y"]);
const INTERVALS = new Set(["1m", "5m", "15m", "30m", "1h", "1d"]);

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") ?? "";
  const range = request.nextUrl.searchParams.get("range") ?? "5d";
  const interval = request.nextUrl.searchParams.get("interval") ?? "15m";
  if (!SYMBOL_RE.test(symbol) || !RANGES.has(range) || !INTERVALS.has(interval)) {
    return NextResponse.json({ error: "invalid parameters" }, { status: 400 });
  }
  const params = new URLSearchParams({ range, interval, events: "div,splits" });
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${params}`,
    {
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
      next: { revalidate: interval === "1d" ? 300 : 30 },
    },
  );
  if (!response.ok) {
    return NextResponse.json({ error: `market provider ${response.status}` }, { status: 502 });
  }
  const json = (await response.json()) as {
    chart?: {
      result?: Array<{
        meta?: { currency?: string; exchangeTimezoneName?: string };
        timestamp?: number[];
        indicators?: { quote?: Array<{ close?: Array<number | null> }> };
      }>;
    };
  };
  const result = json.chart?.result?.[0];
  if (!result) return NextResponse.json({ points: [] });
  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const points = timestamps.flatMap((time, index) => {
    const value = closes[index];
    return typeof value === "number" ? [{ time, value }] : [];
  });
  return NextResponse.json({
    symbol,
    currency: result.meta?.currency ?? null,
    timezone: result.meta?.exchangeTimezoneName ?? null,
    points,
  });
}
