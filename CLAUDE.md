# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**FractaPay** — AI-powered batch payment processor. Built for Hackathon Stellar 37° × NearX.

User registers named destinations (recipients with PIX keys) → describes payments via AI chat or uploads a file (CSV/XLS/XLSX/PDF/TXT) → Gemini AI extracts `{ amount, description }` per row → AI asks which destinations receive payments and at what percentage → user clicks **Review and confirm** to open a modal showing the total recipient amount plus `1%` fee → user completes Etherfuse KYC (first-time only) → confirm creates an Etherfuse PIX onramp order → user pays via PIX → TESOURO arrives on Stellar → server automatically creates one offramp order per destination → each destination receives BRL via their PIX key.

**Payment lifecycle:** `CREATED` (waiting for PIX) → `FUNDED` (onramp complete, per-destination offramp orders created) → `PROCESSING` (offramps in flight) → `COMPLETED` (all destinations received BRL). Terminal error states: `FAILED`, `REFUNDED`, `CANCELED`.

**Tokens:**
- **TESOURO** (default and only enabled token) — Etherfuse Stellar token tracking BRL with yield. File must be in BRL. Flow: BRL (PIX onramp) → TESOURO (on-chain) → BRL (PIX offramp per destination).

**UI terminology**: the UI labels the token select as "Coin" / "Moeda" (TESOURO → "Real") to feel familiar to non-crypto users. Internally — types, code, contract, server — uses "token".

**Fee model:**
- Each destination receives a user-defined percentage (1–100%) of the file's total BRL amount. Multiple destinations are independent — percentages do not need to sum to 100%.
- `FEE_PERCENTAGE = 0.01` (1%): combined Etherfuse + FractaPay fee charged on top of the total recipient amount.
- Total the user pays via PIX = `totalRecipientAmount × (1 + FEE_PERCENTAGE)`.
- `FEE_PERCENTAGE` lives in `shared/src/constants` so server and web math stay aligned.

## Monorepo Structure

Five packages, each with its own `node_modules` / `Cargo.lock`. The root `package.json` exists only to install Husky (`prepare` script) — there is no workspace tooling; install and run commands per package.

```
server/     Node.js + Fastify + TypeScript  (port 3000) — upload, AI, rate fetch, conversion, Prisma + MariaDB (port 3306)
web/        React + Vite + TypeScript       (port 5173) — UI
contracts/  Rust + Soroban SDK 26                       — on-chain batch_pay
shared/     TypeScript types + constants + helpers      — imported by web and server as `fractapay-shared`
```

## Per-package guides

- [server/CLAUDE.md](server/CLAUDE.md) — Fastify API, Gemini, Etherfuse proxy, Prisma/MariaDB, JWT/PKCE auth, server commands + env vars.
- [web/CLAUDE.md](web/CLAUDE.md) — React/Vite SPA, TanStack Router + Query, Zustand stores, i18n, web commands + env vars.
- [contracts/CLAUDE.md](contracts/CLAUDE.md) — Soroban `FractaPayContract`, agreements/execution/lifecycle, WASM build commands.
- [shared/CLAUDE.md](shared/CLAUDE.md) — Cross-package types, constants, helpers imported as `fractapay-shared`.
- [infra/CLAUDE.md](infra/CLAUDE.md) — Fly.io production deployment (server + MariaDB apps), provisioning, migrations, troubleshooting.

---

## Architecture

### Request flow

```
auth gate (router beforeLoad, see web/CLAUDE.md → Routing)
  → unauthenticated → /login (Google OAuth)
  → authenticated but no onboardingCompletedAt → /onboarding (company name)
  → authenticated + onboarded → app (ChatPage at /payments)

web (ChatPage at `/chat`)
  → user interacts via AI chat: types payment amounts or uploads a file (CSV/XLS/XLSX/PDF/TXT)
    → file upload: POST multipart/form-data to server /chat
      → chat-route.ts parses file, calls FileHelper + analyze() to extract payments
      → chat-service.ts calls Gemini with full conversation history + current state context
      → Gemini returns structured JSON { message, action, payments?, destinations?, summary? }
      → action "add_payments": client merges new payments into useChatStore
      → action "set_destinations": client updates destination allocations in useChatStore
      → action "request_confirmation": client renders summary table in chat bubble
      → action "execute": client opens ReviewModal for all destinations at once
    → text message: POST /chat with messages history + context (destinations, payments, chatDestinations)
  → user registers destinations (DestinationsPage at /destinations) with name, token, PIX key
    → stored in useDestinationsStore (Zustand persist → localStorage, key: fractapay.destinations)
  → after AI confirms, ReviewModal opens for ALL destinations at once (one combined quote/order):
    → KYC (`/kyc`), quote (`/quote`), onboarding (`/onboarding`) flow for the shared recipientAddress
    → confirm → POST /payments: server creates Etherfuse onramp order + persists payment to DB (items, destinations, messages, PIX, encrypted fields) → returns TPayment
    → on success: payment added to TanStack Query cache; chat resets; navigate to /chat/$payment.id
  → /payments shows PaymentsListPage: list of DB payments fetched via GET /payments
  → /payments/$id is the receipt page (polls GET /payments/:id until COMPLETED/error; FUNDED triggers automatic per-destination offramp via webhook → PROCESSING → COMPLETED when all destinations confirm)
  → /profile lets the authenticated user edit their display name
```

### Production deployment

See [infra/CLAUDE.md](infra/CLAUDE.md) for Fly.io setup, provisioning, migrations, and troubleshooting.

---

## Code Style

Global rules — apply across `server/`, `web/`, `shared/`, `contracts/`. Per-package files extend these with language-specific guidance.

- **Prettier**: no semicolons, single quotes, trailing commas (ES5), 100-char width.
- **Husky pre-commit**: runs `lint` + `typecheck` in both `server/` and `web/`.
- **No abbreviations in variable/parameter names**: use full words (e.g. `message` not `msg`, `error` not `err`, `request` not `req`, `response` not `res`, `index` not `idx`, `parameter` not `param`).
- **Blank line before `return`**: always leave one blank line before a `return` statement unless it is the very first statement in a block.
- **Trailing newline**: every file must end with a single blank line (newline character at EOF).
- **File naming conventions**: applies across `web/`, `server/`, and `shared/`. Components use PascalCase (e.g. `FileUpload.tsx`, `Button.tsx`). Helper classes use PascalCase (e.g. `FileHelper.ts`, `StringHelper.ts`). Everything else — services, routes, schemas, stores, hooks, types, config, and utilities — uses kebab-case (e.g. `ai-service.ts`, `upload-route.ts`, `payment-schema.ts`, `use-payments-store.ts`, `use-debounce.ts`).
- **Kebab-case for asset files**: all static assets — images, icons, SVGs, fonts — must be named in kebab-case (e.g. `upload-icon.svg`, `logo-dark.png`). No camelCase, PascalCase, or underscores in file names.
- **Icon file suffix**: all icon files must end with `-icon` (e.g. `upload-icon.svg`, `loading-spinner-icon.svg`, `empty-state-icon.svg`).
- **Object shorthand**: when an object property key matches its value variable name, use shorthand — `{ token }` not `{ token: token }`. Enforced via ESLint `object-shorthand` rule.
- **Ellipsis character**: always use the correct Unicode ellipsis `…` (U+2026), never three dots `...`. Applies to all user-facing strings, translations, placeholders, and prompts.
