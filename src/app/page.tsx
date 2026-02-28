import Link from "next/link";
import WelcomeBack from "@/components/welcome-back";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-bg)" }}>
      {/* Welcome Back — shows if saved plan exists */}
      <WelcomeBack />

      {/* Hero Section */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        {/* Logo / Brand */}
        <div
          className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl text-4xl text-white shadow-lg"
          style={{ backgroundColor: "var(--color-primary)" }}
          aria-hidden="true"
        >
          💚
        </div>

        <h1
          className="mb-4 text-4xl font-bold tracking-tight"
          style={{ color: "var(--color-text)" }}
        >
          CareAfter
        </h1>

        <p
          className="mx-auto mb-8 max-w-md text-xl leading-relaxed"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Turn your discharge papers into a{" "}
          <strong style={{ color: "var(--color-primary)" }}>personal recovery assistant</strong> —
          in your language, free, private, and always available.
        </p>

        {/* The Magic Moment CTA */}
        <Link
          href="/scan"
          className="mb-6 inline-flex items-center gap-3 rounded-2xl px-8 py-5 text-xl font-semibold text-white shadow-lg transition-all hover:shadow-xl active:scale-[0.98]"
          style={{ backgroundColor: "var(--color-primary)", minHeight: "var(--touch-target)" }}
        >
          <span className="text-2xl" aria-hidden="true">📸</span>
          Scan Your Discharge Papers
        </Link>

        <p className="text-base" style={{ color: "var(--color-text-muted)" }}>
          No account needed · Free forever · Encrypted on your device
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
            title="Take a Photo"
            description="Snap a picture of your discharge summary. That's it — no typing required."
            color="#0F766E"
          />
          <StepCard
            step="2"
            emoji="✨"
            title="AI Reads & Translates"
            description="We extract your medications, follow-ups, and warning signs — in any of 20 languages."
            color="#2563EB"
          />
          <StepCard
            step="3"
            emoji="💊"
            title="Your Recovery Plan"
            description="Get reminders, tap-to-explain, ask questions, and share with your caregiver."
            color="#7C3AED"
          />
        </div>
      </section>

      {/* Trust Signals */}
      <section className="px-6 py-12" aria-labelledby="trust">
        <h2 id="trust" className="sr-only">
          Why trust CareAfter
        </h2>
        <div className="mx-auto grid max-w-2xl gap-4 sm:grid-cols-2">
          <TrustBadge emoji="🔒" text="Encrypted on your device" detail="Deleted from our servers instantly" />
          <TrustBadge emoji="🌍" text="20 languages" detail="AI translates your care plan" />
          <TrustBadge emoji="🚫" text="No ads. No data selling." detail="Your health data stays yours" />
          <TrustBadge emoji="💬" text="Ask follow-up questions" detail="AI answers from your discharge" />
        </div>
      </section>

      {/* Emergency banner */}
      <div
        className="px-6 py-4 text-center text-base font-medium text-white"
        style={{ backgroundColor: "var(--color-danger)" }}
        role="alert"
      >
        ⚠️ If you&apos;re having a medical emergency, call{" "}
        <a href="tel:911" className="underline font-bold">
          911
        </a>{" "}
        immediately.
      </div>

      {/* Footer */}
      <footer
        className="px-6 py-8 text-center text-sm"
        style={{ color: "var(--color-text-muted)" }}
      >
        <p>
          CareAfter does not provide medical advice. Always consult your healthcare provider.
        </p>
        <p className="mt-2">© {new Date().getFullYear()} CareAfter. All rights reserved.</p>
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
