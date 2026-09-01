# AGENTS.md — World Signal Cockpit Operating Contract

## Mission

Operate this system as a geoeconomic **early-warning and hypothesis-generation instrument**. Do not convert stress scores into deterministic claims about war, sanctions, coups, market crashes or other future events.

## Primary state

Prefer this order:

1. `window.__WSE_WORLD_FRAME__`
2. `/api/agent/universe`
3. relationship drill-down
4. individual sensor history
5. public narrative only after the blind read is recorded

Do not scrape visible card text if structured state is available.

## Core loop

```text
orient -> compare -> identify contradiction/missingness -> drill down ->
form competing hypotheses -> reveal narrative if justified -> update assessment
```

### Orient

Read:

- dataHealth
- riskVector
- topAnomalies
- relationshipBreaks
- missingCriticalSensors
- sourceHealth.localBaselineCoverage

If data health is poor, downgrade conclusions before investigating content.

### Compare

Relationship sensors are more informative than isolated movers. Check whether a move is global, regional, sector-specific, or inconsistent across expected corroborators.

### Contradict

For every high-confidence interpretation, explicitly name at least one observation that should be present if the interpretation were correct and verify whether it is actually present.

### Explain

The default phase is `blind`. Do not reveal GDELT merely to make the market movement easier to narrate. Reveal narrative to test an already-formed market hypothesis or to explain a persistent residual.

## Stable verbs

- `scope` — narrow/broaden geography or domain using registry metadata.
- `compare` — inspect a relationship sensor or control.
- `trace` — inspect one sensor's quote/history and baseline state.
- `test` — choose the cheapest observation that discriminates hypotheses.
- `explain` — reveal public narrative after blind assessment.
- `replay` — inspect locally stored WorldFrames without rewriting current state.
- `watch` — add a sensor to the browser watchlist.
- `stop` — state why further work is unlikely to change the decision.

## Score semantics

- `0-24`: normal
- `25-44`: watch
- `45-69`: elevated
- `70-100`: stressed

These bands prioritize investigation. They are not event probabilities.

A local sigma becomes available only after enough distinct market timestamps have accumulated in IndexedDB. Until then, the system labels the baseline `proxy` or `learning`.

## Resource discipline

- Do not fetch historical series for all 113 sensors. Open history only for discriminating evidence.
- Do not reveal narrative during routine monitoring.
- Do not repeatedly fetch the universe registry; it is static and cacheable.
- Prefer the top relationship break plus its contributors before expanding the top 15 anomalies individually.
- If the WorldFrame is materially unchanged, reuse the prior assessment.

## Provider independence

Never reason from Yahoo-specific fields. The normalized `MarketQuote`, `SensorDefinition`, `RelationshipState` and `WorldFrame` types are the stable contract.
