/**
 * LEARN-ALONG: Web Push Notifications
 * =====================================
 * 
 * HOW BROWSER NOTIFICATIONS WORK (3 layers):
 * 
 * Layer 1: Notification API (simple)
 * - Shows a system notification (like a text message popup)
 * - Works on desktop and mobile browsers
 * - Requires user permission ("Allow notifications?")
 * - BUT: only works while the browser tab is open
 * 
 * Layer 2: Service Worker + Push API (persistent)
 * - Service Worker runs in the background even when tab is closed
 * - Can show notifications even when the app isn't open
 * - Uses the Push API to receive messages from a server
 * - This is what makes PWA notifications feel like native app notifications
 * 
 * Layer 3: Scheduled notifications (what we need for meds)
 * - Web browsers DON'T have a native "schedule notification for 8am" API
 * - Workarounds:
 *   a) Server sends push at the right time (requires our server to track schedules)
 *   b) Use setTimeout/setInterval while app is open (unreliable)
 *   c) Use the experimental Notification Triggers API (not widely supported)
 * - For MVP: we use (a) for users who opt in, and (b) as a fallback
 * 
 * WHY THIS IS HARD:
 * - iOS Safari added PWA push notifications only in iOS 16.4 (2023)
 * - Each browser has different permission UX
 * - Users must EXPLICITLY grant permission — we can't auto-enable
 * - Best practice: explain WHY before asking (increases opt-in by 3x)
 */

export type NotificationPermissionState = "granted" | "denied" | "default" | "unsupported";

/**
 * Check if notifications are supported and what the current permission is.
 */
export function getNotificationStatus(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as NotificationPermissionState;
}

/**
 * Request notification permission.
 * 
 * LEARN: Best practice is to NEVER call this on page load.
 * Instead, show a custom UI explaining WHY (medication reminders),
 * and only trigger the browser permission prompt when the user
 * clicks "Yes, enable reminders". This is called the "double opt-in"
 * pattern and dramatically increases permission grant rates.
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  const result = await Notification.requestPermission();
  return result as NotificationPermissionState;
}

/**
 * Register the service worker for background notifications.
 * 
 * LEARN: The service worker (public/sw.js) runs separately from your app.
 * Think of it as a background assistant that:
 * - Caches files for offline access
 * - Receives push messages from servers
 * - Shows notifications even when the app is closed
 * - Handles notification clicks (e.g., open the meds page)
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    console.log("Service Worker registered");
    return registration;
  } catch (error) {
    console.error("Service Worker registration failed:", error);
    return null;
  }
}

/**
 * Show an immediate local notification (for when the app is open).
 * 
 * LEARN: This is the simplest notification type. No server needed.
 * We use this for in-app medication reminders when the user has the
 * browser open. The service worker handles notifications when the
 * app is closed.
 */
export async function showLocalNotification(
  title: string,
  body: string,
  tag?: string
): Promise<void> {
  const permission = getNotificationStatus();
  if (permission !== "granted") return;

  const registration = await navigator.serviceWorker?.ready;
  if (registration) {
    // Use service worker notification (works even when tab is background)
    await registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: tag ?? "medlens-reminder",
      requireInteraction: true, // Don't auto-dismiss — meds are important!
    } as NotificationOptions);
  } else {
    // Fallback: basic notification
    new Notification(title, { body, icon: "/icons/icon-192.png", tag });
  }
}

/**
 * Schedule medication reminders using setTimeout.
 * 
 * LEARN: This is the MVP approach. It only works while the browser tab
 * is open. For a production app, you'd use:
 * 1. A server that sends Web Push notifications at scheduled times
 * 2. Or Twilio SMS for users who don't have the app open
 * 
 * The timer IDs are returned so they can be cancelled if the schedule changes.
 */
export function scheduleMedicationReminders(
  medications: { id: string; name: string; dosage: string; scheduledTimes: string[] }[]
): number[] {
  const timerIds: number[] = [];
  const now = new Date();

  for (const med of medications) {
    for (const time of med.scheduledTimes) {
      const [hours, minutes] = time.split(":").map(Number);

      // Calculate next occurrence of this time
      const next = new Date(now);
      next.setHours(hours, minutes, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1); // Schedule for tomorrow if time has passed
      }

      const delay = next.getTime() - now.getTime();

      const timerId = window.setTimeout(() => {
        showLocalNotification(
          `💊 Time for ${med.name}`,
          `Take ${med.dosage} of ${med.name}`,
          `med-${med.id}-${time}`
        );
      }, delay);

      timerIds.push(timerId);
    }
  }

  return timerIds;
}

/**
 * Check if the app can be installed as a PWA.
 * 
 * LEARN: The "beforeinstallprompt" event fires when the browser
 * detects your site meets PWA criteria (manifest, service worker,
 * HTTPS). We capture this event and show our own install button
 * instead of the browser's default prompt — better UX control.
 */
let deferredInstallPrompt: Event | null = null;

export function setupInstallPrompt(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // Don't show the default browser prompt
    deferredInstallPrompt = e;
    // Dispatch custom event so React components can show an install button
    window.dispatchEvent(new CustomEvent("medlens:installable"));
  });
}

export async function triggerInstallPrompt(): Promise<boolean> {
  if (!deferredInstallPrompt) return false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const promptEvent = deferredInstallPrompt as any;
  promptEvent.prompt();
  const result = await promptEvent.userChoice;
  deferredInstallPrompt = null;
  return result.outcome === "accepted";
}
