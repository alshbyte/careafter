"use client";

import Link from "next/link";
import WelcomeBack from "@/components/welcome-back";
import { useTranslation } from "@/lib/i18n/use-translation";
import { LanguageSelector } from "@/components/language-selector";
import { type SupportedLanguage } from "@/types";

export default function HomePage() {
  const { t, language, setLanguage } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-bg)" }}>
      {/* Welcome Back — shows if saved plan exists */}
      <WelcomeBack />

      {/* Language Selector — first thing users see */}
      <section className="px-6 pt-6">
        <div className="mx-auto max-w-md rounded-2xl p-4" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <LanguageSelector
            selectedLanguage={language}
            onSelect={(lang: SupportedLanguage) => setLanguage(lang.code)}
          />
        </div>
      </section>

      {/* Hero Section */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        {/* Logo / Brand */}
        <div
          className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl text-4xl text-white shadow-lg"
          style={{ backgroundColor: "var(--color-primary)" }}
          aria-hidden="true"
        >
          🔬
        </div>

        <h1
          className="mb-4 text-4xl font-bold tracking-tight"
          style={{ color: "var(--color-text)" }}
        >
          {t.landing.heroTitle}
        </h1>

        <p
          className="mx-auto mb-8 max-w-md text-xl leading-relaxed"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {t.landing.heroSubtitle}
        </p>

        {/* The Magic Moment CTA */}
        <Link
          href="/scan"
          className="mb-6 inline-flex items-center gap-3 rounded-2xl px-8 py-5 text-xl font-semibold text-white shadow-lg transition-all hover:shadow-xl active:scale-[0.98]"
          style={{ backgroundColor: "var(--color-primary)", minHeight: "var(--touch-target)" }}
        >
          {t.landing.ctaButton}
        </Link>

        <p className="text-base" style={{ color: "var(--color-text-muted)" }}>
          {t.landing.ctaSubtext}
        </p>
      </section>

      {/* How It Works */}
      <section
        className="px-6 py-14"
        style={{ backgroundColor: "var(--color-surface)" }}
        aria-labelledby="how-it-works"
      >
        <h2
          id="how-it-works"
          className="mb-10 text-center text-2xl font-bold"
          style={{ color: "var(--color-text)" }}
        >
          How It Works
        </h2>

        <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-3">
          <StepCard
            step="1"
            emoji="📸"
            title={t.landing.step1Title}
            description={t.landing.step1Desc}
            color="#1E3A5F"
          />
          <StepCard
            step="2"
            emoji="✨"
            title={t.landing.step2Title}
            description={t.landing.step2Desc}
            color="#E8A838"
          />
          <StepCard
            step="3"
            emoji="💊"
            title={t.landing.step3Title}
            description={t.landing.step3Desc}
            color="#2D5A8E"
          />
        </div>
      </section>

      {/* Trust Signals */}
      <section className="px-6 py-12" aria-labelledby="trust">
        <h2 id="trust" className="sr-only">
          Why trust MedLens
        </h2>
        <div className="mx-auto grid max-w-2xl gap-4 sm:grid-cols-2">
          <TrustBadge emoji="🔒" text={t.landing.trustEncrypted} detail={t.landing.trustEncryptedDetail} />
          <TrustBadge emoji="🌍" text={t.landing.trustLanguages} detail={t.landing.trustLanguagesDetail} />
          <TrustBadge emoji="🚫" text={t.landing.trustNoAds} detail={t.landing.trustNoAdsDetail} />
          <TrustBadge emoji="💬" text={t.landing.trustChat} detail={t.landing.trustChatDetail} />
        </div>
      </section>

      {/* Emergency banner */}
      <div
        className="px-6 py-4 text-center text-base font-medium text-white"
        style={{ backgroundColor: "var(--color-danger)" }}
        role="alert"
      >
        {t.common.emergency.replace("911", "")}{" "}
        <a href="tel:911" className="underline font-bold">
          911
        </a>
      </div>

      {/* Footer */}
      <footer
        className="px-6 py-8 text-center text-sm"
        style={{ color: "var(--color-text-muted)" }}
      >
        <p>
          {t.landing.disclaimer}
        </p>
        <p className="mt-2">© {new Date().getFullYear()} {t.landing.copyright}</p>
      </footer>
    </div>
  );
}

function StepCard({
  step,
  emoji,
  title,
  description,
  color,
}: {
  step: string;
  emoji: string;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div
      className="animate-fade-in rounded-2xl p-6 text-center shadow-sm"
      style={{
        backgroundColor: "var(--color-surface-alt)",
        borderRadius: "var(--radius-lg)",
        borderTop: `4px solid ${color}`,
        animationDelay: `${(parseInt(step) - 1) * 0.1}s`,
        animationFillMode: "both",
      }}
    >
      <div
        className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {step}
      </div>
      <div className="mb-2 text-3xl" aria-hidden="true">
        {emoji}
      </div>
      <h3 className="mb-2 text-lg font-semibold" style={{ color: "var(--color-text)" }}>
        {title}
      </h3>
      <p className="text-base" style={{ color: "var(--color-text-secondary)" }}>
        {description}
      </p>
    </div>
  );
}

function TrustBadge({ emoji, text, detail }: { emoji: string; text: string; detail: string }) {
  return (
    <div
      className="flex items-start gap-3 rounded-xl p-4"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      <span className="mt-0.5 text-2xl" aria-hidden="true">
        {emoji}
      </span>
      <div>
        <span className="text-base font-semibold" style={{ color: "var(--color-text)" }}>
          {text}
        </span>
        <p className="mt-0.5 text-sm" style={{ color: "var(--color-text-muted)" }}>
          {detail}
        </p>
      </div>
    </div>
  );
}
