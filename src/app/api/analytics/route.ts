import { NextRequest, NextResponse } from "next/server";

/**
 * CareAfter — Analytics Ingestion API
 * =====================================
 *
 * LEARN-ALONG: Privacy-First Analytics Endpoint
 *
 * This endpoint receives batched analytics events from the client.
 * Key privacy and security measures:
 *
 * 1. PII DETECTION — we scan every event for patterns that look like
 *    emails, phone numbers, or fields named "name"/"email"/"ssn"/etc.
 *    If PII is detected, the entire batch is rejected. This is a safety
 *    net — the client should never send PII, but defense-in-depth matters.
 *
 * 2. RATE LIMITING — we limit requests per IP to prevent abuse.
 *    In production, this would use Redis or a rate-limiting service.
 *
 * 3. BATCH SIZE LIMITS — we reject batches > 50 events to prevent
 *    payload abuse. The client batches 10 events at a time normally.
 *
 * 4. MVP LOGGING — for now, we just log events to the server console in a
 *    structured format. In production, you'd forward these to PostHog,
 *    Amplitude, or a data warehouse.
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface AnalyticsEvent {
  sessionId: string;
  timestamp: string;
  eventName: string;
  properties?: Record<string, string | number | boolean>;
}

interface AnalyticsPayload {
  events: AnalyticsEvent[];
}

// ── Rate Limiting ──────────────────────────────────────────────────────────

/**
 * LEARN: In-memory rate limiting works for single-server deployments.
 * For production with multiple servers, use Redis or a managed service
 * like Cloudflare Rate Limiting. We track request counts per IP and
 * reset them after the time window expires.
 */
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100; // requests per window
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now > record.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT) return false;
  record.count++;
  return true;
}

// ── PII Detection ──────────────────────────────────────────────────────────

/**
 * LEARN: PII Detection as a Safety Net
 *
 * Even though our client code never sends PII, we add server-side
 * detection as defense-in-depth. This catches accidental PII leaks
 * from future code changes or third-party integrations.
 *
 * We check for:
 * - Email patterns (user@example.com)
 * - Phone number patterns (10+ digit sequences, formatted numbers)
 * - Suspicious field names (name, email, phone, address, ssn)
 */

/** Field names that should never appear in analytics properties */
const PII_FIELD_NAMES = new Set([
  "name",
  "email",
  "phone",
  "address",
  "ssn",
  "social",
  "dob",
  "dateofbirth",
  "date_of_birth",
  "firstname",
  "first_name",
  "lastname",
  "last_name",
  "fullname",
  "full_name",
  "ip",
  "ipaddress",
  "ip_address",
  "password",
]);

/** Regex patterns that indicate PII in values */
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_PATTERN = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const SSN_PATTERN = /\d{3}-\d{2}-\d{4}/;

function containsPII(event: AnalyticsEvent): boolean {
  if (!event.properties) return false;

  for (const [key, value] of Object.entries(event.properties)) {
    // Check field names (case-insensitive, strip separators)
    if (PII_FIELD_NAMES.has(key.toLowerCase().replace(/[-_\s]/g, ""))) {
      return true;
    }

    // Check string values for PII patterns
    if (typeof value === "string") {
      if (EMAIL_PATTERN.test(value)) return true;
      if (PHONE_PATTERN.test(value)) return true;
      if (SSN_PATTERN.test(value)) return true;
    }
  }

  return false;
}

// ── Validation ─────────────────────────────────────────────────────────────

function validatePayload(
  body: unknown
): { valid: true; payload: AnalyticsPayload } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid payload" };
  }

  const payload = body as AnalyticsPayload;

  if (!Array.isArray(payload.events)) {
    return { valid: false, error: "Missing events array" };
  }

  // Reject oversized batches to prevent abuse
  if (payload.events.length > 50) {
    return { valid: false, error: "Batch too large (max 50 events)" };
  }

  if (payload.events.length === 0) {
    return { valid: false, error: "Empty events array" };
  }

  // Validate each event and check for PII
  for (const event of payload.events) {
    if (!event.sessionId || !event.timestamp || !event.eventName) {
      return { valid: false, error: "Invalid event structure" };
    }

    if (containsPII(event)) {
      return {
        valid: false,
        error: "PII detected in event payload — rejected for privacy",
      };
    }
  }

  return { valid: true, payload };
}

// ── Route Handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Rate limiting — get IP from headers (works behind proxies like Vercel)
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const result = validatePayload(body);

    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const { payload } = result;

    /**
     * LEARN: MVP Logging
     * For the MVP, we log events to the server console in a structured format.
     * In production, you would forward these to an analytics service:
     *
     *   await posthog.capture(event.eventName, event.properties);
     *   // or
     *   await amplitude.track(event.eventName, event.properties);
     *
     * The structured format makes it easy to parse with log aggregation
     * tools like Datadog, CloudWatch, or Grafana Loki.
     */
    for (const event of payload.events) {
      console.log(
        JSON.stringify({
          _type: "analytics",
          sessionId: event.sessionId,
          event: event.eventName,
          timestamp: event.timestamp,
          properties: event.properties ?? {},
        })
      );
    }

    return NextResponse.json({ received: payload.events.length });
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }
}
