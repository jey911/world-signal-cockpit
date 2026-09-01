export type SensorRole = "leading" | "confirming" | "control";

export type SensorCategory =
  | "global-equity"
  | "country-region"
  | "fx"
  | "rates-credit"
  | "energy"
  | "metals-agriculture"
  | "strategic-sector"
  | "safe-haven"
  | "crypto";

export type EventSensitivity =
  | "military-escalation"
  | "energy-disruption"
  | "sovereign-stress"
  | "financial-stress"
  | "supply-chain"
  | "inflation"
  | "china-taiwan"
  | "middle-east"
  | "global-risk"
  | "cyber";

export interface SensorDefinition {
  id: string;
  symbol: string;
  name: string;
  category: SensorCategory;
  region: string;
  role: SensorRole;
  sensitivity: EventSensitivity[];
  priority: 1 | 2 | 3;
}

export interface MarketQuote {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string | null;
  marketState: string | null;
  regularMarketTime: number | null;
  volume: number | null;
  averageVolume: number | null;
  fiftyDayAverage: number | null;
  twoHundredDayAverage: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  exchange: string | null;
  source: "yahoo-quote" | "yahoo-chart";
}

export interface LocalBaseline {
  symbol: string;
  count: number;
  meanReturn: number;
  m2Return: number;
  lastPrice: number | null;
  lastTs: number | null;
  updatedAt: number;
}

export interface SensorState extends SensorDefinition {
  quote?: MarketQuote;
  anomalyScore: number;
  anomalySigma: number | null;
  quality: number;
  baselineStatus: "learning" | "local" | "proxy";
}

export interface RelationshipDefinition {
  id: string;
  name: string;
  thesis: string;
  symbols: string[];
  sensitivity: EventSensitivity[];
}

export interface RelationshipState extends RelationshipDefinition {
  score: number;
  direction: "normal" | "elevated" | "stressed";
  contributors: { symbol: string; score: number; changePercent: number | null }[];
}

export interface RiskVector {
  globalRisk: number;
  military: number;
  energy: number;
  sovereign: number;
  financial: number;
  supplyChain: number;
  inflation: number;
}

export interface WorldFrame {
  schema: "wse.world-frame.browser.v1";
  generatedAt: string;
  horizon: "1h" | "24h" | "7d" | "30d";
  narrativePhase: "blind" | "revealed";
  dataHealth: number;
  riskVector: RiskVector;
  topAnomalies: Array<{
    sensorId: string;
    symbol: string;
    name: string;
    score: number;
    sigma: number | null;
    changePercent: number | null;
    role: SensorRole;
    sensitivity: EventSensitivity[];
  }>;
  relationshipBreaks: Array<{
    id: string;
    name: string;
    score: number;
    direction: RelationshipState["direction"];
  }>;
  missingCriticalSensors: string[];
  sourceHealth: {
    market: number;
    localBaselineCoverage: number;
  };
}
