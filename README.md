<h1 align="center">Plan<span>ora</span></h1>

<p align="center">
  <strong>Plans that actually happen — together.</strong><br />
  The collaborative trip planner that turns "we should hang out" into "here's the boarding pass."
</p>

<p align="center">
  <a href="https://planora-plum-beta.vercel.app">Live Demo</a> ·
  <a href="#features">Features</a> ·
  <a href="#tech-stack">Tech Stack</a> ·
  <a href="#getting-started">Getting Started</a> ·
  <a href="#project-structure">Project Structure</a>
</p>

## ✨ Features

| Feature | Description |
|---|---|
| **AI Itinerary Generation** | Drop a prompt and get a fully personalized, day-by-day itinerary in seconds — powered by Groq's Llama 3.3 70B. |
| **PlaBot Chat** | An AI travel assistant that can read and modify your itinerary through tool-calling, right inside the plan. |
| **Group Sync** | Real-time collaborative workspace. Create groups, invite friends via link, and plan together. |
| **Voting & Polls** | Up/down voting on itinerary items with automatic AI tie-breaking so decisions don't stall. |
| **Momentum Engine** | Smart email nudges (via Resend) keep everyone engaged and accountable. Runs as a Supabase Edge Function on a cron schedule. |
| **Budget Splitter** | Track expenses on the go and see who owes what — without the awkward math. |
| **Trip Memories** | Shared collaborative photo dump to relive the best moments of your journey. |
| **Transit Weaver** | AI-generated transit suggestions (flights, trains, cabs) for each group member, insertable directly into your itinerary. |
| **PWA Support** | Installable Progressive Web App with offline caching via Serwist and push notifications via Web Push. |
| **Input Guardrails & Rate Limiting** | Dynamic protection against prompt injections, code generation, and academic spam with a centralized IP-based rate limiter. |
| **Fail-Safe Image Loader** | Dual-tier rendering that fetches scenic photos from `image.pollinations.ai` and falls back to curated Unsplash travel images if the AI API is rate-limited. |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 15](https://nextjs.org) (App Router, Turbopack) |
| **Language** | TypeScript |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com) |
| **Database** | [Supabase](https://supabase.com) (PostgreSQL + Row Level Security) |
| **Auth** | Supabase Auth (email/password, OAuth) |
| **AI** | [Vercel AI SDK](https://sdk.vercel.ai) + [Groq](https://groq.com) (Llama 3.3 70B) |
| **Email** | [Resend](https://resend.com) |
| **State** | [Zustand](https://github.com/pmndrs/zustand), React hooks |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) |
| **PWA** | [Serwist](https://serwist.pages.dev) (service worker), Web Push API |
| **Deployment** | [Vercel](https://vercel.com) |

---

## 🏁 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** (recommended) or npm
- A [Supabase](https://supabase.com) project
- A [Groq](https://console.groq.com) API key
- A [Resend](https://resend.com) API key
- A [LocationIQ](https://locationiq.com) API key

### 1. Clone and install

```bash
git clone https://github.com/apoorvmaurya/planora.git
cd planora
pnpm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in the values — see [`.env.local.example`](.env.local.example) for the full list:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI (Groq)
GROQ_API_KEY=

# Geocoding (LocationIQ)
NEXT_PUBLIC_LOCATIONIQ_KEY=

# Email (Resend)
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Web Push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

### 3. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### 4. Database setup

The Supabase project should have the required tables, RLS policies, and Edge Functions deployed. Migration files are in the [`supabase/`](supabase/) directory and can be applied via the Supabase CLI or the MCP integration.

---

## 📂 Project Structure

```
planora/
├── app/
│   ├── (app)/              # Authenticated app pages (dashboard, plans, groups, etc.)
│   ├── (auth)/             # Auth pages (login, signup, onboarding)
│   ├── (public)/           # Public landing page
│   ├── api/                # API routes (plans, groups, friends, AI, push, etc.)
│   ├── auth/               # OAuth callback handler
│   ├── layout.tsx          # Root layout (font, Toaster, SpeedInsights, SW)
│   └── globals.css         # Design tokens, theme variables, performance layer
├── components/
│   ├── layout/             # Sidebar
│   ├── providers/          # UserProvider (auth context)
│   ├── shared/             # Reusable components (modals, cards, PlaBot, etc.)
│   └── ui/                 # shadcn/ui primitives
├── hooks/                  # Custom React hooks (useFriends, useGroup, useProfile)
├── lib/
│   ├── supabase/           # Supabase client (browser, server, middleware)
│   ├── ai/                 # AI utilities
│   ├── locationiq/         # Geocoding helpers
│   ├── push/               # Web Push utilities
│   ├── utils/              # Business logic (expense calculator, etc.)
│   └── utils.ts            # Tailwind `cn()` helper
├── store/                  # Zustand stores
├── supabase/               # Migrations & Edge Functions (Momentum Engine)
├── public/                 # Static assets, PWA icons, service worker
└── middleware.ts            # Next.js middleware (session refresh, route guards)
```

---

<p align="center">
  Made with 💖 for better trips.
</p>
