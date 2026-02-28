"use client";

/**
 * LEARN-ALONG: Shared Care Plan Page (Read-Only)
 * ================================================
 *
 * This page is designed to be opened by a caregiver (family member, friend)
 * who received a share link. It does NOT require the MedLens app — it works
 * in any browser.
 *
 * KEY DESIGN DECISIONS:
 * 1. "use client" — we need access to window.location.hash (browser API)
 * 2. No app chrome — caregivers see a clean, focused view
 * 3. All data comes from the URL hash — zero server dependency
 * 4. Read-only — caregivers can view but not modify the care plan
 * 5. Accessible — 18px font, high contrast, 48px touch targets
 *
 * WHY useEffect for hash reading?
 * Next.js server-renders pages, but window.location.hash is only available
 * in the browser. We must read it client-side after mount.
 */

import { useEffect, useState } from "react";
import type { DischargeData } from "@/types";
import { SUPPORTED_LANGUAGES } from "@/types";
import { decodeShareLink } from "@/lib/sharing/share-link";

/** The share page has three possible states */
type SharePageState =
  | { status: "loading" }
  | { status: "expired" }
  | { status: "invalid" }
  | { status: "ready"; data: DischargeData; expiresAt: string };

export default function SharedCarePlanPage() {
  const [state, setState] = useState<SharePageState>({ status: "loading" });

  // Read and decode the URL hash after the component mounts in the browser
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash === "#") {
      setState({ status: "invalid" });
      return;
    }

    const result = decodeShareLink(hash);
    if (!result) {
      // decodeShareLink returns null for both expired and corrupted links.
      // We check if it looks like valid base64url to distinguish the two.
      const encoded = hash.startsWith("#") ? hash.slice(1) : hash;
      if (encoded.length > 10) {
        // Looks like there was data but it's expired or corrupted
        setState({ status: "expired" });
      } else {
        setState({ status: "invalid" });
      }
      return;
    }

    setState({ status: "ready", data: result.data, expiresAt: result.expiresAt });
  }, []);

  // --- LOADING STATE ---
  if (state.status === "loading") {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-lg)" }}>
          Loading care plan...
        </p>
      </div>
    );
  }

  // --- EXPIRED STATE ---
  if (state.status === "expired") {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        <span className="text-5xl" aria-hidden="true">⏰</span>
        <h1 className="mt-4 text-2xl font-bold" style={{ color: "var(--color-text)" }}>
          This link has expired
        </h1>
        <p className="mt-2 text-base" style={{ color: "var(--color-text-secondary)", maxWidth: "28rem" }}>
          Share links expire after 48 hours for privacy protection.
          Ask your care partner to send you a new link from their MedLens app.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-semibold text-white"
          style={{ backgroundColor: "var(--color-primary)", minHeight: "var(--touch-target)" }}
        >
          Learn about MedLens
        </a>
      </div>
    );
  }

  // --- INVALID STATE ---
  if (state.status === "invalid") {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        <span className="text-5xl" aria-hidden="true">🔗</span>
        <h1 className="mt-4 text-2xl font-bold" style={{ color: "var(--color-text)" }}>
          Invalid share link
        </h1>
        <p className="mt-2 text-base" style={{ color: "var(--color-text-secondary)", maxWidth: "28rem" }}>
          This link doesn&apos;t contain a valid care plan. Make sure you copied the full link,
          including the # and everything after it.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-semibold text-white"
          style={{ backgroundColor: "var(--color-primary)", minHeight: "var(--touch-target)" }}
        >
          Learn about MedLens
        </a>
      </div>
    );
  }

  // --- READY STATE: Render the shared care plan ---
  const { data, expiresAt } = state;
  const expiryDate = new Date(expiresAt);
  const expiryFormatted = expiryDate.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      {/* Shared Plan Badge — tells the caregiver this is a shared view */}
      <div
        className="px-6 py-3 text-center text-sm font-medium"
        style={{ backgroundColor: "var(--color-primary-dark)", color: "white" }}
      >
        📋 Shared care plan · Expires {expiryFormatted}
      </div>

      {/* Header */}
      <header
        className="px-6 py-5"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        <div className="mx-auto max-w-2xl">
          <p className="text-sm text-white/80">Care Plan for</p>
          <h1 className="text-2xl font-bold text-white">
            {data.patientFirstName ?? "Patient"}
            {data.language && data.language !== "en" && (() => {
              const lang = SUPPORTED_LANGUAGES.find(l => l.code === data.language);
              return lang ? (
                <span
                  className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
                  style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                >
                  {lang.flag} {lang.nativeName}
                </span>
              ) : null;
            })()}
          </h1>
          {data.diagnosis && (
            <p className="mt-1 text-sm text-white/70">
              {data.diagnosis}
              {data.dischargeDate && ` · Discharged: ${data.dischargeDate}`}
            </p>
          )}
        </div>
      </header>

      {/* 911 Emergency Banner */}
      <div
        className="px-6 py-3 text-center text-sm font-medium text-white"
        style={{ backgroundColor: "var(--color-danger)" }}
      >
        ⚠️ Medical emergency?{" "}
        <a href="tel:911" className="font-bold underline">
          Call 911
        </a>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-6 py-6">
        {/* Medications Section */}
        {(data.medications?.length ?? 0) > 0 && (
          <section className="mb-8" aria-labelledby="meds-heading">
            <h2
              id="meds-heading"
              className="mb-4 text-xl font-bold"
              style={{ color: "var(--color-text)" }}
            >
              💊 Medications ({data.medications.length})
            </h2>
            <div className="space-y-4">
              {data.medications.map((med) => (
                <div
                  key={med.id}
                  className="rounded-2xl p-5 shadow-sm"
                  style={{ backgroundColor: "var(--color-surface)" }}
                >
                  <h3 className="text-lg font-bold" style={{ color: "var(--color-primary)" }}>
                    {med.name}
                    {med.genericName && (
                      <span className="ml-2 text-sm font-normal" style={{ color: "var(--color-text-muted)" }}>
                        ({med.genericName})
                      </span>
                    )}
                  </h3>
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
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Follow-Ups Section */}
        {(data.followUps?.length ?? 0) > 0 && (
          <section className="mb-8" aria-labelledby="followups-heading">
            <h2
              id="followups-heading"
              className="mb-4 text-xl font-bold"
              style={{ color: "var(--color-text)" }}
            >
              📅 Follow-Up Appointments ({data.followUps.length})
            </h2>
            <div className="space-y-4">
              {data.followUps.map((fu) => (
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
          </section>
        )}

        {/* Warning Signs Section */}
        {(data.warningsSigns?.length ?? 0) > 0 && (
          <section className="mb-8" aria-labelledby="warnings-heading">
            <h2
              id="warnings-heading"
              className="mb-4 text-xl font-bold"
              style={{ color: "var(--color-text)" }}
            >
              ⚠️ Warning Signs to Watch For ({data.warningsSigns.length})
            </h2>
            <p className="mb-4 text-base" style={{ color: "var(--color-text-secondary)" }}>
              If you notice any of these, take the recommended action. Trust your instincts — if something
              feels wrong, it&apos;s always OK to call the doctor.
            </p>
            <div className="space-y-4">
              {data.warningsSigns.map((ws) => (
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
          </section>
        )}

        {/* Download MedLens CTA */}
        <div
          className="mb-8 rounded-2xl p-5 text-center"
          style={{ backgroundColor: "var(--color-surface-alt)" }}
        >
          <p className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
            📱 Want your own recovery assistant?
          </p>
          <p className="mt-1 text-base" style={{ color: "var(--color-text-secondary)" }}>
            MedLens turns discharge papers into personalized care plans — free and private.
          </p>
          <a
            href="/"
            className="mt-4 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-semibold text-white"
            style={{ backgroundColor: "var(--color-primary)", minHeight: "var(--touch-target)" }}
          >
            Download MedLens
          </a>
        </div>
      </div>

      {/* Medical Disclaimer Footer */}
      <footer
        className="px-6 py-6 text-center text-xs"
        style={{ color: "var(--color-text-muted)", borderTop: "1px solid var(--color-border)" }}
      >
        <p>
          MedLens does not provide medical advice, diagnosis, or treatment. This care plan was
          generated from the patient&apos;s discharge papers using AI and may contain errors.
          Always follow the healthcare provider&apos;s instructions.
        </p>
        <p className="mt-2">
          🔒 This shared view was created by the patient. No data is stored on our servers.
        </p>
      </footer>
    </div>
  );
}
