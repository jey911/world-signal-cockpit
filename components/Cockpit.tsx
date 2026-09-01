"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import { NarrativePanel } from "@/components/NarrativePanel";
import { PriceChart } from "@/components/PriceChart";
import { RELATIONSHIPS, SENSORS, SENSOR_COUNT } from "@/data/sensors";
import { buildWorldFrame, relationshipStates, sensorAnomaly } from "@/lib/scoring";
import {
  loadBaselines,
  loadWatchlist,
  loadWorldFrames,
  saveWatchlist,
  saveWorldFrame,
  updateBaselines,
} from "@/lib/storage";
import type {
  LocalBaseline,
  MarketQuote,
  RiskVector,
  SensorCategory,
  SensorRole,
  SensorState,
  WorldFrame,
} from "@/types/market";

type View = "pulse" | "sensors" | "relations" | "narrative" | "agent" | "replay";
type Horizon = WorldFrame["horizon"];

type QuoteResponse = {
  quotes?: MarketQuote[];
  degraded?: boolean;
  asOf?: string;
  error?: string;
};

const CATEGORY_LABELS: Record<SensorCategory, string> = {
  "global-equity": "Global equity",
  "country-region": "Countries / regions",
  fx: "FX",
  "rates-credit": "Rates / credit",
  energy: "Energy",
  "metals-agriculture": "Metals / agriculture",
  "strategic-sector": "Strategic sectors",
  "safe-haven": "Safe havens",
  crypto: "Crypto",
};

const RISK_LABELS: Array<[keyof RiskVector, string]> = [
  ["globalRisk", "Global risk"],
  ["military", "Military"],
  ["energy", "Energy"],
  ["sovereign", "Sovereign"],
  ["financial", "Financial"],
  ["supplyChain", "Supply chain"],
  ["inflation", "Inflation"],
];

function formatNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1000) return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
  return value.toFixed(abs < 10 ? Math.max(digits, 3) : digits);
}

function scoreBand(score: number) {
  if (score >= 70) return { label: "STRESSED", tone: "critical" };
  if (score >= 45) return { label: "ELEVATED", tone: "warning" };
  if (score >= 25) return { label: "WATCH", tone: "watch" };
  return { label: "NORMAL", tone: "normal" };
}

function Change({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <span className="muted">—</span>;
  const cls = value > 0 ? "positive" : value < 0 ? "negative" : "muted";
  return <span className={cls}>{value > 0 ? "+" : ""}{value.toFixed(2)}%</span>;
}

function ScoreMeter({ score }: { score: number }) {
  const band = scoreBand(score);
  return (
    <div className="score-cell" title={`${band.label} · ${score.toFixed(0)}/100`}>
      <div className="score-track"><span style={{ width: `${Math.max(3, score)}%` }} /></div>
      <strong>{score.toFixed(0)}</strong>
    </div>
  );
}

function RiskCard({ label, score }: { label: string; score: number }) {
  const band = scoreBand(score);
  return (
    <article className={`risk-card ${band.tone}`}>
      <div className="risk-card-head"><span>{label}</span><b>{score.toFixed(0)}</b></div>
      <div className="risk-bar"><span style={{ width: `${score}%` }} /></div>
      <small>{band.label}</small>
    </article>
  );
}

export function Cockpit() {
  const [view, setView] = useState<View>("pulse");
  const [horizon, setHorizon] = useState<Horizon>("24h");
  const [narrativePhase, setNarrativePhase] = useState<WorldFrame["narrativePhase"]>("blind");
  const [states, setStates] = useState<SensorState[]>(() =>
    SENSORS.map((sensor) => ({ ...sensor, anomalyScore: 0, anomalySigma: null, quality: 0, baselineStatus: "proxy" })),
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | SensorCategory>("all");
  const [role, setRole] = useState<"all" | SensorRole>("all");
  const [watchOnly, setWatchOnly] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [selected, setSelected] = useState<SensorState | null>(null);
  const [frames, setFrames] = useState<WorldFrame[]>([]);
  const baselinesRef = useRef<Record<string, LocalBaseline>>({});
  const saveBucket = useRef<string | null>(null);

  const refresh = useCallback(async (baselineOverride?: Record<string, LocalBaseline>) => {
    setRefreshing(true);
    setError(null);
    try {
      const symbols = SENSORS.map((sensor) => sensor.symbol).join(",");
      const response = await fetch(`/api/market/quotes?symbols=${encodeURIComponent(symbols)}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Market endpoint ${response.status}`);
      const data = (await response.json()) as QuoteResponse;
      const quotes = data.quotes ?? [];
      const bySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));
      const baseline = baselineOverride ?? baselinesRef.current;
      const nextStates: SensorState[] = SENSORS.map((sensor) => {
        const quote = bySymbol.get(sensor.symbol);
        const scored = sensorAnomaly(sensor as SensorState, quote, baseline[sensor.symbol]);
        return {
          ...sensor,
          quote,
          anomalyScore: scored.score,
          anomalySigma: scored.sigma,
          baselineStatus: scored.baselineStatus,
          quality: quote?.price ? (quote.source === "yahoo-quote" ? 1 : 0.88) : 0,
        };
      });
      setStates(nextStates);
      setDegraded(Boolean(data.degraded));
      setLastUpdated(data.asOf ?? new Date().toISOString());
      const updated = await updateBaselines(quotes, baseline);
      baselinesRef.current = updated;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Market data unavailable");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [baselines, storedFrames] = await Promise.all([loadBaselines(), loadWorldFrames(80)]);
      if (cancelled) return;
      baselinesRef.current = baselines;
      setFrames(storedFrames);
      setWatchlist(loadWatchlist());
      const storedNarrative = localStorage.getItem("wse-narrative-phase");
      if (storedNarrative === "revealed") setNarrativePhase("revealed");
      await refresh(baselines);
    })();
    const timer = window.setInterval(() => refresh(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [refresh]);

  const relationships = useMemo(() => relationshipStates(states), [states]);
  const worldFrame = useMemo(
    () => buildWorldFrame(states, relationships, horizon, narrativePhase),
    [states, relationships, horizon, narrativePhase],
  );

  useEffect(() => {
    window.__WSE_WORLD_FRAME__ = worldFrame;
    window.dispatchEvent(new CustomEvent("wse:world-frame", { detail: worldFrame }));
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("wse-world-frame") : null;
    channel?.postMessage(worldFrame);
    channel?.close();

    const bucket = String(Math.floor(Date.parse(worldFrame.generatedAt) / 300_000));
    if (worldFrame.dataHealth > 0 && saveBucket.current !== bucket) {
      saveBucket.current = bucket;
      saveWorldFrame(worldFrame).then(() => {
        if (view === "replay") loadWorldFrames(80).then(setFrames);
      });
    }
  }, [worldFrame, view]);

  useEffect(() => {
    if (view === "replay") loadWorldFrames(80).then(setFrames);
  }, [view]);

  const toggleNarrative = () => {
    const next = narrativePhase === "blind" ? "revealed" : "blind";
    setNarrativePhase(next);
    localStorage.setItem("wse-narrative-phase", next);
  };

  const toggleWatch = (symbol: string) => {
    setWatchlist((current) => {
      const next = current.includes(symbol) ? current.filter((item) => item !== symbol) : [...current, symbol];
      saveWatchlist(next);
      return next;
    });
  };

  const filteredStates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...states]
      .filter((sensor) => category === "all" || sensor.category === category)
      .filter((sensor) => role === "all" || sensor.role === role)
      .filter((sensor) => !watchOnly || watchlist.includes(sensor.symbol))
      .filter((sensor) => !q || `${sensor.symbol} ${sensor.name} ${sensor.region}`.toLowerCase().includes(q))
      .sort((a, b) => {
        const aw = watchlist.includes(a.symbol) ? 1 : 0;
        const bw = watchlist.includes(b.symbol) ? 1 : 0;
        return bw - aw || b.anomalyScore - a.anomalyScore;
      });
  }, [states, category, role, search, watchOnly, watchlist]);

  const topRisk = useMemo(() =>
    RISK_LABELS.map(([key, label]) => ({ key, label, value: worldFrame.riskVector[key] }))
      .sort((a, b) => b.value - a.value)[0], [worldFrame.riskVector]);
  const topRelationship = relationships[0];
  const availableCount = states.filter((sensor) => sensor.quote?.price).length;
  const localCount = states.filter((sensor) => sensor.baselineStatus === "local").length;

  const copyFrame = async () => {
    await navigator.clipboard.writeText(JSON.stringify(worldFrame, null, 2));
  };

  const downloadFrame = () => {
    const blob = new Blob([JSON.stringify(worldFrame, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `world-frame-${new Date().toISOString().replaceAll(":", "-")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark">WS</div>
          <div>
            <div className="brand-name">World Signal</div>
            <div className="brand-sub">Geoeconomic early-warning cockpit</div>
          </div>
        </div>
        <div className="topbar-center">
          <span className={`status-dot ${error ? "bad" : degraded ? "warn" : "good"}`} />
          <span>{error ? "DATA ERROR" : degraded ? "DEGRADED" : loading ? "BOOTING" : "LIVE"}</span>
          <span className="top-separator" />
          <span>{availableCount}/{SENSOR_COUNT} sensors</span>
          <span className="top-separator" />
          <span>{lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "—"}</span>
        </div>
        <div className="top-actions">
          <button className={`firewall-button ${narrativePhase}`} onClick={toggleNarrative}>
            {narrativePhase === "blind" ? "Narrative: BLIND" : "Narrative: REVEALED"}
          </button>
          <button className="icon-button" onClick={() => refresh()} disabled={refreshing} aria-label="Refresh">
            {refreshing ? "···" : "↻"}
          </button>
        </div>
      </header>

      <nav className="view-tabs" aria-label="Primary views">
        {([
          ["pulse", "Pulse"],
          ["sensors", `Sensors · ${SENSOR_COUNT}`],
          ["relations", `Relations · ${RELATIONSHIPS.length}`],
          ["narrative", "Narrative"],
          ["agent", "Agent Frame"],
          ["replay", "Local Replay"],
        ] as Array<[View, string]>).map(([id, label]) => (
          <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}>{label}</button>
        ))}
        <div className="horizon-tabs" aria-label="Horizon">
          {(["1h", "24h", "7d", "30d"] as Horizon[]).map((item) => (
            <button key={item} className={horizon === item ? "active" : ""} onClick={() => setHorizon(item)}>{item.toUpperCase()}</button>
          ))}
        </div>
      </nav>

      {error && <div className="error-banner">Market refresh failed: {error}. The cockpit keeps the last usable state and will retry automatically.</div>}

      {view === "pulse" && (
        <div className="content-grid">
          <section className="hero-panel panel">
            <div className="hero-copy">
              <div className="eyebrow">Machine read · {horizon.toUpperCase()} horizon · {narrativePhase} phase</div>
              <h1>{topRisk ? `${topRisk.label} is the highest stress cluster` : "Building world state"}</h1>
              <p>
                {topRelationship
                  ? `Top relationship break: ${topRelationship.name} (${topRelationship.score.toFixed(0)}/100). This is a screening signal, not a causal claim.`
                  : "The system is compiling market evidence."}
              </p>
            </div>
            <div className="hero-metrics">
              <div><span>Data health</span><strong>{(worldFrame.dataHealth * 100).toFixed(0)}%</strong></div>
              <div><span>Local baselines</span><strong>{localCount}/{availableCount || 0}</strong></div>
              <div><span>Critical missing</span><strong>{worldFrame.missingCriticalSensors.length}</strong></div>
            </div>
          </section>

          <section className="risk-grid full-span">
            {RISK_LABELS.map(([key, label]) => <RiskCard key={key} label={label} score={worldFrame.riskVector[key]} />)}
          </section>

          <section className="panel">
            <div className="panel-head">
              <div><div className="eyebrow">Change-first</div><h2>Top anomalies</h2></div>
              <button className="text-button" onClick={() => setView("sensors")}>All sensors →</button>
            </div>
            <div className="rank-list">
              {worldFrame.topAnomalies.slice(0, 8).map((item, index) => (
                <button className="rank-row" key={item.sensorId} onClick={() => setSelected(states.find((s) => s.id === item.sensorId) ?? null)}>
                  <span className="rank-number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="rank-main"><strong>{item.symbol}</strong><small>{item.name}</small></span>
                  <Change value={item.changePercent} />
                  <span className="score-number">{item.score.toFixed(0)}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div><div className="eyebrow">Cross-domain</div><h2>Relationship breaks</h2></div>
              <button className="text-button" onClick={() => setView("relations")}>Inspect →</button>
            </div>
            <div className="relationship-list">
              {relationships.slice(0, 6).map((relationship) => (
                <div className="relationship-row" key={relationship.id}>
                  <div><strong>{relationship.name}</strong><small>{relationship.thesis}</small></div>
                  <div className={`relationship-score ${relationship.direction}`}>{relationship.score.toFixed(0)}</div>
                </div>
              ))}
            </div>
          </section>

          <div className="full-span"><NarrativePanel enabled={narrativePhase === "revealed"} /></div>
        </div>
      )}

      {view === "sensors" && (
        <section className="workspace-panel">
          <div className="workspace-head">
            <div><div className="eyebrow">Sensor registry</div><h1>Strategic universe</h1><p>113 deliberately selected sensors. Long-tail symbols should be queried on demand, not continuously scored.</p></div>
            <div className="workspace-count">{filteredStates.length}<small>visible</small></div>
          </div>
          <div className="filterbar">
            <input value={search} onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)} placeholder="Search symbol, name or region…" />
            <select value={category} onChange={(event: ChangeEvent<HTMLSelectElement>) => setCategory(event.target.value as "all" | SensorCategory)}>
              <option value="all">All domains</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={role} onChange={(event: ChangeEvent<HTMLSelectElement>) => setRole(event.target.value as "all" | SensorRole)}>
              <option value="all">All roles</option><option value="leading">Leading</option><option value="confirming">Confirming</option><option value="control">Control</option>
            </select>
            <button className={watchOnly ? "filter-toggle active" : "filter-toggle"} onClick={() => setWatchOnly((value) => !value)}>★ Watchlist</button>
          </div>
          <div className="sensor-table-wrap">
            <table className="sensor-table">
              <thead><tr><th /><th>Sensor</th><th>Region</th><th>Role</th><th>Price</th><th>Day</th><th>Anomaly</th><th>Baseline</th><th>Feed</th></tr></thead>
              <tbody>
                {filteredStates.map((sensor) => (
                  <tr key={sensor.id} onClick={() => setSelected(sensor)}>
                    <td><button className={`star ${watchlist.includes(sensor.symbol) ? "active" : ""}`} onClick={(event: MouseEvent<HTMLButtonElement>) => { event.stopPropagation(); toggleWatch(sensor.symbol); }}>★</button></td>
                    <td><strong>{sensor.symbol}</strong><small>{sensor.name}</small></td>
                    <td>{sensor.region}</td>
                    <td><span className={`role-pill ${sensor.role}`}>{sensor.role}</span></td>
                    <td><strong>{formatNumber(sensor.quote?.price)}</strong><small>{sensor.quote?.currency ?? ""}</small></td>
                    <td><Change value={sensor.quote?.changePercent} /></td>
                    <td><ScoreMeter score={sensor.anomalyScore} /></td>
                    <td><span className={`baseline-pill ${sensor.baselineStatus}`}>{sensor.anomalySigma !== null ? `${sensor.anomalySigma.toFixed(1)}σ` : sensor.baselineStatus}</span></td>
                    <td><span className={`feed-dot ${sensor.quality ? "ok" : "off"}`} />{sensor.quote?.source === "yahoo-chart" ? "fallback" : sensor.quality ? "live" : "missing"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {view === "relations" && (
        <section className="workspace-panel">
          <div className="workspace-head">
            <div><div className="eyebrow">Relationship sensors</div><h1>Detect the pattern, not the ticker</h1><p>These composites rank coordinated repricing. High scores tell the agent where to investigate next.</p></div>
            <div className="workspace-count">{RELATIONSHIPS.length}<small>composites</small></div>
          </div>
          <div className="relations-grid">
            {relationships.map((relationship) => (
              <article className={`relation-card ${relationship.direction}`} key={relationship.id}>
                <div className="relation-top"><div><span className="eyebrow">{relationship.direction}</span><h2>{relationship.name}</h2></div><strong>{relationship.score.toFixed(0)}</strong></div>
                <p>{relationship.thesis}</p>
                <div className="contributor-list">
                  {relationship.contributors.map((item) => (
                    <button key={item.symbol} onClick={() => setSelected(states.find((state) => state.symbol === item.symbol) ?? null)}>
                      <span>{item.symbol}</span><Change value={item.changePercent} /><b>{item.score.toFixed(0)}</b>
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {view === "narrative" && (
        <section className="workspace-panel narrative-workspace">
          <div className="workspace-head">
            <div><div className="eyebrow">Narrative firewall</div><h1>Explain only after observing</h1><p>The agent should form a market read before public narrative is allowed to explain the movement.</p></div>
            <button className={`firewall-large ${narrativePhase}`} onClick={toggleNarrative}>{narrativePhase === "blind" ? "Reveal public narrative" : "Return to blind phase"}</button>
          </div>
          <NarrativePanel enabled={narrativePhase === "revealed"} />
          <div className="principle-grid">
            <article><span>01</span><h3>Freeze the market read</h3><p>Record what changed and what relationships broke without reading news.</p></article>
            <article><span>02</span><h3>Reveal explanation</h3><p>Fetch public-event acceleration and ask whether it is proportional to the repricing.</p></article>
            <article><span>03</span><h3>Preserve the gap</h3><p>Large residual movement with weak public explanation becomes a high-value investigation target.</p></article>
          </div>
        </section>
      )}

      {view === "agent" && (
        <section className="workspace-panel agent-workspace">
          <div className="workspace-head">
            <div><div className="eyebrow">Agent-native surface</div><h1>WorldFrame</h1><p>The browser publishes this exact object to <code>window.__WSE_WORLD_FRAME__</code>, a <code>wse:world-frame</code> event and the <code>wse-world-frame</code> BroadcastChannel.</p></div>
            <div className="agent-actions"><button onClick={copyFrame}>Copy JSON</button><button onClick={downloadFrame}>Download</button></div>
          </div>
          <div className="agent-layout">
            <pre className="json-view">{JSON.stringify(worldFrame, null, 2)}</pre>
            <aside className="agent-guide">
              <div className="eyebrow">Stable verbs</div>
              <h3>Operator contract</h3>
              <dl>
                <div><dt>scope</dt><dd>Narrow geography/domain from sensor metadata.</dd></div>
                <div><dt>compare</dt><dd>Use relationship breaks before raw charts.</dd></div>
                <div><dt>trace</dt><dd>Open a sensor to inspect current and historical evidence.</dd></div>
                <div><dt>explain</dt><dd>Reveal narrative only after blind assessment.</dd></div>
                <div><dt>replay</dt><dd>Use locally persisted WorldFrames for browser-session learning.</dd></div>
              </dl>
              <p className="source-note">Stress scores are prioritization signals, not event probabilities.</p>
            </aside>
          </div>
        </section>
      )}

      {view === "replay" && (
        <section className="workspace-panel">
          <div className="workspace-head">
            <div><div className="eyebrow">IndexedDB · browser local</div><h1>Local replay memory</h1><p>The cockpit stores compact WorldFrames every few minutes. No remote database, account or server persistence is used.</p></div>
            <div className="workspace-count">{frames.length}<small>frames</small></div>
          </div>
          {frames.length === 0 ? (
            <div className="empty-state"><strong>Memory is accumulating.</strong><p>Keep the cockpit open through several refresh cycles; frames will appear here automatically.</p></div>
          ) : (
            <div className="replay-list">
              {frames.map((frame) => {
                const maxRisk = RISK_LABELS.map(([key, label]) => ({ label, value: frame.riskVector[key] })).sort((a, b) => b.value - a.value)[0];
                return (
                  <article key={frame.generatedAt}>
                    <time>{new Date(frame.generatedAt).toLocaleString()}</time>
                    <strong>{maxRisk.label} {maxRisk.value.toFixed(0)}</strong>
                    <span>Health {(frame.dataHealth * 100).toFixed(0)}%</span>
                    <span>{frame.narrativePhase}</span>
                    <small>{frame.topAnomalies.slice(0, 3).map((item) => item.symbol).join(" · ")}</small>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {selected && (
        <div className="drawer-backdrop" onMouseDown={() => setSelected(null)}>
          <aside className="sensor-drawer" onMouseDown={(event: MouseEvent<HTMLElement>) => event.stopPropagation()}>
            <button className="drawer-close" onClick={() => setSelected(null)}>×</button>
            <div className="drawer-heading">
              <div><div className="eyebrow">{CATEGORY_LABELS[selected.category]} · {selected.region}</div><h2>{selected.symbol}</h2><p>{selected.name}</p></div>
              <div className={`big-score ${scoreBand(selected.anomalyScore).tone}`}>{selected.anomalyScore.toFixed(0)}<small>ANOMALY</small></div>
            </div>
            <div className="drawer-price"><strong>{formatNumber(selected.quote?.price, 3)}</strong><Change value={selected.quote?.changePercent} /><span>{selected.quote?.currency}</span></div>
            <PriceChart symbol={selected.symbol} />
            <div className="drawer-facts">
              <div><span>Role</span><strong>{selected.role}</strong></div>
              <div><span>Local baseline</span><strong>{selected.anomalySigma !== null ? `${selected.anomalySigma.toFixed(2)}σ` : selected.baselineStatus}</strong></div>
              <div><span>Market state</span><strong>{selected.quote?.marketState ?? "unknown"}</strong></div>
              <div><span>Feed</span><strong>{selected.quote?.source ?? "unavailable"}</strong></div>
              <div><span>50-day avg</span><strong>{formatNumber(selected.quote?.fiftyDayAverage)}</strong></div>
              <div><span>200-day avg</span><strong>{formatNumber(selected.quote?.twoHundredDayAverage)}</strong></div>
            </div>
            <div className="drawer-section"><span className="eyebrow">Sensitive to</span><div className="tag-row">{selected.sensitivity.map((tag) => <span key={tag}>{tag}</span>)}</div></div>
            <div className="drawer-section"><span className="eyebrow">Why it matters</span><p>{selected.role === "leading" ? "This sensor is expected to reprice relatively early in at least one target event family." : selected.role === "control" ? "This sensor helps explain normal market mechanics and suppress false geopolitical alarms." : "This sensor is primarily used to confirm whether a move is broad and coherent."}</p></div>
          </aside>
        </div>
      )}
    </main>
  );
}
