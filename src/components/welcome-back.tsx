"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadLatestCarePlan } from "@/lib/db/careplan-store";
import type { CarePlan } from "@/types";

/**
 * Shows a "Welcome back" banner if the user has a saved care plan in IndexedDB.
 * Renders nothing on first visit (no saved plan).
 */
export default function WelcomeBack() {
  const [savedPlan, setSavedPlan] = useState<CarePlan | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    loadLatestCarePlan()
      .then((plan) => {
        setSavedPlan(plan);
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, []);

  if (!checked || !savedPlan) return null;

  const name = savedPlan.dischargeData.patientFirstName;
  const medCount = savedPlan.dischargeData.medications?.length ?? 0;
  const date = savedPlan.dischargeData.dischargeDate;

  return (
    <div
      className="animate-fade-in px-6 pt-6"
      style={{ animationDuration: "0.3s" }}
    >
      <div
        className="mx-auto max-w-md rounded-2xl p-5 shadow-sm"
        style={{
          backgroundColor: "var(--color-surface)",
          border: "2px solid var(--color-primary)",
        }}
      >
        <div className="flex items-start gap-3">
          <span className="text-3xl">🔬</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
              Welcome back{name ? `, ${name}` : ""}!
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Your care plan is saved on this device.
              {medCount > 0 && ` ${medCount} medication${medCount !== 1 ? "s" : ""} tracked.`}
              {date && ` Discharged ${date}.`}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <Link
            href="/plan"
            className="flex-1 rounded-xl px-4 py-3 text-center text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--color-primary)", minHeight: "var(--touch-target)" }}
          >
            📋 View My Care Plan
          </Link>
          <Link
            href="/scan"
            className="flex-1 rounded-xl px-4 py-3 text-center text-sm font-semibold"
            style={{
              backgroundColor: "var(--color-surface-alt)",
              color: "var(--color-primary)",
              border: "1px solid var(--color-primary)",
              minHeight: "var(--touch-target)",
            }}
          >
            📸 Scan New
          </Link>
        </div>
      </div>
    </div>
  );
}
