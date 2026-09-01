import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TOPICS = [
  { id: "military", label: "Military / conflict", query: "(military OR conflict OR war OR missile)" },
  { id: "sanctions", label: "Sanctions", query: "(sanctions OR embargo OR export control)" },
  { id: "unrest", label: "Civil unrest", query: "(protest OR unrest OR riot OR coup)" },
  { id: "energy", label: "Energy disruption", query: "(pipeline OR refinery OR energy disruption OR oil supply)" },
  { id: "shipping", label: "Shipping disruption", query: "(shipping disruption OR port closure OR blockade OR tanker)" },
  { id: "cyber", label: "Cyber disruption", query: "(cyberattack OR ransomware OR internet outage)" },
] as const;

function extractTimeline(raw: unknown) {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;
  const timeline = Array.isArray(obj.timeline) ? obj.timeline : [];
  const series = timeline[0] && typeof timeline[0] === "object" ? (timeline[0] as Record<string, unknown>) : null;
  const data = series && Array.isArray(series.data) ? series.data : [];
  return data.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const value = row as Record<string, unknown>;
    const date = typeof value.date === "string" ? value.date : null;
    const count = typeof value.value === "number" ? value.value : typeof value.count === "number" ? value.count : null;
    return date && count !== null ? [{ date, count }] : [];
  });
}

async function fetchTopic(topic: (typeof TOPICS)[number]) {
  const params = new URLSearchParams({
    query: topic.query,
    mode: "timelinevolraw",
    format: "json",
    timespan: "1d",
    timelinesmooth: "0",
  });
  const response = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?${params}`, {
    headers: { accept: "application/json" },
    next: { revalidate: 300 },
  });
  if (!response.ok) return { ...topic, status: "unavailable" as const, latest: null, acceleration: null };
  const raw = (await response.json()) as unknown;
  const timeline = extractTimeline(raw);
  const latest = timeline.at(-1)?.count ?? null;
  const recent = timeline.slice(-4);
  const prior = timeline.slice(-8, -4);
  const avg = (values: { count: number }[]) =>
    values.length ? values.reduce((sum, item) => sum + item.count, 0) / values.length : 0;
  const recentAvg = avg(recent);
  const priorAvg = avg(prior);
  const acceleration = priorAvg > 0 ? ((recentAvg / priorAvg) - 1) * 100 : null;
  return { ...topic, status: "ok" as const, latest, acceleration, points: timeline.slice(-16) };
}

export async function GET() {
  const rows = await Promise.all(TOPICS.map(fetchTopic));
  return NextResponse.json({
    asOf: new Date().toISOString(),
    source: "GDELT DOC 2.0",
    topics: rows,
  });
}
