# World Signal Cockpit

A fast, browser-local geoeconomic early-warning cockpit designed around **cross-asset anomaly detection**, **relationship breaks**, and an **agent-native WorldFrame** rather than a conventional stock dashboard.

## What it does

- Monitors **113 curated strategic sensors** spanning global equity indices, country/region ETFs, FX, rates/credit, energy, metals/agriculture, defense, semiconductors, transport/shipping, banks, safe havens and crypto.
- Computes deterministic anomaly scores with category-aware priors and progressively improves them with **local running baselines stored in IndexedDB**.
- Maintains **13 relationship sensors** for patterns such as global risk-off, Middle East escalation, Taiwan/semiconductor stress, credit stress, energy disruption and transport/shipping disruption.
- Provides a **Narrative Firewall**. By default, the market read is blind. GDELT public-event acceleration is only fetched after narrative is explicitly revealed.
- Publishes the current compact state as `window.__WSE_WORLD_FRAME__`, a `wse:world-frame` DOM event, and the `wse-world-frame` BroadcastChannel for browser agents.
- Stores compact WorldFrames locally for lightweight replay. There is **no application database** and no account backend.

## Stack

- Next.js 16.3.3 / App Router / Route Handlers
- React 19.2.7
- TypeScript
- Lightweight Charts 5.2.1
- Native IndexedDB + localStorage
- CSS variables/Grid/modern browser primitives; no UI framework and no client state library

The dependency surface is intentionally small. Expensive operations are lazy: history loads only when a sensor is opened; GDELT loads only after the narrative firewall is revealed.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Production validation:

```bash
npm run typecheck
npm run build
npm start
```

## Deploy

### Vercel (recommended)

Import the repository into Vercel. No environment variables or database are required for the default configuration. Keep the runtime on Node.js 22+.

### Any Next.js-capable Node host

```bash
npm install
npm run build
npm start
```

The application uses server-side Route Handlers only as stateless provider adapters/CORS shields. Persistent user state remains in the browser.

## Data path

```text
Yahoo market data ──> normalized quotes ──> deterministic scoring ──┐
                                                                  ├─> WorldFrame
IndexedDB baseline ─> local return distribution ─> local sigma ───┤
                                                                  │
GDELT (only when revealed) ────────────────────────────────────────┘
```

The market adapter first uses Yahoo's current multi-quote flow with cookie/crumb session handling. If that path fails, it falls back to the no-auth `v8/finance/chart` endpoint. The adapter is isolated so a licensed provider can replace Yahoo later without changing the cockpit model.

## Agent surfaces

- `GET /api/agent/universe` — complete typed sensor/relationship registry.
- `GET /api/market/quotes?symbols=...` — normalized current market observations.
- `GET /api/market/history?symbol=...&range=5d&interval=15m` — lazy OHLC-derived price history.
- `window.__WSE_WORLD_FRAME__` — current browser-compiled decision frame.
- `window.addEventListener("wse:world-frame", ...)` — frame update stream in the page.
- `new BroadcastChannel("wse-world-frame")` — cross-tab frame stream.

See [`AGENTS.md`](./AGENTS.md) for the operating contract.

## Important semantics

`anomalyScore`, the relationship scores and the risk vector are **screening/prioritization stress scores, not calibrated probabilities that an event will occur**. The first browser sessions use a transparent proxy based on move magnitude, trend displacement and volume when available. As new market timestamps arrive, IndexedDB accumulates running return statistics; sensors then transition to local z-score-backed baselines.

Closed-market values can legitimately be old. Missing data is represented explicitly rather than interpreted as confirmation.

## Data and legal note

Yahoo Finance endpoints used here are unofficial and can change. Their data is appropriate for prototyping/research subject to Yahoo's applicable terms. For commercial redistribution or execution-grade use, swap the provider adapter for licensed feeds while preserving the normalized contracts.

GDELT is used only as public narrative context. Narrative volume is not evidence that a reported event is true and is not treated as causal proof.

## Repository principles

1. Relationship-first, not ticker-first.
2. Change-first, not giant snapshots.
3. Controls and contradictions matter as much as supporting evidence.
4. The LLM/agent should not calculate what deterministic code can calculate.
5. Browser persistence should make the system cumulative without requiring infrastructure.
6. Provider-native schemas never leak into the agent contract.
7. Scale the sensor universe only after replay demonstrates incremental value.

## Status

V0 is intentionally a high-signal 113-sensor system. The next meaningful engineering step is point-in-time historical replay and calibrated baselines, not adding thousands of symbols.
