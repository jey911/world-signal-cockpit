"use client";

import { useEffect, useState } from "react";

type Topic = {
  id: string;
  label: string;
  status: "ok" | "unavailable";
  latest: number | null;
  acceleration: number | null;
};

export function NarrativePanel({ enabled }: { enabled: boolean }) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [asOf, setAsOf] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setLoading(true);
    fetch("/api/narrative", { signal: controller.signal })
      .then((response) => response.json())
      .then((data: { topics?: Topic[]; asOf?: string }) => {
        setTopics(data.topics ?? []);
        setAsOf(data.asOf ?? null);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [enabled]);

  if (!enabled) {
    return (
      <section className="panel narrative-lock">
        <div>
          <div className="eyebrow">Narrative firewall</div>
          <h2>Blind phase active</h2>
          <p>
            News is deliberately withheld. Inspect market structure first; reveal narrative only after you have an independent read.
          </p>
        </div>
        <span className="lock-mark">BLIND</span>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Narrative layer · GDELT</div>
          <h2>Public-event acceleration</h2>
        </div>
        <span className="tiny-meta">{loading ? "Updating…" : asOf ? new Date(asOf).toLocaleTimeString() : ""}</span>
      </div>
      <div className="narrative-grid">
        {topics.map((topic) => (
          <div className="narrative-item" key={topic.id}>
            <span>{topic.label}</span>
            <strong className={(topic.acceleration ?? 0) > 25 ? "positive" : (topic.acceleration ?? 0) < -25 ? "negative" : ""}>
              {topic.status !== "ok" || topic.acceleration === null
                ? "—"
                : `${topic.acceleration >= 0 ? "+" : ""}${topic.acceleration.toFixed(0)}%`}
            </strong>
            <small>recent vs prior window</small>
          </div>
        ))}
      </div>
      <p className="source-note">Narrative is explanatory context, not proof of causation.</p>
    </section>
  );
}
