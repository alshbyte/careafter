# CareAfter

> Turn your discharge papers into a personal recovery assistant — free, private, and always available.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

## What is CareAfter?

CareAfter converts hospital discharge papers into a personalized recovery plan using AI. Patients snap a photo of their discharge summary, and the app extracts medications, follow-up appointments, and warning signs into an easy-to-understand care plan with reminders.

**The problem:** Post-discharge patients retain less than 50% of their instructions, contributing to 12-17% hospital readmission rates ($15K per readmission). CareAfter bridges that gap.

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

> **Note:** On machines with restricted PowerShell execution policies, use:
> `node node_modules\next\dist\bin\next dev`

## Features

| Feature | Description |
|---------|-------------|
| 📸 **Scan** | Camera capture or file upload of discharge papers |
| ✨ **AI Extraction** | GPT-4o Vision converts images to structured data |
| ✅ **Human Confirmation** | Color-coded confidence cards (green/yellow/red) |
| 💊 **Care Plan Dashboard** | Tabs for medications, follow-ups, and warning signs |
| 💡 **Tap-to-Explain** | Plain-language explanations of medical terms |
| 📅 **Calendar Reminders** | Downloads .ics files for native phone calendar |
| 🔔 **Push Notifications** | Server-scheduled Web Push for medication timing |
| 👥 **Caregiver Sharing** | Time-limited share links (48h expiry, zero-server) |
| 📱 **PWA** | Installable, offline-capable, app-like experience |
| 🔒 **Privacy-First** | Client-side AES-256-GCM encryption, ephemeral AI |
| 📊 **Anonymous Analytics** | Privacy-respecting event tracking with PII detection |
| 🛡️ **Error Boundary** | Graceful crash recovery with 911 emergency access |

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│   Browser   │────▶│  Next.js API │────▶│  Azure OpenAI  │
│   (PWA)     │◀────│   Routes     │◀────│  GPT-4o Vision │
└──────┬──────┘     └──────────────┘     └────────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│  IndexedDB   │     │   Service    │
│  (encrypted) │     │   Worker     │
└──────────────┘     └──────────────┘
```

- **Next.js 15** — React framework with App Router and API routes
- **TypeScript** — Full type safety
- **Tailwind CSS** — Utility-first styling, senior-friendly design system
- **Azure OpenAI GPT-4o Vision** — Discharge summary extraction (ephemeral)
- **WebCrypto AES-256-GCM** — Client-side encryption (key never leaves device)
- **IndexedDB** — Local-first encrypted persistence
- **Service Worker** — Offline caching, push notifications, background sync
- **Supabase** — Push subscription storage (optional, for server-scheduled reminders)

## Security & Privacy

| Layer | Protection |
|-------|-----------|
| **Transport** | HTTPS/TLS 1.3, HSTS with preload |
| **Headers** | CSP, X-Frame-Options: DENY, X-Content-Type-Options |
| **Encryption** | AES-256-GCM (per-device key, WebCrypto API) |
| **AI Processing** | Ephemeral — images never stored, not used for training |
| **Analytics** | Zero PII — server-side PII detector rejects violations |
| **Sharing** | Data in URL hash fragment (never sent to server), 48h expiry |
| **Rate Limiting** | Per-IP limits on all API routes |
| **Error Handling** | Error boundary with sanitized error reporting |

### Data Flow (Honest Privacy)

```
Your discharge photo → HTTPS → Our API → Azure OpenAI (processed in memory, deleted)
                                              ↓
                              Structured JSON ← (medications, follow-ups, warnings)
                                              ↓
                              Encrypted with AES-256-GCM → Stored in IndexedDB (your device only)
```

**What stays on your phone:** Care plan, medication schedule, encryption key, all preferences.  
**What temporarily leaves:** Discharge photo (deleted after extraction), tap-to-explain queries (text only).

## Key Design Decisions

- **18px base font** — Readable for elderly patients (WHO recommendation)
- **48px touch targets** — WCAG 2.1 AA compliant for motor impairments
- **No account required** — Zero friction; scan and go in under 15 seconds
- **Client-side encryption** — Patient data never stored in plaintext
- **Ephemeral AI processing** — Images deleted immediately after extraction
- **Calendar-first reminders** — .ics files work offline, cost $0, highest reliability
- **Local-first architecture** — App works fully offline after initial scan

## Project Structure

```
src/
├── app/                      # Next.js App Router pages
│   ├── api/
│   │   ├── analytics/        # Anonymous event ingestion (PII detection)
│   │   ├── cron/reminders/   # Server-scheduled push notifications
│   │   ├── explain/          # Medical term explanation
│   │   ├── extract/          # AI discharge extraction
│   │   └── push/             # Web Push subscribe/unsubscribe
│   ├── confirm/              # Human review with confidence cards
│   ├── plan/                 # Care plan dashboard (tabs, calendar, share)
│   ├── scan/                 # Camera capture + file upload
│   └── share/[token]/        # Read-only caregiver view
├── components/
│   ├── analytics-provider.tsx  # React context for event tracking
│   └── error-boundary.tsx      # Graceful crash recovery with 911 link
├── hooks/
│   └── use-careplan.ts       # useCarePlan, useNotifications, useInstallPrompt
├── lib/
│   ├── ai/                   # AI extraction prompts and service
│   ├── analytics/            # Privacy-first event tracker (batched, offline)
│   ├── calendar/             # iCalendar .ics file generator
│   ├── crypto/               # AES-256-GCM encryption utilities
│   ├── db/                   # IndexedDB encrypted persistence layer
│   ├── notifications/        # Web Push + local timer notifications
│   ├── push/                 # Supabase client, web-push sender
│   └── sharing/              # Share link generation (URL hash encoding)
├── types/                    # TypeScript type definitions
└── styles/                   # Global CSS with design tokens
```

## Cost Model

| Patients/month | Estimated Cost | Per Patient |
|---------------|---------------|-------------|
| 0-100 (MVP) | ~$5/mo | Free tiers cover it |
| 1,000 | ~$125-195/mo | $0.10-0.20 |
| 10,000 | ~$500-800/mo | $0.05-0.08 |

**How it's nearly free:** Vercel free tier, Supabase free tier, PostHog free tier. The only cost is Azure OpenAI at ~$0.05 per document extraction. Calendar reminders cost $0 (generated client-side).

## Environment Variables

```bash
# Required: Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-instance.openai.azure.com
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_DEPLOYMENT=gpt-4o

# Optional: Web Push (for server-scheduled reminders)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...

# Optional: Supabase (for push subscription storage)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=...

# Optional: Cron security
CRON_SECRET=your-secret
```

## License

MIT
