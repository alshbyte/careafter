"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { DischargeData } from "@/types";
import { SUPPORTED_LANGUAGES } from "@/types";
import { useCarePlan, useNotifications, useInstallPrompt } from "@/hooks/use-careplan";
import { downloadCalendarFile } from "@/lib/calendar/ics-generator";
import { createShareLink } from "@/lib/sharing/share-link";
import { saveShareLink } from "@/lib/db/careplan-store";
import { useAnalytics } from "@/components/analytics-provider";
import { LanguageBadge } from "@/components/language-selector";

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
  const [activeTab, setActiveTab] = useState<"summary" | "meds" | "followups" | "warnings">("summary");
  const [explaining, setExplaining] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string>("");
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [medsTaken, setMedsTaken] = useState<Record<string, boolean>>({});
  const [calendarAdded, setCalendarAdded] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  // Q&A state
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const { plan, savePlan } = useCarePlan();
  const { permission, requestPermission, startReminders, pushSubscribed } = useNotifications();
  const { canInstall, isInstalled, install, isIOS } = useInstallPrompt();
  const { trackEvent } = useAnalytics();

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
    trackEvent("medication_explained", { term });
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term, context, language: data?.language }),
      });
      const result = await res.json();
      setExplanation(result.explanation ?? "Unable to explain.");
    } catch {
      setExplanation("Could not load explanation. Please try again.");
    }
  };

  /** Build a text summary of discharge data to use as Q&A context */
  const buildContextString = useCallback((d: DischargeData): string => {
    const parts: string[] = [];
    if (d.diagnosis) parts.push(`Diagnosis: ${d.diagnosis}`);
    if (d.dischargeDate) parts.push(`Discharged: ${d.dischargeDate}`);
    if (d.summary) parts.push(`Summary: ${d.summary}`);
    if (d.medications?.length) {
      parts.push("Medications: " + d.medications.map(m =>
        `${m.name} ${m.dosage} ${m.frequency}${m.specialInstructions ? ` (${m.specialInstructions})` : ""}`
      ).join("; "));
    }
    if (d.followUps?.length) {
      parts.push("Follow-ups: " + d.followUps.map(f =>
        `${f.provider} within ${f.timeframe}${f.reason ? ` for ${f.reason}` : ""}`
      ).join("; "));
    }
    if (d.warningsSigns?.length) {
      parts.push("Warning signs: " + d.warningsSigns.map(w =>
        `${w.description} → ${w.action}`
      ).join("; "));
    }
    if (d.restrictions?.length) {
      parts.push("Restrictions: " + d.restrictions.map(r => r.description).join("; "));
    }
    if (d.additionalNotes) parts.push(`Notes: ${d.additionalNotes}`);
    return parts.join("\n");
  }, []);

  const handleAskQuestion = useCallback(async () => {
    if (!chatInput.trim() || !data || chatLoading) return;
    const question = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", text: question }]);
    setChatLoading(true);
    trackEvent("question_asked");

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          context: buildContextString(data),
          language: data.language,
        }),
      });
      const result = await res.json();
      setChatMessages(prev => [...prev, { role: "ai", text: result.answer ?? result.error ?? "Sorry, I couldn't answer that." }]);
    } catch {
      setChatMessages(prev => [...prev, { role: "ai", text: "Something went wrong. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, data, chatLoading, trackEvent, buildContextString]);

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
        <div className="text-5xl animate-pulse-gentle">💚</div>
        <p className="text-lg font-medium" style={{ color: "var(--color-text-secondary)" }}>
          Loading your care plan...
        </p>
        <div className="w-48 space-y-3">
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-4 w-5/6 rounded" />
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "summary" as const, label: "Summary", icon: "📋", count: 0 },
    { id: "meds" as const, label: "Meds", icon: "💊", count: data.medications?.length ?? 0 },
    { id: "followups" as const, label: "Follow-Ups", icon: "📅", count: data.followUps?.length ?? 0 },
    { id: "warnings" as const, label: "Warnings", icon: "⚠️", count: data.warningsSigns?.length ?? 0 },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      {/* Compact Header */}
      <header
        className="px-4 pb-3 pt-4"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold text-white">
                {data.patientFirstName ? `${data.patientFirstName}'s Care Plan` : "Your Care Plan"}
                {" "}
                <LanguageBadge languageCode={data.language} />
              </h1>
              {data.diagnosis && (
                <p className="truncate text-xs text-white/60">
                  {data.dischargeDate ?? "Recently"} · {data.diagnosis}
                </p>
              )}
            </div>
            <a
              href="tel:911"
              className="ml-3 flex-shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white"
              style={{ backgroundColor: "var(--color-danger)", minHeight: "auto", minWidth: "auto" }}
            >
              🚨 911
            </a>
          </div>
        </div>
      </header>

      {/* Tab Navigation — icon + short label, equal width */}
      <nav
        className="sticky top-0 z-10 border-b px-2 py-1.5"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <div className="mx-auto flex max-w-2xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-center transition-all"
              style={{
                backgroundColor: activeTab === tab.id ? "var(--color-primary)" : "transparent",
                color: activeTab === tab.id ? "white" : "var(--color-text-muted)",
                minHeight: 44,
                minWidth: "auto",
              }}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              <span className="text-[11px] font-semibold leading-tight">
                {tab.label}
                {tab.count > 0 && ` (${tab.count})`}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-4 py-4">

        {/* ── Setup Actions (collapsible) ── */}
        {(() => {
          const hasSetupItems = (
            (!calendarAdded && (data.medications?.length ?? 0) > 0) ||
            (showNotifPrompt && permission === "default") ||
            (canInstall && !isInstalled) ||
            (isIOS && !isInstalled)
          );
          if (!hasSetupItems && !calendarAdded && !pushSubscribed) return null;

          return (
            <div className="mb-6">
              {/* Collapsed: show a compact setup bar */}
              {!showSetup && hasSetupItems && (
                <button
                  onClick={() => setShowSetup(true)}
                  className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left"
                  style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚙️</span>
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                      Set up reminders & install app
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: "var(--color-primary)" }}>Setup ▾</span>
                </button>
              )}

              {/* Expanded setup items */}
              {showSetup && (
                <div className="animate-slide-up space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold" style={{ color: "var(--color-text-muted)" }}>
                      SETUP
                    </h3>
                    <button
                      onClick={() => setShowSetup(false)}
                      className="rounded-lg px-3 py-1 text-xs font-medium"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Hide ▴
                    </button>
                  </div>

                  {/* Calendar */}
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
                  trackEvent("calendar_added", {
                    medicationCount: data.medications?.length ?? 0,
                    followUpCount: data.followUps?.length ?? 0,
                  });
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
            className="flex items-center gap-3 rounded-2xl p-4"
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
            className="rounded-2xl p-5"
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
            className="rounded-2xl p-5"
            style={{ backgroundColor: "var(--color-surface-alt)" }}
          >
            <p className="text-base" style={{ color: "var(--color-text)" }}>
              📱 To install: tap the <strong>Share</strong> button (↑) in Safari, then <strong>Add to Home Screen</strong>.
            </p>
          </div>
        )}
                </div>
              )}

              {/* Compact status badges (shown when setup is collapsed) */}
              {!showSetup && calendarAdded && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                    style={{ backgroundColor: "var(--color-surface)", color: "var(--color-safe)" }}>
                    📅 Calendar added
                  </span>
                  {pushSubscribed && (
                    <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                      style={{ backgroundColor: "var(--color-surface)", color: "var(--color-safe)" }}>
                      🔔 Reminders on
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Tab Content ── */}
        <div className="tab-content">

        {/* Summary Tab */}
        {activeTab === "summary" && (
          <div className="space-y-4">
            {/* Plain-language summary */}
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: "var(--color-surface)" }}
            >
              <h2 className="mb-2 text-base font-bold" style={{ color: "var(--color-text)" }}>
                Your Discharge Summary
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                {data.summary
                  ? data.summary
                  : data.diagnosis
                    ? `You were discharged on ${data.dischargeDate ?? "a recent date"} with a diagnosis of ${data.diagnosis}. Review the tabs above for your medications, follow-up appointments, and warning signs.`
                    : "Your discharge information is shown in the tabs above. Review each tab for your medications, follow-ups, and warning signs."}
              </p>
            </div>

            {/* Restrictions */}
            {(data.restrictions?.length ?? 0) > 0 && (
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: "var(--color-surface)" }}
              >
                <h3 className="mb-2 text-base font-bold" style={{ color: "var(--color-text)" }}>
                  🚫 Restrictions
                </h3>
                {data.restrictions?.map((r, i) => (
                  <div key={r.id ?? i} className="mb-1.5 flex items-start gap-2">
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>•</span>
                    <div>
                      <p className="text-sm" style={{ color: "var(--color-text)" }}>{r.description}</p>
                      {r.duration && (
                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                          {r.duration}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Additional notes */}
            {data.additionalNotes && (
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: "var(--color-surface)" }}
              >
                <h3 className="mb-1 text-base font-bold" style={{ color: "var(--color-text)" }}>
                  📝 Additional Notes
                </h3>
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {data.additionalNotes}
                </p>
              </div>
            )}

            {/* Q&A Chat — embedded in Summary tab */}
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <h3 className="text-base font-bold" style={{ color: "var(--color-text)" }}>
                💬 Ask a Question
              </h3>
              <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                Ask anything about your discharge in plain language.
              </p>

              {/* Suggested questions */}
              {chatMessages.length === 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[
                    "What should I eat?",
                    "Can I drive?",
                    "When do I take my meds?",
                    "What if I miss a dose?",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setChatInput(q); }}
                      className="suggestion-chip rounded-full border px-2.5 py-1 text-xs"
                      style={{
                        borderColor: "var(--color-border)",
                        color: "var(--color-primary)",
                        backgroundColor: "var(--color-bg)",
                        minHeight: "auto",
                        minWidth: "auto",
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Chat messages */}
              {chatMessages.length > 0 && (
                <div className="mt-3 max-h-60 space-y-2 overflow-y-auto rounded-lg p-2"
                  style={{ backgroundColor: "var(--color-bg)" }}
                >
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className="max-w-[85%] rounded-2xl px-3 py-2 text-sm"
                        style={{
                          backgroundColor: msg.role === "user" ? "var(--color-primary)" : "var(--color-surface)",
                          color: msg.role === "user" ? "white" : "var(--color-text)",
                        }}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl px-3 py-2 text-sm animate-pulse-gentle"
                        style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text-muted)" }}
                      >
                        Thinking...
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Input */}
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAskQuestion()}
                  placeholder="Ask about your discharge..."
                  className="min-w-0 flex-1 rounded-lg border px-3 py-2.5 text-sm"
                  style={{
                    backgroundColor: "var(--color-bg)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text)",
                  }}
                  disabled={chatLoading}
                  maxLength={500}
                />
                <button
                  onClick={handleAskQuestion}
                  disabled={chatLoading || !chatInput.trim()}
                  className="flex-shrink-0 rounded-lg px-4 py-2.5 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-primary)", minWidth: "auto" }}
                >
                  {chatLoading ? "..." : "Ask"}
                </button>
              </div>

              <p className="mt-1.5 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                ⚕️ Based on your discharge papers only. Always consult your doctor.
              </p>
            </div>

            {/* Share with Caregiver — compact in summary */}
            <button
              onClick={() => {
                if (!data) return;
                const { url, shareLink } = createShareLink(
                  data,
                  data.patientFirstName
                    ? `${data.patientFirstName}'s care plan`
                    : "Shared care plan"
                );
                if (plan?.id) {
                  saveShareLink({ ...shareLink, carePlanId: plan.id }).catch(() => {});
                }
                setShareUrl(url);
                setShareCopied(false);
                setShowShareDialog(true);
                trackEvent("share_link_created");
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all active:scale-[0.98]"
              style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <span className="text-xl">👥</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  Share with a Caregiver
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  Send a read-only view to a family member
                </p>
              </div>
              <span style={{ color: "var(--color-primary)" }}>→</span>
            </button>
          </div>
        )}

        {/* Medications Tab */}
        {activeTab === "meds" && (
          <div className="space-y-3">
            <h2 className="text-base font-bold" style={{ color: "var(--color-text)" }}>
              Your Medications
            </h2>
            {data.medications?.map((med) => (
              <div
                key={med.id}
                className="rounded-xl p-4"
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
          <div className="space-y-3">
            <h2 className="text-base font-bold" style={{ color: "var(--color-text)" }}>
              Follow-Up Appointments
            </h2>
            {data.followUps?.map((fu) => (
              <div
                key={fu.id}
                className="rounded-xl p-4"
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
          <div className="space-y-3">
            <h2 className="text-base font-bold" style={{ color: "var(--color-text)" }}>
              Warning Signs to Watch For
            </h2>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              If you notice any of these, take the recommended action. If something
              feels wrong, it&apos;s always OK to call your doctor.
            </p>
            {data.warningsSigns?.map((ws) => (
              <div
                key={ws.id}
                className="rounded-xl border-l-4 p-4"
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
        </div>{/* end tab-content */}
      </div>

      {/* Share Dialog (Modal) — shown when user generates a share link
          LEARN: We use a simple div overlay instead of <dialog> for broader
          browser support. The backdrop click closes it, and Escape key
          is handled via onKeyDown. */}
      {showShareDialog && shareUrl && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowShareDialog(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowShareDialog(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Share care plan link"
        >
          <div
            className="w-full max-w-md rounded-t-2xl p-6 sm:rounded-2xl"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
                🔗 Your share link
              </h3>
              <button
                onClick={() => setShowShareDialog(false)}
                className="rounded-lg px-3 py-2 text-xl"
                style={{ color: "var(--color-text-muted)", minHeight: "var(--touch-target)", minWidth: "var(--touch-target)" }}
                aria-label="Close share dialog"
              >
                ✕
              </button>
            </div>

            {/* Selectable link display */}
            <div
              className="w-full select-all overflow-x-auto rounded-lg p-3 text-sm break-all"
              style={{
                backgroundColor: "var(--color-surface-alt)",
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border)",
                userSelect: "all",
              }}
            >
              {shareUrl}
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    setShareCopied(true);
                    setTimeout(() => setShareCopied(false), 3000);
                  } catch {
                    // Fallback: select the text so user can copy manually
                    const el = document.querySelector("[class*='select-all']") as HTMLElement;
                    if (el) {
                      const range = document.createRange();
                      range.selectNodeContents(el);
                      window.getSelection()?.removeAllRanges();
                      window.getSelection()?.addRange(range);
                    }
                  }
                }}
                className="flex-1 rounded-xl px-5 py-3 text-base font-semibold text-white"
                style={{ backgroundColor: shareCopied ? "var(--color-safe)" : "var(--color-primary)", minHeight: "var(--touch-target)" }}
              >
                {shareCopied ? "✅ Copied!" : "📋 Copy Link"}
              </button>

              {/* Web Share API — available on mobile and some desktops
                  LEARN: navigator.share() opens the native share sheet (iMessage,
                  WhatsApp, email, etc.). We check for its existence because it's
                  not available on all browsers (notably Firefox desktop). */}
              {typeof navigator !== "undefined" && !!navigator.share && (
                <button
                  onClick={async () => {
                    try {
                      await navigator.share({
                        title: "Care Plan",
                        text: `Here's ${data?.patientFirstName ? data.patientFirstName + "'s" : "a"} care plan from CareAfter`,
                        url: shareUrl,
                      });
                    } catch {
                      // User cancelled the share sheet — that's fine
                    }
                  }}
                  className="flex-1 rounded-xl px-5 py-3 text-base font-semibold"
                  style={{
                    backgroundColor: "var(--color-surface-alt)",
                    color: "var(--color-primary)",
                    border: "1px solid var(--color-primary)",
                    minHeight: "var(--touch-target)",
                  }}
                >
                  📤 Share via...
                </button>
              )}
            </div>

            {/* Privacy and expiry notes */}
            <div className="mt-4 space-y-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
              <p>⏰ This link expires in 48 hours.</p>
              <p>
                🔒 The link contains your care plan data — share it only with people you trust.
                No data is stored on any server.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer Footer */}
      <footer className="px-4 py-4 text-center text-[10px]" style={{ color: "var(--color-text-muted)" }}>
        <p>
          CareAfter does not provide medical advice, diagnosis, or treatment. This care plan is based on your
          discharge papers. Always follow your doctor&apos;s instructions.
        </p>
      </footer>
    </div>
  );
}
