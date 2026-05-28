# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**FractaPay** — AI-powered batch payment processor. Built for Hackathon Stellar 37° × NearX.

User provides a destination address + selects a token + uploads a payment file (CSV/XLS/XLSX/PDF/TXT) → Gemini AI extracts only `{ amount, description }` per row (NEVER addresses — the destination is global) → user clicks **Review and confirm** to open a modal showing the recipient share (currently `15%` of the total to a single address) plus `2%` Etherfuse + FractaPay fee → user completes Etherfuse KYC (first-time only) → confirm creates an Etherfuse PIX onramp order → user pays via PIX → TESOURO is delivered on Stellar to the provided address.

**Tokens:**
- **TESOURO** (default and only enabled token) — Etherfuse Stellar token tracking BRL with yield. File must be in BRL. Flow: BRL (PIX onramp) → TESOURO (on-chain) → BRL (PIX offramp, optional, recipient-side).

**UI terminology**: the UI labels the token select as "Coin" / "Moeda" (TESOURO → "Real") to feel familiar to non-crypto users. Internally — types, code, contract, server — uses "token".

**Fee model:**
- `RECIPIENT_PERCENTAGE = 0.15` (15%): of the file's total BRL, the share that actually goes to the destination address.
- `FEE_PERCENTAGE = 0.02` (2%): combined Etherfuse + FractaPay fee charged on top of the recipient amount.
- Total the user pays via PIX = `recipientAmount × (1 + FEE_PERCENTAGE)`.
- Both constants live in `shared/src/constants` so server, web and contract math stay aligned.

## Monorepo Structure

Five packages, each with its own `node_modules` / `Cargo.lock` (no root `package.json`):

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
      → chat-route.ts parses file, calls FileHelper + analyze() to extract payments + price
      → chat-service.ts calls Gemini with full conversation history + current state context
      → Gemini returns structured JSON { message, action, payments?, allocations?, summary? }
      → action "add_payments": client merges new payments into useChatStore
      → action "set_allocations": client updates destination allocations in useChatStore
      → action "request_confirmation": client renders summary table in chat bubble
      → action "execute": client opens ReviewModal for all allocations at once
    → text message: POST /chat with messages history + context (destinations, payments, allocations)
  → user registers destinations (DestinationsPage at /destinations) with name, token, PIX key
    → stored in useDestinationsStore (Zustand persist → localStorage, key: fractapay.destinations)
  → after AI confirms, ReviewModal opens for ALL allocations at once (one combined quote/order):
    → KYC/quote/order/PIX flow for the shared recipientAddress
    → recovered pending orders detected server-side via findPendingOrder; returned with isRecovered=true
    → after execution, conversation saved to useConversationStore with a generated title
  → /payments shows PaymentsListPage: list of past conversations that created an order
  → /payment/$orderId is the receipt page (polls GET /etherfuse/order/:orderId until terminal)
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
