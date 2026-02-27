# CareAfter

> Turn your discharge papers into a personal recovery assistant — free, private, and always available.

## Quick Start

```bash
# Install dependencies
npm install

# Copy env and add your Azure OpenAI keys
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

- **Next.js 15** — React framework with API routes
- **TypeScript** — Type safety throughout
- **Tailwind CSS** — Utility-first styling, senior-friendly design system
- **Azure OpenAI GPT-4o Vision** — Discharge summary extraction
- **PWA** — Installable, offline-capable, push notifications
- **WebCrypto** — Client-side AES-256-GCM encryption

## Key Design Decisions

- **18px base font** — Readable for elderly patients
- **48px touch targets** — WCAG 2.1 AA compliant
- **No account required** — Zero friction onboarding
- **Client-side encryption** — Patient data never stored in plaintext
- **Ephemeral AI processing** — Images deleted immediately after extraction

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── api/extract/      # AI extraction endpoint
│   ├── api/explain/      # Term explanation endpoint
│   ├── scan/             # Camera capture page
│   ├── confirm/          # Review & confirm extraction
│   └── plan/             # Care plan dashboard
├── components/           # Reusable UI components
├── lib/
│   ├── ai/               # AI extraction service
│   ├── crypto/           # WebCrypto encryption
│   ├── db/               # IndexedDB persistence
│   └── notifications/    # Push notification service
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
└── styles/               # Global CSS + design tokens
```
