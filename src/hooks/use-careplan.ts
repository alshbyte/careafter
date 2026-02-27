/**
 * LEARN-ALONG: Custom React Hooks
 * =================================
 * 
 * WHY custom hooks?
 * - Hooks encapsulate reusable logic (data fetching, subscriptions, etc.)
 * - Components stay clean — they just render UI
 * - The pattern: useXxx() returns { data, loading, error, actions }
 * 
 * ARCHITECTURE PATTERN: "Hooks as Service Layer"
 * - Components don't directly call IndexedDB or notification APIs
 * - Hooks abstract the complexity: useCarePlan() handles encryption,
 *   storage, and state management internally
 * - If we later add cloud sync, only the hook changes — not every component
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import type { CarePlan, DischargeData } from "@/types";
import { saveCarePlan, loadLatestCarePlan, markMedicationTaken, deleteAllData } from "@/lib/db/careplan-store";
import {
  getNotificationStatus,
  requestNotificationPermission,
  registerServiceWorker,
  scheduleMedicationReminders,
  setupInstallPrompt,
  triggerInstallPrompt,
  type NotificationPermissionState,
} from "@/lib/notifications/notifications";

/**
 * Hook for managing the care plan lifecycle.
 * 
 * LEARN: This hook handles:
 * 1. Loading the encrypted care plan from IndexedDB on mount
 * 2. Saving new care plans (from the confirmation page)
 * 3. Marking medications as taken
 * 4. Deleting all data
 * 
 * Components using this hook don't know about IndexedDB, encryption,
 * or storage details. They just call savePlan() and takeMedication().
 */
export function useCarePlan() {
  const [plan, setPlan] = useState<CarePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load existing plan on mount
  useEffect(() => {
    loadLatestCarePlan()
      .then(setPlan)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const savePlan = useCallback(async (data: DischargeData) => {
    setLoading(true);
    try {
      const saved = await saveCarePlan(data);
      setPlan(saved);
      return saved;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const takeMedication = useCallback(
    async (medicationId: string, date: string, taken: boolean) => {
      if (!plan) return;
      await markMedicationTaken(plan.id, medicationId, date, taken);
      // Reload to get updated state
      const updated = await loadLatestCarePlan();
      setPlan(updated);
    },
    [plan]
  );

  const clearAllData = useCallback(async () => {
    await deleteAllData();
    setPlan(null);
  }, []);

  return { plan, loading, error, savePlan, takeMedication, clearAllData };
}

/**
 * Hook for managing notification permissions and reminders.
 * 
 * LEARN: Notification permission is a one-way door:
 * - "default" → we can ask (show our custom pre-prompt first)
 * - "granted" → user said yes, we can send notifications
 * - "denied" → user said no, we CANNOT ask again (browser blocks it)
 * 
 * This is why we NEVER ask on page load. We show a friendly explanation
 * first, and only trigger the browser prompt when the user opts in.
 */
export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermissionState>("default");
  const [reminderTimers, setReminderTimers] = useState<number[]>([]);

  useEffect(() => {
    setPermission(getNotificationStatus());
    registerServiceWorker();
  }, []);

  const requestPermission = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    return result;
  }, []);

  const startReminders = useCallback(
    (medications: { id: string; name: string; dosage: string; scheduledTimes: string[] }[]) => {
      // Clear existing timers
      reminderTimers.forEach(clearTimeout);
      const newTimers = scheduleMedicationReminders(medications);
      setReminderTimers(newTimers);
    },
    [reminderTimers]
  );

  const stopReminders = useCallback(() => {
    reminderTimers.forEach(clearTimeout);
    setReminderTimers([]);
  }, [reminderTimers]);

  return { permission, requestPermission, startReminders, stopReminders };
}

/**
 * Hook for PWA install prompt.
 * 
 * LEARN: PWA "Add to Home Screen" works differently than app stores:
 * - Browser detects if your site qualifies (manifest + service worker + HTTPS)
 * - It fires a "beforeinstallprompt" event
 * - We intercept it and show our own install button (better UX)
 * - When user clicks our button, we trigger the browser's install dialog
 * 
 * On iOS Safari, there's no install prompt API — users must manually
 * use "Add to Home Screen" from the share menu. We detect this and
 * show instructions instead.
 */
export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    if (!isStandalone) {
      setupInstallPrompt();
      const handleInstallable = () => setCanInstall(true);
      window.addEventListener("careafter:installable", handleInstallable);
      return () => window.removeEventListener("careafter:installable", handleInstallable);
    }
  }, []);

  const install = useCallback(async () => {
    const accepted = await triggerInstallPrompt();
    if (accepted) {
      setIsInstalled(true);
      setCanInstall(false);
    }
    return accepted;
  }, []);

  // Detect iOS for manual install instructions
  const isIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    !(window as any).MSStream;

  return { canInstall, isInstalled, install, isIOS };
}
