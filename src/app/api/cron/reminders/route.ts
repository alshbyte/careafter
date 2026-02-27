/**
 * LEARN-ALONG: Cron Job for Medication Reminders
 * =================================================
 * 
 * This endpoint is called on a schedule (every 5 minutes) by an external
 * cron service. It's the "brain" that decides which patients get reminders
 * right now.
 * 
 * HOW CRON WORKS:
 * "Cron" comes from the Greek word "chronos" (time). A cron job is a
 * program that runs automatically on a schedule — like an alarm clock
 * for your server.
 * 
 * Options to trigger this endpoint (cheapest first):
 * 1. cron-job.org — free, runs every 1 minute, just give it the URL
 * 2. Supabase pg_cron — free, runs SQL that calls pg_net to hit this URL
 * 3. Vercel Cron — needs Pro plan ($20/mo) for intervals < 1 day
 * 4. GitHub Actions — free, schedule a workflow to curl this URL
 * 
 * SECURITY:
 * - Protected by CRON_SECRET — the cron service must send this in the
 *   Authorization header. Without it, anyone could trigger reminders.
 * - This endpoint is idempotent — calling it multiple times in the same
 *   window won't send duplicate notifications (we use time-window matching).
 * 
 * ALGORITHM:
 * 1. Fetch all active reminder schedules from Supabase
 * 2. For each schedule, convert reminder times to the user's timezone
 * 3. Check if any reminder time falls within the current 5-minute window
 * 4. If yes, send a Web Push notification to that device
 * 5. Return summary of what was sent
 */

import { NextRequest, NextResponse } from "next/server";
import { getActiveRemindersWithSubscriptions, deletePushSubscription } from "@/lib/push/supabase";
import { sendMedicationReminder } from "@/lib/push/web-push-sender";

const CRON_SECRET = process.env.CRON_SECRET;
const WINDOW_MINUTES = 5; // Match reminders within ±5 minutes

/**
 * Check if a time string (HH:MM) is within the current window for a timezone.
 * 
 * LEARN: Timezone handling is one of the hardest problems in software.
 * A patient in New York sets a reminder for 08:00. Our server might be
 * running in us-east-1 or anywhere. We need to know: "Is it currently
 * 08:00 in New York?" — that's what this function checks.
 */
function isTimeInCurrentWindow(
  reminderTime: string,
  timezone: string,
  windowMinutes: number = WINDOW_MINUTES
): boolean {
  try {
    // Get current time in the user's timezone
    const now = new Date();
    const userTimeStr = now.toLocaleTimeString("en-US", {
      timeZone: timezone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });

    const [currentHour, currentMinute] = userTimeStr.split(":").map(Number);
    const [reminderHour, reminderMinute] = reminderTime.split(":").map(Number);

    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const reminderTotalMinutes = reminderHour * 60 + reminderMinute;

    const diff = Math.abs(currentTotalMinutes - reminderTotalMinutes);

    // Handle midnight wraparound (e.g., 23:58 vs 00:02)
    const wrappedDiff = Math.min(diff, 1440 - diff);

    return wrappedDiff <= windowMinutes;
  } catch {
    // Invalid timezone — skip this reminder
    return false;
  }
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const reminders = await getActiveRemindersWithSubscriptions();

    let sent = 0;
    let skipped = 0;
    let expired = 0;
    const errors: string[] = [];

    for (const reminder of reminders) {
      // Check each scheduled time against current time in user's timezone
      const isDue = reminder.reminder_times.some((time) =>
        isTimeInCurrentWindow(time, reminder.timezone)
      );

      if (!isDue) {
        skipped++;
        continue;
      }

      // Send push notification
      const result = await sendMedicationReminder(
        {
          endpoint: reminder.endpoint,
          p256dh: reminder.p256dh,
          auth: reminder.auth,
        },
        reminder.medication_name,
        reminder.dosage
      );

      if (result.success) {
        sent++;
      } else if (result.error === "Subscription expired") {
        // Clean up expired subscriptions
        expired++;
        await deletePushSubscription(reminder.device_id);
      } else {
        errors.push(`${reminder.medication_name}: ${result.error}`);
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: reminders.length,
        sent,
        skipped,
        expired,
        errors: errors.length,
      },
      ...(errors.length > 0 ? { errors } : {}),
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("Cron reminders error:", error);
    return NextResponse.json(
      {
        error: "Failed to process reminders",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Also support POST (some cron services only do POST)
export { GET as POST };
