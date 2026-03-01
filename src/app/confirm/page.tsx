"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { DischargeData, Medication, FollowUp, WarningSign, Restriction } from "@/types";
import Link from "next/link";
import { useAnalytics } from "@/components/analytics-provider";

const CONFIDENCE_STYLES = {
  high: { bg: "#DCFCE7", border: "#16A34A", label: "✅ High confidence" },
  medium: { bg: "#FEF9C3", border: "#EAB308", label: "⚠️ Please verify" },
  low: { bg: "#FEE2E2", border: "#DC2626", label: "❌ Needs review" },
};

export default function ConfirmPage() {
  const router = useRouter();
  const [data, setData] = useState<DischargeData | null>(null);
  const [processingTime, setProcessingTime] = useState(0);
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    const stored = sessionStorage.getItem("medlens_extraction");
    if (!stored) {
      router.push("/scan");
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      setData(parsed.data);
      setProcessingTime(parsed.processingTimeMs ?? 0);
    } catch {
      router.push("/scan");
    }
  }, [router]);

  const confirmAndCreatePlan = useCallback(() => {
    if (!data) return;
    trackEvent("plan_confirmed", {
      medicationCount: data.medications?.length ?? 0,
      followUpCount: data.followUps?.length ?? 0,
    });
    // Store confirmed data and navigate to care plan
    sessionStorage.setItem("medlens_confirmed", JSON.stringify(data));
    sessionStorage.removeItem("medlens_extraction");
    router.push("/plan");
  }, [data, router, trackEvent]);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p style={{ color: "var(--color-text-secondary)" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-6 py-4 shadow-sm"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm" style={{ color: "var(--color-text-muted)" }} aria-label="Home">
              🔬
            </Link>
            <Link href="/scan" className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
              ← Rescan
            </Link>
          </div>
          <h1 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
            Review & Confirm
          </h1>
          <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {(processingTime / 1000).toFixed(1)}s
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-6 space-y-8">
        {/* Instructions */}
        <div
          className="rounded-2xl border-2 p-5"
          style={{ borderColor: "var(--color-primary)", backgroundColor: "var(--color-surface)" }}
        >
          <p className="text-base font-medium" style={{ color: "var(--color-text)" }}>
            👋 {data.patientFirstName ? `Hi ${data.patientFirstName}!` : "Hi there!"} We read your
            discharge papers. Please review everything below and make sure it looks correct.
          </p>
          <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Items marked with ⚠️ or ❌ may need your attention. You can tap any item to edit it.
          </p>
        </div>

        {/* Diagnosis */}
        {data.diagnosis && (
          <div
            className="rounded-2xl p-5"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <h3 className="mb-2 text-lg font-bold" style={{ color: "var(--color-text)" }}>
              🏥 Diagnosis
            </h3>
            <p className="text-base" style={{ color: "var(--color-text-secondary)" }}>
              {data.diagnosis}
            </p>
            {data.dischargeDate && (
              <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
                Discharged: {data.dischargeDate}
              </p>
            )}
          </div>
        )}

        {/* Missing data warning */}
        {!(data.medications?.length) && !(data.followUps?.length) && !(data.warningsSigns?.length) && !(data.restrictions?.length) && (
          <div
            className="rounded-2xl border-2 p-5"
            style={{ borderColor: "var(--color-caution)", backgroundColor: "var(--color-surface)" }}
          >
            <p className="text-base font-medium" style={{ color: "var(--color-caution)" }}>
              ⚠️ We could only find basic info from this page.
            </p>
            <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Your discharge summary may have multiple pages. Try scanning the pages that list your
              <strong> medications</strong>, <strong>follow-up appointments</strong>, and <strong>warning signs</strong> for a complete care plan.
            </p>
          </div>
        )}

        {/* Medications */}
        {(data.medications?.length ?? 0) > 0 && (
          <Section title="💊 Medications" count={data.medications?.length ?? 0}>
            {data.medications?.map((med, i) => (
              <ConfidenceCard key={med.id ?? i} confidence={med.confidence}>
                <h4 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
                  {med.name}
                </h4>
                {med.genericName && (
                  <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                    ({med.genericName})
                  </p>
                )}
                <p className="mt-1" style={{ color: "var(--color-text-secondary)" }}>
                  <strong>Dosage:</strong> {med.dosage} · <strong>Frequency:</strong> {med.frequency}
                </p>
                {med.timing && <p style={{ color: "var(--color-text-secondary)" }}>⏰ {med.timing}</p>}
                {med.duration && <p style={{ color: "var(--color-text-secondary)" }}>📅 {med.duration}</p>}
                {med.specialInstructions && (
                  <p className="mt-1 font-medium" style={{ color: "var(--color-primary)" }}>
                    📝 {med.specialInstructions}
                  </p>
                )}
                {med.purpose && (
                  <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
                    Purpose: {med.purpose}
                  </p>
                )}
              </ConfidenceCard>
            ))}
          </Section>
        )}

        {/* Follow-ups */}
        {(data.followUps?.length ?? 0) > 0 && (
          <Section title="📅 Follow-Up Appointments" count={data.followUps?.length ?? 0}>
            {data.followUps?.map((fu, i) => (
              <ConfidenceCard key={fu.id ?? i} confidence={fu.confidence}>
                <h4 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
                  {fu.provider}
                </h4>
                {fu.specialty && (
                  <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                    {fu.specialty}
                  </p>
                )}
                <p className="mt-1" style={{ color: "var(--color-text-secondary)" }}>
                  📅 {fu.timeframe}
                </p>
                {fu.phoneNumber && (
                  <a
                    href={`tel:${fu.phoneNumber}`}
                    className="mt-1 inline-block text-base font-medium underline"
                    style={{ color: "var(--color-primary)" }}
                  >
                    📞 {fu.phoneNumber}
                  </a>
                )}
              </ConfidenceCard>
            ))}
          </Section>
        )}

        {/* Warning Signs */}
        {(data.warningsSigns?.length ?? 0) > 0 && (
          <Section title="⚠️ Warning Signs to Watch For" count={data.warningsSigns?.length ?? 0}>
            {data.warningsSigns?.map((ws, i) => (
              <ConfidenceCard key={ws.id ?? i} confidence={ws.confidence}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden="true">
                    {ws.severity === "urgent" ? "🚨" : ws.severity === "important" ? "⚠️" : "ℹ️"}
                  </span>
                  <div>
                    <p className="font-semibold" style={{ color: "var(--color-text)" }}>
                      {ws.description}
                    </p>
                    <p
                      className="mt-1 font-medium"
                      style={{
                        color:
                          ws.severity === "urgent"
                            ? "var(--color-danger)"
                            : ws.severity === "important"
                            ? "var(--color-caution)"
                            : "var(--color-info)",
                      }}
                    >
                      → {ws.action}
                    </p>
                  </div>
                </div>
              </ConfidenceCard>
            ))}
          </Section>
        )}

        {/* Restrictions */}
        {(data.restrictions?.length ?? 0) > 0 && (
          <Section title="🚫 Restrictions" count={data.restrictions?.length ?? 0}>
            {data.restrictions?.map((r, i) => (
              <ConfidenceCard key={r.id ?? i} confidence={r.confidence}>
                <p className="font-semibold" style={{ color: "var(--color-text)" }}>
                  {r.description}
                </p>
                {r.duration && (
                  <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    Duration: {r.duration}
                  </p>
                )}
              </ConfidenceCard>
            ))}
          </Section>
        )}

        {/* Activity Restrictions (alternative format from AI) */}
        {!data.restrictions?.length && (data.activityRestrictions?.length ?? 0) > 0 && (
          <Section title="🚫 Restrictions" count={data.activityRestrictions?.length ?? 0}>
            {data.activityRestrictions?.map((r, i) => (
              <ConfidenceCard key={i} confidence="medium">
                <p className="font-semibold" style={{ color: "var(--color-text)" }}>
                  {r}
                </p>
              </ConfidenceCard>
            ))}
          </Section>
        )}

        {/* Confirm Button */}
        <div className="sticky bottom-0 py-4" style={{ backgroundColor: "var(--color-bg)" }}>
          <button
            onClick={confirmAndCreatePlan}
            className="w-full rounded-2xl px-6 py-5 text-xl font-bold text-white shadow-lg transition-all active:scale-[0.98]"
            style={{ backgroundColor: "var(--color-primary)", minHeight: "var(--touch-target)" }}
          >
            ✅ Looks Good — Create My Care Plan
          </button>
          <p className="mt-3 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            You can always edit your care plan later.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-4 text-xl font-bold" style={{ color: "var(--color-text)" }}>
        {title}{" "}
        <span className="text-base font-normal" style={{ color: "var(--color-text-muted)" }}>
          ({count})
        </span>
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ConfidenceCard({
  confidence,
  children,
}: {
  confidence: number | "high" | "medium" | "low" | undefined;
  children: React.ReactNode;
}) {
  // Convert numeric confidence (0-1) to category
  let level: "high" | "medium" | "low";
  if (typeof confidence === "string" && confidence in CONFIDENCE_STYLES) {
    level = confidence as "high" | "medium" | "low";
  } else if (typeof confidence === "number") {
    level = confidence >= 0.8 ? "high" : confidence >= 0.6 ? "medium" : "low";
  } else {
    level = "medium"; // Default for missing confidence
  }
  const style = CONFIDENCE_STYLES[level];
  return (
    <div
      className="rounded-xl border-l-4 p-4"
      style={{ backgroundColor: style.bg, borderColor: style.border }}
    >
      <div className="mb-2 text-xs font-medium" style={{ color: style.border }}>
        {style.label}
      </div>
      {children}
    </div>
  );
}
