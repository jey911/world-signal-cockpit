import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "World Signal Cockpit",
    short_name: "World Signal",
    description: "Geoeconomic early-warning cockpit",
    start_url: "/",
    display: "standalone",
    background_color: "#071018",
    theme_color: "#071018",
  };
}
