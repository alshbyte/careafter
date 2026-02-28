/**
 * MedLens — Privacy-First Analytics Service
 * =============================================
 *
 * LEARN-ALONG: Privacy by Design
 * This analytics module follows "privacy by design" principles:
 *
 * 1. NO PII (Personally Identifiable Information) is ever collected.
 *    We don't track user IDs, names, emails, IP addresses, or device fingerprints.
 *
 * 2. SESSION IDs are random and ephemeral — generated fresh each page load,
 *    never stored in localStorage/cookies, and cannot be linked across sessions.
 *
 * 3. EVENTS are anonymized — we only track *what* happened (e.g., "scan_completed"),
 *    never *who* did it. Properties are limited to non-identifying metrics like
 *    processing time or page path.
 *
 * 4. BATCHING — events are queued and sent in batches to minimize network requests.
 *    If the user is offline, events stay in the queue and send when connectivity returns.
 *
 * 5. NON-BLOCKING — analytics never delays user interactions. All sends are async
 *    with fire-and-forget semantics. If analytics fails, the app keeps working.
 */

// ── Types ──────────────────────────────────────────────────────────────────

/** The set of events we track. Keeping a union type ensures we don't accidentally
 *  track arbitrary strings — every event must be intentionally added here. */
export type AnalyticsEventName =
  | "page_view"
  | "scan_started"
  | "scan_completed"
  | "extraction_completed"
  | "plan_confirmed"
  | "calendar_added"
  | "medication_explained"
  | "question_asked"
  | "medication_taken"
  | "share_link_created"
  | "push_subscribed"
  | "pwa_installed"
  | "error_occurred";

/** A single analytics event. Notice: no user ID, no IP, no PII fields. */
export interface AnalyticsEvent {
  /** Random per-session identifier — NOT persistent across sessions */
  sessionId: string;
  /** ISO-8601 timestamp of when the event occurred */
  timestamp: string;
  /** The event name from our allowed set */
  eventName: AnalyticsEventName;
  /** Optional non-PII properties (e.g., { page: "/plan", processingTimeMs: 1200 }) */
  properties?: Record<string, string | number | boolean>;
}

// ── Configuration ──────────────────────────────────────────────────────────

/** How often (ms) to flush the event queue automatically */
const FLUSH_INTERVAL_MS = 30_000; // 30 seconds

/** Flush when this many events accumulate (whichever comes first) */
const FLUSH_THRESHOLD = 10;

/** API endpoint to send events to */
const ANALYTICS_ENDPOINT = "/api/analytics";

// ── Session ID ─────────────────────────────────────────────────────────────

/**
 * LEARN: We generate a random session ID using crypto.randomUUID().
 * This ID lives only in memory — it's never written to localStorage,
 * cookies, or IndexedDB. When the user closes the tab, it's gone forever.
 * This means we can count "sessions" but can never link two sessions
 * to the same person.
 */
function generateSessionId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── Analytics Service (Singleton) ──────────────────────────────────────────

class AnalyticsService {
  private queue: AnalyticsEvent[] = [];
  private sessionId: string;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isFlushing = false;

  constructor() {
    this.sessionId = generateSessionId();
  }

  /**
   * Initialize the service — sets up the automatic flush interval
   * and online/offline listeners.
   *
   * LEARN: We only start the interval on the client side (not during SSR).
   * The `typeof window` check is a standard Next.js pattern for this.
   */
  init(): void {
    if (typeof window === "undefined") return;

    // Flush on a regular interval
    this.flushTimer = setInterval(() => {
      this.flush();
    }, FLUSH_INTERVAL_MS);

    // When the user comes back online, try to send queued events
    window.addEventListener("online", () => {
      this.flush();
    });
  }

  /**
   * Track an analytics event.
   *
   * LEARN: This is intentionally synchronous and non-blocking.
   * We push to an in-memory array and return immediately — the user's
   * interaction is never delayed by analytics. The queue is flushed
   * asynchronously on a timer or when it reaches the threshold.
   */
  trackEvent(
    name: AnalyticsEventName,
    properties?: Record<string, string | number | boolean>
  ): void {
    const event: AnalyticsEvent = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      eventName: name,
      properties,
    };

    this.queue.push(event);

    // If we've hit the batch threshold, flush immediately
    if (this.queue.length >= FLUSH_THRESHOLD) {
      this.flush();
    }
  }

  /**
   * Flush all queued events to the analytics API.
   *
   * LEARN: We use navigator.sendBeacon() when available because it's
   * designed for exactly this use case — sending data during page unload.
   * Unlike fetch(), sendBeacon() is guaranteed to be sent even if the
   * page is closing. We fall back to fetch() for mid-session flushes.
   */
  async flush(): Promise<void> {
    // Don't flush if there's nothing to send, we're already flushing,
    // we're offline, or we're on the server
    if (
      this.queue.length === 0 ||
      this.isFlushing ||
      typeof window === "undefined" ||
      !navigator.onLine
    ) {
      return;
    }

    // Take a snapshot of the current queue and clear it.
    // If the send fails, we'll put the events back.
    const eventsToSend = [...this.queue];
    this.queue = [];
    this.isFlushing = true;

    try {
      const payload = JSON.stringify({ events: eventsToSend });

      // Try sendBeacon first (works during page unload)
      if (navigator.sendBeacon) {
        const sent = navigator.sendBeacon(
          ANALYTICS_ENDPOINT,
          new Blob([payload], { type: "application/json" })
        );
        if (!sent) {
          // sendBeacon failed — put events back in queue
          this.queue.unshift(...eventsToSend);
        }
      } else {
        // Fallback to fetch for browsers without sendBeacon
        const response = await fetch(ANALYTICS_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          // keepalive allows the request to outlive the page
          keepalive: true,
        });
        if (!response.ok) {
          // Server rejected — put events back for retry
          this.queue.unshift(...eventsToSend);
        }
      }
    } catch {
      // Network error — put events back in queue for later retry
      this.queue.unshift(...eventsToSend);
    } finally {
      this.isFlushing = false;
    }
  }

  /** Clean up timers when the service is destroyed */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

/**
 * LEARN: We use a singleton pattern here so that all components share
 * the same event queue and session ID. This is safe because:
 * - On the server, analytics.init() is a no-op (no timers, no listeners)
 * - On the client, there's only one instance per page load
 */
export const analytics = new AnalyticsService();
