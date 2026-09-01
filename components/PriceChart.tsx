"use client";

import { useEffect, useRef, useState } from "react";
import { AreaSeries, ColorType, createChart, type UTCTimestamp } from "lightweight-charts";

interface Point {
  time: number;
  value: number;
}

export function PriceChart({ symbol }: { symbol: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    fetch(`/api/market/history?symbol=${encodeURIComponent(symbol)}&range=5d&interval=15m`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("history");
        return response.json() as Promise<{ points: Point[] }>;
      })
      .then((data) => {
        setPoints(data.points ?? []);
        setStatus("ready");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
      });
    return () => controller.abort();
  }, [symbol]);

  useEffect(() => {
    if (!host.current || !points.length) return;
    const chart = createChart(host.current, {
      autoSize: true,
      height: 240,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8fa2b7",
        attributionLogo: true,
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.06)" },
        horzLines: { color: "rgba(148, 163, 184, 0.06)" },
      },
      rightPriceScale: { borderColor: "rgba(148, 163, 184, 0.12)" },
      timeScale: { borderColor: "rgba(148, 163, 184, 0.12)", timeVisible: true },
      crosshair: { vertLine: { color: "rgba(96, 165, 250, .35)" }, horzLine: { color: "rgba(96, 165, 250, .35)" } },
    });
    const series = chart.addSeries(AreaSeries, {
      lineColor: "#69a7ff",
      topColor: "rgba(105, 167, 255, .22)",
      bottomColor: "rgba(105, 167, 255, .01)",
      lineWidth: 2,
      priceLineVisible: false,
    });
    series.setData(points.map((point) => ({ time: point.time as UTCTimestamp, value: point.value })));
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [points]);

  if (status === "loading") return <div className="chart-placeholder skeleton" />;
  if (status === "error" || !points.length) {
    return <div className="chart-placeholder muted">Historical series unavailable.</div>;
  }
  return <div className="price-chart" ref={host} />;
}
