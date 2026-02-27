"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { DischargeData } from "@/types";
import { useCarePlan, useNotifications, useInstallPrompt } from "@/hooks/use-careplan";
import { downloadCalendarFile } from "@/lib/calendar/ics-generator";

/**
 * LEARN-ALONG: The Care Plan Page
 * =================================
 * 
 * This page demonstrates several important patterns:
 * 
 * 1. DATA LOADING PRIORITY:
 *    First check IndexedDB (encrypted, persistent) →
 *    Then check sessionStorage (temporary, from confirmation page) →
 *    If neither exists, redirect to scan
 * 
 * 2. PROGRESSIVE ENHANCEMENT:
 *    The page works without notifications or PWA install.
 *    These are offered as optional enhancements with clear value props.
 * 
 * 3. NOTIFICATION DOUBLE OPT-IN:
 *    We show our own UI explaining WHY before triggering the browser prompt.
 *    This increases permission grant rates from ~30% to ~80%.
 */

export default function CarePlanPage() {
  const router = useRouter();
  const [data, setData] = useState<DischargeData | null>(null);
  const [activeTab, setActiveTab] = useState<"meds" | "followups" | "warnings">("meds");
  const [explaining, setExplaining] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string>("");
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [medsTaken, setMedsTaken] = useState<Record<string, boolean>>({});
  const [calendarAdded, setCalendarAdded] = useState(false);
  const { plan, savePlan } = useCarePlan();
  const { permission, requestPermission, startReminders, pushSubscribed } = useNotifications();
  const { canInstall, isInstalled, install, isIOS } = useInstallPrompt();

  // Load data: prefer encrypted IndexedDB, fall back to sessionStorage
  useEffect(() => {
    if (plan) {
      setData(plan.dischargeData);
      setMedsTaken(
        plan.medicationSchedule.reduce((acc, s) => ({ ...acc, ...s.taken }), {})
      );
      return;
    }

    const stored = sessionStorage.getItem("careafter_confirmed");
    if (!stored) {
      router.push("/scan");
      return;
    }
    const parsed = JSON.parse(stored) as DischargeData;
    setData(parsed);

    // Save to encrypted IndexedDB for persistence
    savePlan(parsed).then(() => {
      sessionStorage.removeItem("careafter_confirmed");
    });

    // Show notification prompt after a brief delay (don't overwhelm)
    if (permission === "default") {
      setTimeout(() => setShowNotifPrompt(true), 3000);
    }
  }, [plan, router, savePlan, permission]);

  const handleExplain = async (term: string, context: string) => {
    setExplaining(term);
    setExplanation("Thinking...");
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term, context }),
      });
      const result = await res.json();
      setExplanation(result.explanation ?? "Unable to explain.");
    } catch {
      setExplanation("Could not load explanation. Please try again.");
    }
  };

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p style={{ color: "var(--color-text-secondary)" }}>Loading your care plan...</p>
      </div>
    );
  }

  const tabs = [
    { id: "meds" as const, label: "💊 Medications", count: data.medications?.length ?? 0 },
    { id: "followups" as const, label: "📅 Follow-Ups", count: data.followUps?.length ?? 0 },
    { id: "warnings" as const, label: "⚠️ Warnings", count: data.warningsSigns?.length ?? 0 },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      {/* Header */}
      <header
        className="px-6 py-4 shadow-sm"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        <div className="mx-auto max-w-2xl">
          <p className="text-sm text-white/80">Your Recovery Plan</p>
          <h1 className="text-2xl font-bold text-white">
            {data.patientFirstName ? `${data.patientFirstName}'s Care Plan` : "Your Care Plan"}
          </h1>
          {data.diagnosis && (
            <p className="mt-1 text-sm text-white/70">
              Discharged: {data.dischargeDate ?? "Recently"} · {data.diagnosis}
            </p>
          )}
        </div>
      </header>

      {/* Emergency Banner */}
      <div
        className="px-6 py-3 text-center text-sm font-medium text-white"
        style={{ backgroundColor: "var(--color-danger)" }}
      >
        ⚠️ Medical emergency?{" "}
        <a href="tel:911" className="font-bold underline">
          Call 911
        </a>
      </div>

      {/* Tab Navigation */}
      <nav className="sticky top-0 z-10 px-4 py-2 shadow-sm" style={{ backgroundColor: "var(--color-surface)" }}>
        <div className="mx-auto flex max-w-2xl gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 rounded-xl px-3 py-3 text-sm font-semibold transition-all"
              style={{
                backgroundColor: activeTab === tab.id ? "var(--color-primary)" : "transparent",
                color: activeTab === tab.id ? "white" : "var(--color-text-secondary)",
                minHeight: "var(--touch-target)",
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1 text-xs opacity-75">({tab.count})</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-6 py-6">
        {/* 📅 Add to Calendar — the simplest, most reliable reminder method */}
        {!calendarAdded && (data.medications?.length ?? 0) > 0 && (
          <div
            className="mb-6 rounded-2xl border-2 p-5"
            style={{ borderColor: "var(--color-primary)", backgroundColor: "var(--color-surface)" }}
          >
            <h3 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
              📅 Add reminders to your calendar?
            </h3>
            <p className="mt-2 text-base" style={{ color: "var(--color-text-secondary)" }}>
              Your phone&apos;s calendar will remind you to take each medication at the right time —
              even when your phone is locked. Works with Apple Calendar, Google Calendar, and Outlook.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  downloadCalendarFile({
                    medications: data.medications,
                    followUps: data.followUps,
                    patientName: data.patientFirstName,
                    dischargeDate: data.dischargeDate,
                  });
                  setCalendarAdded(true);
                }}
                className="rounded-xl px-5 py-3 text-base font-semibold text-white"
                style={{ backgroundColor: "var(--color-primary)", minHeight: "var(--touch-target)" }}
              >
                📅 Add to Calendar
              </button>
              <button
                onClick={() => setCalendarAdded(true)}
                className="rounded-xl px-5 py-3 text-base"
                style={{ color: "var(--color-text-muted)", minHeight: "var(--touch-target)" }}
              >
                Not now
              </button>
            </div>
            <p className="mt-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
              📝 Includes {data.medications?.length} medication reminder{(data.medications?.length ?? 0) !== 1 ? "s" : ""}
              {(data.followUps?.length ?? 0) > 0 && ` and ${data.followUps?.length} follow-up appointment${(data.followUps?.length ?? 0) !== 1 ? "s" : ""}`}
            </p>
          </div>
        )}

        {/* Calendar Added Success Badge */}
        {calendarAdded && (
          <div
            className="mb-6 flex items-center gap-3 rounded-2xl p-4"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <span className="text-2xl">📅</span>
            <div>
              <p className="font-semibold" style={{ color: "var(--color-text)" }}>
                Reminders added to your calendar
              </p>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Open your calendar app to confirm the events were added
              </p>
            </div>
            <button
              onClick={() => {
                downloadCalendarFile({
                  medications: data.medications,
                  followUps: data.followUps,
                  patientName: data.patientFirstName,
                  dischargeDate: data.dischargeDate,
                });
              }}
              className="ml-auto rounded-lg px-3 py-2 text-sm font-medium"
              style={{ color: "var(--color-primary)" }}
            >
              Download again
            </button>
          </div>
        )}

        {/* Notification Opt-In Banner (double opt-in pattern) */}
        {showNotifPrompt && permission === "default" && (
          <div
            className="mb-6 rounded-2xl border-2 p-5"
            style={{ borderColor: "var(--color-primary)", backgroundColor: "var(--color-surface)" }}
          >
            <h3 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
              💊 Want medication reminders?
            </h3>
            <p className="mt-2 text-base" style={{ color: "var(--color-text-secondary)" }}>
              We&apos;ll send you a gentle reminder each time it&apos;s time to take your medication —
              even when your phone is locked. You can turn this off anytime.
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={async () => {
                  const result = await requestPermission();
                  if (result === "granted" && data) {
                    await startReminders(
                      (data.medications ?? []).map((m) => ({
                        id: m.id,
                        name: m.name,
                        dosage: m.dosage,
                        scheduledTimes: plan?.medicationSchedule?.find(
                          (s) => s.medicationId === m.id
                        )?.scheduledTimes ?? ["08:00"],
                      }))
                    );
                  }
                  setShowNotifPrompt(false);
                }}
                className="rounded-xl px-5 py-3 text-base font-semibold text-white"
                style={{ backgroundColor: "var(--color-primary)", minHeight: "var(--touch-target)" }}
              >
                ✅ Yes, remind me
              </button>
              <button
                onClick={() => setShowNotifPrompt(false)}
                className="rounded-xl px-5 py-3 text-base"
                style={{ color: "var(--color-text-muted)", minHeight: "var(--touch-target)" }}
              >
                Not now
              </button>
            </div>
          </div>
        )}

        {/* Push Reminders Active Badge */}
        {pushSubscribed && permission === "granted" && (
          <div
            className="mb-6 flex items-center gap-3 rounded-2xl p-4"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-semibold" style={{ color: "var(--color-text)" }}>
                Medication reminders active
              </p>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                You&apos;ll get notifications even when your phone is locked
              </p>
            </div>
          </div>
        )}

        {/* PWA Install Banner */}
        {canInstall && !isInstalled && (
          <div
            className="mb-6 rounded-2xl p-5"
            style={{ backgroundColor: "var(--color-surface-alt)" }}
          >
            <p className="text-base font-medium" style={{ color: "var(--color-text)" }}>
              📱 Add CareAfter to your home screen for quick access — works offline too!
            </p>
            <button
              onClick={install}
              className="mt-3 rounded-xl px-5 py-3 text-base font-semibold text-white"
              style={{ backgroundColor: "var(--color-primary)", minHeight: "var(--touch-target)" }}
            >
              Install CareAfter
            </button>
          </div>
        )}

        {/* iOS Install Instructions */}
        {isIOS && !isInstalled && (
          <div
            className="mb-6 rounded-2xl p-5"
            style={{ backgroundColor: "var(--color-surface-alt)" }}
          >
            <p className="text-base" style={{ color: "var(--color-text)" }}>
              📱 To install: tap the <strong>Share</strong> button (↑) in Safari, then <strong>Add to Home Screen</strong>.
            </p>
          </div>
        )}

        {/* Medications Tab */}
        {activeTab === "meds" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
              Your Medications
            </h2>
            {data.medications?.map((med) => (
              <div
                key={med.id}
                className="rounded-2xl p-5 shadow-sm"
                style={{ backgroundColor: "var(--color-surface)" }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <button
                      onClick={() => handleExplain(med.name, med.purpose ?? med.name)}
                      className="text-lg font-bold underline decoration-dotted underline-offset-4"
                      style={{ color: "var(--color-primary)" }}
                      title="Tap to learn what this medication does"
                    >
                      {med.name}
                    </button>
                    {med.genericName && (
                      <span className="ml-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
                        ({med.genericName})
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span style={{ color: "var(--color-text-muted)" }}>Dosage: </span>
                    <strong>{med.dosage}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--color-text-muted)" }}>Frequency: </span>
                    <strong>{med.frequency}</strong>
                  </div>
                  {med.timing && (
                    <div>
                      <span style={{ color: "var(--color-text-muted)" }}>When: </span>
                      <strong>{med.timing}</strong>
                    </div>
                  )}
                  {med.duration && (
                    <div>
                      <span style={{ color: "var(--color-text-muted)" }}>Duration: </span>
                      <strong>{med.duration}</strong>
                    </div>
                  )}
                </div>
                {med.specialInstructions && (
                  <div
                    className="mt-3 rounded-lg p-3 text-sm font-medium"
                    style={{ backgroundColor: "var(--color-surface-alt)", color: "var(--color-primary)" }}
                  >
                    📝 {med.specialInstructions}
                  </div>
                )}

                {/* Inline explanation */}
                {explaining === med.name && (
                  <div
                    className="mt-3 rounded-lg border p-3 text-sm"
                    style={{ borderColor: "var(--color-primary)", backgroundColor: "var(--color-surface-alt)" }}
                  >
                    <p style={{ color: "var(--color-text)" }}>{explanation}</p>
                    <p className="mt-2 text-xs italic" style={{ color: "var(--color-text-muted)" }}>
                      Based on your discharge papers. Always consult your healthcare provider.
                    </p>
                    <button
                      onClick={() => setExplaining(null)}
                      className="mt-2 text-xs underline"
                      style={{ color: "var(--color-primary)" }}
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Follow-ups Tab */}
        {activeTab === "followups" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
              Follow-Up Appointments
            </h2>
            {data.followUps?.map((fu) => (
              <div
                key={fu.id}
                className="rounded-2xl p-5 shadow-sm"
                style={{ backgroundColor: "var(--color-surface)" }}
              >
                <h3 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
                  {fu.provider}
                </h3>
                {fu.specialty && (
                  <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                    {fu.specialty}
                  </p>
                )}
                <p className="mt-2 text-base" style={{ color: "var(--color-text-secondary)" }}>
                  📅 Schedule within: <strong>{fu.timeframe}</strong>
                </p>
                {fu.reason && (
                  <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    Reason: {fu.reason}
                  </p>
                )}
                {fu.phoneNumber && (
                  <a
                    href={`tel:${fu.phoneNumber}`}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-3 text-base font-semibold text-white"
                    style={{ backgroundColor: "var(--color-primary)", minHeight: "var(--touch-target)" }}
                  >
                    📞 Call {fu.phoneNumber}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Warning Signs Tab */}
        {activeTab === "warnings" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
              Warning Signs to Watch For
            </h2>
            <p className="text-base" style={{ color: "var(--color-text-secondary)" }}>
              If you notice any of these, take the recommended action. Trust your instincts — if something
              feels wrong, it&apos;s always OK to call your doctor.
            </p>
            {data.warningsSigns?.map((ws) => (
              <div
                key={ws.id}
                className="rounded-2xl border-l-4 p-5 shadow-sm"
                style={{
                  backgroundColor: "var(--color-surface)",
                  borderColor:
                    ws.severity === "urgent"
                      ? "var(--color-danger)"
                      : ws.severity === "important"
                      ? "#EAB308"
                      : "var(--color-info)",
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden="true">
                    {ws.severity === "urgent" ? "🚨" : ws.severity === "important" ? "⚠️" : "ℹ️"}
                  </span>
                  <div>
                    <p className="text-base font-semibold" style={{ color: "var(--color-text)" }}>
                      {ws.description}
                    </p>
                    <p
                      className="mt-2 text-base font-bold"
                      style={{
                        color:
                          ws.severity === "urgent" ? "var(--color-danger)" : "var(--color-text-secondary)",
                      }}
                    >
                      → {ws.action}
                    </p>
                    {ws.severity === "urgent" && (
                      <a
                        href="tel:911"
                        className="mt-3 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-base font-bold text-white"
                        style={{ backgroundColor: "var(--color-danger)", minHeight: "var(--touch-target)" }}
                      >
                        📞 Call 911 Now
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disclaimer Footer */}
      <footer className="px-6 py-6 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
        <p>
          CareAfter does not provide medical advice, diagnosis, or treatment. This care plan is based on your
          discharge papers. Always follow your doctor&apos;s instructions.
        </p>
      </footer>
    </div>
  );
}
