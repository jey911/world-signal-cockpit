# Architecture

## Constraint

No persistent application database. All durable per-user state lives in browser IndexedDB/localStorage. Server Route Handlers are stateless adapters with only ephemeral in-memory caches.

## Runtime layers

```text
L0  Providers
    Yahoo Finance (market) / GDELT (optional public narrative)

L1  Normalized observations
    MarketQuote

L2  Local accumulation
    IndexedDB running return baselines

L3  Sensor signals
    proxy anomaly + local sigma-backed anomaly

L4  Relationship sensors
    13 cross-asset composites

L5  WorldFrame
    compact risk vector + anomalies + breaks + missingness + health

L6  Agent/human cockpit
    Pulse / Sensors / Relations / Narrative / Agent Frame / Replay
```

## Why browser-local baselines

The first priority is a system that is zero-admin, private by default and cumulative. The browser records only compact running statistics and WorldFrames. This avoids a database while allowing the anomaly model to improve as the cockpit observes distinct market timestamps.

## Why server Route Handlers still exist

They are not a backend database. They provide:

- CORS isolation;
- provider session/cookie handling;
- normalized schemas;
- batching and rate control;
- provider replacement without UI changes.

## Resource model

- Current quotes: one browser request per refresh; server batches symbols in groups of 45.
- Refresh cadence: 60 seconds.
- Provider result cache: 20 seconds in-process.
- Historical chart: only selected sensor.
- GDELT: only when narrative is revealed.
- Local WorldFrame retention: latest 500 frames.

## Failure semantics

The app never fabricates values. Unavailable sensors retain their registry metadata and have `quality=0`. Critical missing symbols appear in `WorldFrame.missingCriticalSensors`.

If the optimized multi-quote provider flow fails, the market adapter falls back to individual no-auth chart calls and marks the state degraded.
