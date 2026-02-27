/**
 * LEARN-ALONG: Supabase Client Setup
 * ====================================
 * 
 * Supabase gives us two "keys" with different permissions:
 * 
 * 1. ANON KEY (public, safe to expose in browser):
 *    - Can only do what RLS policies allow
 *    - We use this on the CLIENT side (if needed)
 * 
 * 2. SERVICE ROLE KEY (secret, server-only):
 *    - Bypasses all RLS — full database access
 *    - We use this in API routes (server-side only)
 *    - NEVER expose this in client-side code
 * 
 * In our architecture, ALL Supabase access goes through Next.js API routes
 * (server-side), so we only use the service role key. The browser never
 * talks to Supabase directly.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseAdmin: SupabaseClient | null = null;

/**
 * Get the Supabase admin client (service role — server-side only).
 * Uses singleton pattern to avoid creating multiple connections.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (supabaseAdmin) return supabaseAdmin;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Set these in .env.local. Get them from: Supabase Dashboard → Settings → API"
    );
  }

  supabaseAdmin = createClient(url, key, {
    auth: { persistSession: false }, // Server-side: no session needed
  });

  return supabaseAdmin;
}

// ----- Types -----

export interface PushSubscriptionRecord {
  device_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface ReminderScheduleRecord {
  device_id: string;
  medication_name: string;
  dosage: string;
  reminder_times: string[];
  timezone: string;
  is_active: boolean;
}

// ----- Database Operations -----

/**
 * Save or update a push subscription for a device.
 * Uses UPSERT (insert or update) on the device_id.
 */
export async function upsertPushSubscription(
  sub: PushSubscriptionRecord
): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("push_subscriptions")
    .upsert(
      { ...sub, updated_at: new Date().toISOString() },
      { onConflict: "device_id" }
    );

  if (error) throw new Error(`Failed to save push subscription: ${error.message}`);
}

/**
 * Save reminder schedules for a device.
 * Replaces all existing schedules (delete + insert).
 * 
 * LEARN: We delete-and-reinsert rather than trying to diff because:
 * 1. Simpler code (less bug-prone)
 * 2. Medication lists change infrequently
 * 3. The dataset is tiny (5-10 rows per patient)
 */
export async function replaceReminderSchedules(
  deviceId: string,
  schedules: Omit<ReminderScheduleRecord, "device_id" | "is_active">[]
): Promise<void> {
  const db = getSupabaseAdmin();

  // Delete existing schedules for this device
  const { error: deleteError } = await db
    .from("reminder_schedules")
    .delete()
    .eq("device_id", deviceId);

  if (deleteError) throw new Error(`Failed to clear old schedules: ${deleteError.message}`);

  // Insert new schedules
  if (schedules.length > 0) {
    const rows = schedules.map((s) => ({
      ...s,
      device_id: deviceId,
      is_active: true,
    }));

    const { error: insertError } = await db
      .from("reminder_schedules")
      .insert(rows);

    if (insertError) throw new Error(`Failed to save schedules: ${insertError.message}`);
  }
}

/**
 * Get all active reminders that are due right now.
 * 
 * LEARN: This is called by the cron job every few minutes.
 * It finds reminders where the current time (in the user's timezone)
 * matches one of the scheduled reminder times within a ±window.
 * 
 * Since we can't do timezone math easily in one query, we fetch
 * all active reminders and filter in code. With thousands of users,
 * you'd want a smarter approach (materialized view, partition by timezone).
 */
export async function getActiveRemindersWithSubscriptions(): Promise<
  Array<{
    medication_name: string;
    dosage: string;
    reminder_times: string[];
    timezone: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    device_id: string;
  }>
> {
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("reminder_schedules")
    .select(`
      medication_name,
      dosage,
      reminder_times,
      timezone,
      device_id,
      push_subscriptions!inner (
        endpoint,
        p256dh,
        auth
      )
    `)
    .eq("is_active", true);

  if (error) throw new Error(`Failed to fetch reminders: ${error.message}`);

  // Flatten the join result
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    medication_name: row.medication_name,
    dosage: row.dosage,
    reminder_times: row.reminder_times,
    timezone: row.timezone,
    device_id: row.device_id,
    endpoint: row.push_subscriptions.endpoint,
    p256dh: row.push_subscriptions.p256dh,
    auth: row.push_subscriptions.auth,
  }));
}

/**
 * Remove a device's push subscription and all its reminders.
 * CASCADE delete handles the reminders automatically.
 */
export async function deletePushSubscription(deviceId: string): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("push_subscriptions")
    .delete()
    .eq("device_id", deviceId);

  if (error) throw new Error(`Failed to delete subscription: ${error.message}`);
}
