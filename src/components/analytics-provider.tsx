"use client";

/**
 * CareAfter — Analytics Provider
 * ================================
 *
 * LEARN-ALONG: React Context for Analytics
 *
 * This component does three things:
 *
 * 1. INITIALIZES the analytics service when the app loads
 * 2. AUTOMATICALLY tracks page_view events on route changes
 * 3. PROVIDES a `useAnalytics()` hook so any component can track events
 *
 * Why a Context Provider?
 * - Analytics needs to be initialized once and shared across the entire app
 * - We need access to Next.js routing hooks (usePathname) to track page views
 * - Components throughout the tree need to call trackEvent() without prop drilling
 *
 * Privacy note: The analytics service itself enforces all privacy rules.
 * This provider is just the React "glue" that connects it to the component tree.
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { analytics, type AnalyticsEventName } from "@/lib/analytics/analytics";

// ── Context ────────────────────────────────────────────────────────────────

interface AnalyticsContextValue {
  /** Track a named event with optional non-PII properties */
  trackEvent: (
    name: AnalyticsEventName,
    properties?: Record<string, string | number | boolean>
  ) => void;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

// ── Hook ───────────────────────────────────────────────────────────────────

/**
 * LEARN: Custom hook for accessing analytics from any component.
 * Usage: const { trackEvent } = useAnalytics();
 *        trackEvent("scan_completed", { method: "camera" });
 */
export function useAnalytics(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext);
  if (!context) {
    // Return a no-op if used outside the provider (e.g., during SSR or tests)
    return {
      trackEvent: () => {},
    };
  }
  return context;
}

// ── Provider Component ─────────────────────────────────────────────────────

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const initialized = useRef(false);

  // Initialize analytics once on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    analytics.init();

    /**
     * LEARN: Flush on Page Unload
     *
     * We listen for two events to ensure queued analytics are sent:
     *
     * - `visibilitychange`: Fires when the user switches tabs or minimizes
     *   the browser. On mobile, this is the most reliable unload signal
     *   because `beforeunload` doesn't always fire.
     *
     * - `beforeunload`: Fires when the user closes the tab/window.
     *   Less reliable on mobile but works well on desktop.
     *
     * We use analytics.flush() which internally uses navigator.sendBeacon()
     * — the only reliable way to send data during page unload.
     */
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        analytics.flush();
      }
    };

    const handleBeforeUnload = () => {
      analytics.flush();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      analytics.destroy();
    };
  }, []);

  /**
   * LEARN: Automatic Page View Tracking
   *
   * Next.js `usePathname()` returns the current URL path and updates
   * on client-side navigations. By tracking it in a useEffect, we
   * automatically log a `page_view` event every time the user navigates.
   *
   * We only send the path (e.g., "/plan") — never query parameters
   * (which could contain tokens or PII).
   */
  useEffect(() => {
    if (pathname) {
      analytics.trackEvent("page_view", { page: pathname });
    }
  }, [pathname]);

  const contextValue: AnalyticsContextValue = {
    trackEvent: (name, properties) => analytics.trackEvent(name, properties),
  };

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
}
