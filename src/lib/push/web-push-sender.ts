/**
 * LEARN-ALONG: Web Push Protocol
 * ================================
 * 
 * Sending a push notification involves 3 parties:
 * 
 * 1. YOUR SERVER (this code) — creates and signs the message
 * 2. PUSH SERVICE (Google FCM, Apple APNs, Mozilla) — delivers it
 * 3. USER'S BROWSER — receives and displays it
 * 
 * The flow:
 * ┌──────────┐     ┌──────────────┐     ┌──────────────┐
 * │ Server   │────→│ Push Service  │────→│ Browser      │
 * │          │     │ (Google FCM)  │     │ Service      │
 * │ Signs w/ │     │ Verifies     │     │ Worker shows │
 * │ VAPID    │     │ signature    │     │ notification │
 * └──────────┘     └──────────────┘     └──────────────┘
 * 
 * VAPID (Voluntary Application Server Identification):
 * - A key pair that proves your server is who it says it is
 * - Public key: shared with the browser during subscription
 * - Private key: kept secret on your server, used to sign requests
 * - Without VAPID, anyone could spam push notifications
 * 
 * The payload is encrypted using the browser's p256dh + auth keys,
 * so even the Push Service (Google) cannot read the notification content.
 */

import webpush from "web-push";

// Configure VAPID (done once at module load)
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:hello@careafter.app";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

/**
 * Send a push notification to a specific device.
 * 
 * LEARN: This function:
 * 1. Creates a JSON payload (what the notification shows)
 * 2. Encrypts it with the browser's public key (p256dh)
 * 3. Signs the request with our VAPID private key
 * 4. POSTs to the push service endpoint (e.g., fcm.googleapis.com)
 * 5. The push service delivers it to the browser's service worker
 * 
 * Returns true if sent successfully, false if the subscription is expired.
 */
export async function sendPushNotification(
  target: PushTarget,
  payload: PushPayload
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return { success: false, error: "VAPID keys not configured" };
  }

  const subscription = {
    endpoint: target.endpoint,
    keys: {
      p256dh: target.p256dh,
      auth: target.auth,
    },
  };

  try {
    const result = await webpush.sendNotification(
      subscription,
      JSON.stringify(payload),
      {
        TTL: 3600, // Notification expires after 1 hour if device is offline
        urgency: "high", // High priority — medication reminders are important
      }
    );

    return { success: true, statusCode: result.statusCode };
  } catch (err: unknown) {
    const pushError = err as { statusCode?: number; body?: string };

    // 410 Gone = subscription expired (user uninstalled or revoked permission)
    // 404 Not Found = subscription no longer valid
    if (pushError.statusCode === 410 || pushError.statusCode === 404) {
      return {
        success: false,
        statusCode: pushError.statusCode,
        error: "Subscription expired",
      };
    }

    return {
      success: false,
      statusCode: pushError.statusCode,
      error: pushError.body ?? "Unknown push error",
    };
  }
}

/**
 * Send medication reminder push notification.
 * Formats a friendly reminder message.
 */
export async function sendMedicationReminder(
  target: PushTarget,
  medicationName: string,
  dosage: string
): Promise<{ success: boolean; error?: string }> {
  return sendPushNotification(target, {
    title: `💊 Time for ${medicationName}`,
    body: `Take ${dosage} of ${medicationName}`,
    tag: `med-${medicationName.toLowerCase().replace(/\s+/g, "-")}`,
    url: "/plan",
  });
}
