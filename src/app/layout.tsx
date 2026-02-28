import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { ErrorBoundary } from "@/components/error-boundary";

export const metadata: Metadata = {
  title: "MedLens — Your Recovery Assistant",
  description:
    "Turn your discharge papers into a personal recovery assistant. Free, private, always available.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MedLens",
  },
  openGraph: {
    title: "MedLens — Your Recovery Assistant",
    description: "Turn your discharge papers into a personal recovery assistant.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F766E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen antialiased">
        <AnalyticsProvider>
          <a href="#main" className="skip-link">
            Skip to main content
          </a>
          <ErrorBoundary>
            <main id="main">{children}</main>
          </ErrorBoundary>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
