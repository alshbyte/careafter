import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-bg)" }}>
      {/* Hero Section */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        {/* Logo / Brand */}
        <div
          className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl text-4xl text-white"
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
          No account needed · Free forever · Your care plan is encrypted on your device
        </p>
      </section>

      {/* How It Works */}
      <section
        className="px-6 py-12"
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

        <div className="mx-auto grid max-w-3xl gap-8 md:grid-cols-3">
          <StepCard
            step="1"
            emoji="📸"
            title="Take a Photo"
            description="Snap a picture of your discharge summary. That's it — no typing required."
          />
          <StepCard
            step="2"
            emoji="✨"
            title="AI Reads & Translates"
            description="We extract your medications, follow-ups, and warning signs — in any of 20 languages."
          />
          <StepCard
            step="3"
            emoji="💊"
            title="Your Personal Plan"
            description="Get reminders, tap-to-explain, and a dashboard built just for your recovery."
          />
        </div>
      </section>

      {/* Trust Signals */}
      <section className="px-6 py-12" aria-labelledby="trust">
        <h2 id="trust" className="sr-only">
          Why trust CareAfter
        </h2>
        <div className="mx-auto grid max-w-2xl gap-6 md:grid-cols-4">
          <TrustBadge emoji="🔒" text="Encrypted on your device, deleted from our servers" />
          <TrustBadge emoji="🌍" text="Available in 20 languages" />
          <TrustBadge emoji="🚫" text="No ads. No data selling. Ever." />
          <TrustBadge emoji="💚" text="Free for every patient" />
        </div>
      </section>

      {/* Emergency banner */}
      <div
        className="px-6 py-4 text-center text-base font-medium text-white"
        style={{ backgroundColor: "var(--color-danger)" }}
        role="alert"
      >
        ⚠️ If you're having a medical emergency, call{" "}
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
}: {
  step: string;
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div
      className="rounded-2xl p-6 text-center"
      style={{ backgroundColor: "var(--color-surface-alt)", borderRadius: "var(--radius-lg)" }}
    >
      <div
        className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
        style={{ backgroundColor: "var(--color-primary)" }}
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

function TrustBadge({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl p-4" style={{ backgroundColor: "var(--color-surface)" }}>
      <span className="text-2xl" aria-hidden="true">
        {emoji}
      </span>
      <span className="text-base font-medium" style={{ color: "var(--color-text-secondary)" }}>
        {text}
      </span>
    </div>
  );
}
