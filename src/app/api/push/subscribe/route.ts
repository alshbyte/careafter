/**
 * LEARN-ALONG: Push Subscription API
 * ====================================
 * 
 * This endpoint receives the browser's push subscription and medication
 * schedule, then stores them in Supabase so our cron job can send
 * reminders at the right times.
 * 
 * Flow:
 * 1. User taps "Enable Reminders" on care plan page
 * 2. Browser prompts for notification permission
 * 3. If granted, browser generates a PushSubscription object
 * 4. Frontend sends subscription + medication schedule to this endpoint
 * 5. We store it in Supabase
 * 6. Cron job picks it up and sends pushes at scheduled times
 * 
 * SECURITY:
 * - device_id is a hash of the subscription endpoint (anonymous)
 * - We store medication names but NO patient identity
 * - Rate limited to prevent abuse
 */

import { NextRequest, NextResponse } from "next/server";
import { upsertPushSubscription, replaceReminderSchedules } from "@/lib/push/supabase";

// Simple rate limiting (same pattern as other routes)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20; // 20 requests per hour
const RATE_WINDOW = 60 * 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

/**
 * Request body shape:
 * {
 *   subscription: { endpoint, keys: { p256dh, auth } },
 *   medications: [
 *     { name: "Lisinopril", dosage: "10mg", times: ["08:00", "20:00"] }
 *   ],
 *   timezone: "America/New_York"
 * }
 */
interface SubscribeRequest {
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  medications: Array<{
    name: string;
    dosage: string;
    times: string[];
  }>;
  timezone: string;
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  try {
    const body: SubscribeRequest = await request.json();

    // Validate required fields
    if (!body.subscription?.endpoint || !body.subscription?.keys?.p256dh || !body.subscription?.keys?.auth) {
      return NextResponse.json(
        { error: "Invalid push subscription" },
        { status: 400 }
      );
    }

    if (!body.medications?.length) {
      return NextResponse.json(
        { error: "No medications provided" },
        { status: 400 }
      );
    }

    // Generate anonymous device ID from subscription endpoint
    // LEARN: We hash the endpoint to create a stable, anonymous identifier.
    // The endpoint URL is unique per device+browser+site combination.
    // By hashing it, we can match subscriptions without storing anything
    // that could identify the person.
    const encoder = new TextEncoder();
    const data = encoder.encode(body.subscription.endpoint);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const deviceId = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // Save push subscription
    await upsertPushSubscription({
      device_id: deviceId,
      endpoint: body.subscription.endpoint,
      p256dh: body.subscription.keys.p256dh,
      auth: body.subscription.keys.auth,
    });

    // Save reminder schedules
    const timezone = body.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    await replaceReminderSchedules(
      deviceId,
      body.medications.map((med) => ({
        medication_name: med.name,
        dosage: med.dosage,
        reminder_times: med.times,
        timezone,
      }))
    );

    return NextResponse.json({
      success: true,
      deviceId, // Return so frontend can store for unsubscribe
      message: `Reminders set for ${body.medications.length} medication(s)`,
    });
  } catch (error: unknown) {
    console.error("Push subscribe error:", error);
    const message = error instanceof Error ? error.message : "Failed to subscribe";

    // Don't expose Supabase errors to client
    if (message.includes("SUPABASE")) {
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
