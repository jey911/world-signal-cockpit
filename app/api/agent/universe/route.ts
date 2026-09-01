import { NextResponse } from "next/server";
import { RELATIONSHIPS, SENSORS } from "@/data/sensors";

export function GET() {
  return NextResponse.json(
    {
      schema: "wse.sensor-universe.v1",
      sensorCount: SENSORS.length,
      relationshipCount: RELATIONSHIPS.length,
      sensors: SENSORS,
      relationships: RELATIONSHIPS,
      semantics: {
        anomalyScore: "0-100 prioritization score; not an event probability",
        role: {
          leading: "expected to reprice relatively early in at least one target event family",
          confirming: "tests breadth/coherence of a suspected situation",
          control: "explains ordinary market mechanics and reduces false alarms",
        },
      },
    },
    { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } },
  );
}
