import type {
  EventSensitivity,
  LocalBaseline,
  MarketQuote,
  RelationshipState,
  RiskVector,
  SensorCategory,
  SensorState,
  WorldFrame,
} from "@/types/market";
import { RELATIONSHIPS } from "@/data/sensors";

const CATEGORY_DAILY_SCALE: Record<SensorCategory, number> = {
  "global-equity": 1.15,
  "country-region": 1.8,
  fx: 0.8,
  "rates-credit": 0.9,
  energy: 2.0,
  "metals-agriculture": 1.8,
  "strategic-sector": 1.7,
  "safe-haven": 1.1,
  crypto: 3.5,
};

export const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

export function scoreProxy(
  category: SensorCategory,
  quote: MarketQuote | undefined,
): number {
  if (!quote?.price) return 0;
  const move = Math.abs(quote.changePercent ?? 0);
  const moveRatio = move / CATEGORY_DAILY_SCALE[category];
  const distance50 = quote.fiftyDayAverage
    ? Math.abs((quote.price / quote.fiftyDayAverage - 1) * 100)
    : 0;
  const volumeRatio =
    quote.volume && quote.averageVolume && quote.averageVolume > 0
      ? quote.volume / quote.averageVolume
      : 1;

  return clamp(
    moveRatio * 28 + Math.min(distance50, 20) * 1.4 + Math.max(volumeRatio - 1, 0) * 10,
  );
}

export function computeSigma(
  baseline: LocalBaseline | undefined,
  quote: MarketQuote | undefined,
): number | null {
  if (!baseline || baseline.count < 8 || !baseline.lastPrice || !quote?.price) return null;
  const variance = baseline.count > 1 ? baseline.m2Return / (baseline.count - 1) : 0;
  const sd = Math.sqrt(Math.max(variance, 0));
  if (sd < 0.0001) return null;
  const currentReturn = (quote.price / baseline.lastPrice - 1) * 100;
  return (currentReturn - baseline.meanReturn) / sd;
}

export function sensorAnomaly(
  sensor: Pick<SensorState, "category">,
  quote: MarketQuote | undefined,
  baseline: LocalBaseline | undefined,
): { score: number; sigma: number | null; baselineStatus: SensorState["baselineStatus"] } {
  const proxy = scoreProxy(sensor.category, quote);
  const sigma = computeSigma(baseline, quote);
  if (sigma === null) {
    return {
      score: proxy,
      sigma: null,
      baselineStatus: baseline?.count ? "learning" : "proxy",
    };
  }
  const local = clamp(Math.abs(sigma) * 22);
  return {
    score: clamp(local * 0.72 + proxy * 0.28),
    sigma,
    baselineStatus: "local",
  };
}

export function relationshipStates(states: SensorState[]): RelationshipState[] {
  const bySymbol = new Map(states.map((state) => [state.symbol, state]));
  return RELATIONSHIPS.map((relationship) => {
    const contributors = relationship.symbols
      .map((symbol) => bySymbol.get(symbol))
      .filter((item): item is SensorState => Boolean(item?.quote?.price))
      .map((item) => ({
        symbol: item.symbol,
        score: item.anomalyScore,
        changePercent: item.quote?.changePercent ?? null,
      }))
      .sort((a, b) => b.score - a.score);

    const top = contributors.slice(0, Math.min(5, contributors.length));
    const base = top.length ? top.reduce((sum, item) => sum + item.score, 0) / top.length : 0;
    const breadth = contributors.length
      ? contributors.filter((item) => item.score >= 35).length / contributors.length
      : 0;
    const score = clamp(base * 0.78 + breadth * 22);
    const direction: RelationshipState["direction"] =
      score >= 70 ? "stressed" : score >= 42 ? "elevated" : "normal";

    return {
      ...relationship,
      score,
      direction,
      contributors: contributors.slice(0, 5),
    };
  }).sort((a, b) => b.score - a.score);
}

function scoreSensitivity(
  states: SensorState[],
  relationships: RelationshipState[],
  sensitivity: EventSensitivity,
): number {
  const sensorScores = states
    .filter((sensor) => sensor.sensitivity.includes(sensitivity) && sensor.quality > 0)
    .map((sensor) => sensor.anomalyScore)
    .sort((a, b) => b - a)
    .slice(0, 8);
  const relScores = relationships
    .filter((relationship) => relationship.sensitivity.includes(sensitivity))
    .map((relationship) => relationship.score)
    .sort((a, b) => b - a)
    .slice(0, 3);

  const sensorPart = sensorScores.length
    ? sensorScores.reduce((sum, score) => sum + score, 0) / sensorScores.length
    : 0;
  const relPart = relScores.length
    ? relScores.reduce((sum, score) => sum + score, 0) / relScores.length
    : 0;
  return clamp(sensorPart * 0.65 + relPart * 0.35);
}

export function riskVector(
  states: SensorState[],
  relationships: RelationshipState[],
): RiskVector {
  return {
    globalRisk: scoreSensitivity(states, relationships, "global-risk"),
    military: scoreSensitivity(states, relationships, "military-escalation"),
    energy: scoreSensitivity(states, relationships, "energy-disruption"),
    sovereign: scoreSensitivity(states, relationships, "sovereign-stress"),
    financial: scoreSensitivity(states, relationships, "financial-stress"),
    supplyChain: scoreSensitivity(states, relationships, "supply-chain"),
    inflation: scoreSensitivity(states, relationships, "inflation"),
  };
}

export function buildWorldFrame(
  states: SensorState[],
  relationships: RelationshipState[],
  horizon: WorldFrame["horizon"],
  narrativePhase: WorldFrame["narrativePhase"],
): WorldFrame {
  const available = states.filter((sensor) => Boolean(sensor.quote?.price));
  const local = available.filter((sensor) => sensor.baselineStatus === "local");
  const criticalMissing = states
    .filter((sensor) => sensor.priority === 1 && !sensor.quote?.price)
    .map((sensor) => sensor.symbol);

  return {
    schema: "wse.world-frame.browser.v1",
    generatedAt: new Date().toISOString(),
    horizon,
    narrativePhase,
    dataHealth: states.length ? available.length / states.length : 0,
    riskVector: riskVector(states, relationships),
    topAnomalies: [...states]
      .filter((sensor) => sensor.quote?.price)
      .sort((a, b) => b.anomalyScore - a.anomalyScore)
      .slice(0, 15)
      .map((sensor) => ({
        sensorId: sensor.id,
        symbol: sensor.symbol,
        name: sensor.name,
        score: sensor.anomalyScore,
        sigma: sensor.anomalySigma,
        changePercent: sensor.quote?.changePercent ?? null,
        role: sensor.role,
        sensitivity: sensor.sensitivity,
      })),
    relationshipBreaks: relationships.slice(0, 8).map((relationship) => ({
      id: relationship.id,
      name: relationship.name,
      score: relationship.score,
      direction: relationship.direction,
    })),
    missingCriticalSensors: criticalMissing,
    sourceHealth: {
      market: states.length ? available.length / states.length : 0,
      localBaselineCoverage: available.length ? local.length / available.length : 0,
    },
  };
}
