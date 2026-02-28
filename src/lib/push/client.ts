/**
 * LEARN-ALONG: Client-Side Push Subscription
 * =============================================
 * 
 * This module runs in the BROWSER. It handles:
 * 1. Subscribing to push notifications via the Push API
 * 2. Sending the subscription to our server
 * 3. Setting up reminder schedules for medications
 * 
 * KEY CONCEPT: PushSubscription
 * When the browser subscribes to push notifications, it:
 * 1. Contacts a push service (e.g., fcm.googleapis.com for Chrome)
 * 2. Gets back a unique subscription object containing:
 *    - endpoint: URL to send push messages to
 *    - keys.p256dh: public key for encrypting payloads
 *    - keys.auth: shared secret for authentication
 * 3. This subscription is unique to THIS browser + THIS website + THIS device
 * 
 * The VAPID public key tells the push service "this subscription belongs
 * to the MedLens application server." When our server sends a push,
 * it signs the request with the VAPID private key to prove its identity.
 */

/**
 * Convert a base64url string to a Uint8Array.
 * LEARN: VAPID keys are in base64url format, but the Push API
 * needs them as Uint8Array. This does the conversion.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface MedicationReminder {
  name: string;
  dosage: string;
  times: string[]; // ["08:00", "20:00"]
}

/**
 * Subscribe to push notifications and register medication reminders.
 * 
 * Returns the device ID (needed for unsubscribe) or null if failed.
 */
export async function subscribeToPushReminders(
  medications: MedicationReminder[]
): Promise<{ deviceId: string } | null> {
  try {
    // Step 1: Get the service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Step 2: Get VAPID public key from env
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.error("VAPID public key not configured");
      return null;
    }

    // Step 3: Subscribe to push via the browser's Push API
    // LEARN: This is where the browser contacts the push service
    // (Google FCM for Chrome, Mozilla for Firefox, Apple for Safari)
    // and gets back a unique subscription for this device.
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true, // Required: promises we'll show a notification
      applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
    });

    // Step 4: Extract the subscription data
    const subscriptionJson = subscription.toJSON();

    // Step 5: Send to our server
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: {
          endpoint: subscriptionJson.endpoint,
          keys: {
            p256dh: subscriptionJson.keys?.p256dh,
            auth: subscriptionJson.keys?.auth,
          },
        },
        medications: medications.map((med) => ({
          name: med.name,
          dosage: med.dosage,
          times: med.times,
        })),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Subscribe failed:", error);
      return null;
    }

    const result = await response.json();
    return { deviceId: result.deviceId };
  } catch (error) {
    console.error("Push subscription failed:", error);
    return null;
  }
}

/**
 * Unsubscribe from push reminders.
 */
export async function unsubscribeFromPushReminders(deviceId: string): Promise<boolean> {
  try {
    // Unsubscribe from browser Push API
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }

    // Remove from our server
    const response = await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId }),
    });

    return response.ok;
  } catch (error) {
    console.error("Unsubscribe failed:", error);
    return false;
  }
}

/**
 * Check if push notifications are currently subscribed.
 */
export async function isPushSubscribed(): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator)) return false;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}
