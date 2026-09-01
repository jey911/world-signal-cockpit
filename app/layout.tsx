import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "World Signal Cockpit",
  description: "Browser-local geoeconomic early-warning cockpit for cross-asset anomaly detection.",
  applicationName: "World Signal",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#071018",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
