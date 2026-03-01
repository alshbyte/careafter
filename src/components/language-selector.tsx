"use client";

/**
 * LEARN-ALONG: Language Selector Component
 * ==========================================
 * 
 * This component lets patients choose a language BEFORE their discharge
 * papers are processed. The AI then extracts AND translates in one call.
 * 
 * WHY AT SCAN TIME (not after):
 * If we translate after extraction, we'd need a second API call ($0.05 more).
 * By telling the AI "extract in Spanish" from the start, we get translation
 * for FREE — same single API call, same price.
 * 
 * DESIGN DECISIONS:
 * 1. Show native language names (Español, not Spanish) — LEP patients
 *    won't recognize the English name of their language
 * 2. Flag emojis for visual scanning — universal recognition
 * 3. Large 48px touch targets — senior-friendly accessibility
 * 4. Persist selection in sessionStorage so it carries through the flow
 */

import { useState } from "react";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/types";

interface LanguageSelectorProps {
  selectedLanguage: string;
  onSelect: (lang: SupportedLanguage) => void;
  compact?: boolean;
}

export function LanguageSelector({ selectedLanguage, onSelect, compact = false }: LanguageSelectorProps) {
  const [showAll, setShowAll] = useState(false);

  // Top 6 languages shown by default (covers ~90% of US LEP population)
  const topLanguages = SUPPORTED_LANGUAGES.slice(0, 6);
  const displayLanguages = showAll ? SUPPORTED_LANGUAGES : topLanguages;
  const selected = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage) ?? SUPPORTED_LANGUAGES[0];

  if (compact) {
    // Compact: just show current language with a change button
    return (
      <button
        onClick={() => setShowAll(!showAll)}
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all"
        style={{
          backgroundColor: "var(--color-surface-alt)",
          color: "var(--color-text)",
          border: "1px solid var(--color-border)",
        }}
        aria-label={`Language: ${selected.name}. Tap to change.`}
      >
        <span>{selected.flag}</span>
        <span>{selected.nativeName}</span>
        <span style={{ color: "var(--color-text-muted)" }}>▾</span>
      </button>
    );
  }

  return (
    <div className="w-full">
      <h3 className="mb-2 text-lg font-bold" style={{ color: "var(--color-text)" }}>
        🌍 What language do you speak?
      </h3>
      <p className="mb-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
        We&apos;ll explain your care plan in your language.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {displayLanguages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => onSelect(lang)}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all active:scale-[0.98]"
            style={{
              backgroundColor:
                selectedLanguage === lang.code ? "var(--color-primary)" : "var(--color-surface)",
              color: selectedLanguage === lang.code ? "white" : "var(--color-text)",
              border:
                selectedLanguage === lang.code
                  ? "2px solid var(--color-primary)"
                  : "2px solid var(--color-border)",
              minHeight: "var(--touch-target)",
            }}
            aria-pressed={selectedLanguage === lang.code}
            aria-label={`${lang.name} (${lang.nativeName})`}
          >
            <span className="text-xl">{lang.flag}</span>
            <div className="min-w-0">
              <div className="text-base font-semibold truncate">{lang.nativeName}</div>
              {lang.code !== "en" && (
                <div
                  className="text-xs truncate"
                  style={{
                    color: selectedLanguage === lang.code ? "rgba(255,255,255,0.7)" : "var(--color-text-muted)",
                  }}
                >
                  {lang.name}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {!showAll && SUPPORTED_LANGUAGES.length > 6 && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-3 w-full rounded-xl px-4 py-3 text-base font-medium"
          style={{
            color: "var(--color-accent)",
            backgroundColor: "var(--color-surface-alt)",
            minHeight: "var(--touch-target)",
          }}
        >
          Show {SUPPORTED_LANGUAGES.length - 6} more languages...
        </button>
      )}

      {showAll && (
        <button
          onClick={() => setShowAll(false)}
          className="mt-3 w-full rounded-xl px-4 py-3 text-base font-medium"
          style={{
            color: "var(--color-text-muted)",
            minHeight: "var(--touch-target)",
          }}
        >
          Show fewer
        </button>
      )}
    </div>
  );
}

/** Inline language badge shown in headers/plan to indicate translation is active */
export function LanguageBadge({ languageCode }: { languageCode?: string }) {
  if (!languageCode || languageCode === "en") return null;

  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === languageCode);
  if (!lang) return null;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
      style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "white" }}
      title={`Translated to ${lang.name}`}
    >
      {lang.flag} {lang.nativeName}
    </span>
  );
}
