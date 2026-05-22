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

Four packages, each with its own `node_modules` / `Cargo.lock` (no root `package.json`):

```
server/     Node.js + Fastify + TypeScript  (port 3000) — upload, AI, rate fetch, conversion
web/        React + Vite + TypeScript       (port 5173) — UI
contracts/  Rust + Soroban SDK 26                       — on-chain batch_pay
shared/     TypeScript types + constants + helpers      — imported by web and server as `fractapay-shared`
```

---

## Commands

### Server (`cd server`)

```bash
npm install
cp .env.example .env      # then set GEMINI_API_KEY
npm run dev               # tsx watch — hot reload
npm run build             # tsc → dist/
npm run lint              # ESLint and Prettier
npm run typecheck         # tsc --noEmit
```

### Web (`cd web`)

```bash
npm install
cp .env.example .env      # set VITE_API_URL
npm run dev               # Vite dev server
npm run build             # tsc + vite build
npm run lint              # ESLint and Prettier
npm run typecheck
```

### Contracts (`cd contracts`)

```bash
cargo test                # run all unit tests
cargo test <test_name>    # run a single test (substring match, e.g. cargo test test_execute_mix)
cargo test -- --nocapture # show stdout from tests
make build                # cargo build --release --target wasm32v1-none
make lint                 # cargo clippy --all-targets --all-features -- -D warnings
make fmt                  # cargo fmt
make check                # fmt-check + clippy
make optimize             # shrink WASM (needs stellar CLI or wasm-opt)
make deploy-testnet       # deploy to Stellar testnet
```

WASM output: `contracts/target/wasm32v1-none/release/fractapay.wasm`. The `wasm32-unknown-unknown` target is broken on Rust 1.82+ with Soroban SDK 26 — always use `wasm32v1-none` (already installed via `rustup`).

---

## Architecture

### Request flow

```
web (FileUpload component)
  → user provides address + selects token + picks file
  → POST multipart/form-data to server /upload (fields: address, token, file — in that order, file LAST)
    → upload-route.ts validates: file present, token in SUPPORTED_TOKENS, address is a valid Stellar address (else ErrorCode.INVALID_ADDRESS)
    → FileHelper.ts parses buffer by type (csv-parse / xlsx / pdf-parse)
    → ai-service.ts sends extracted text to Gemini (extracts ONLY { amount, description } per row — no addresses, no currency conversion) and computes `price` (`fetchTesouroPerUsdcPrice() × fetchUsdPerBrlPrice()` via prices-service.ts)
    → Gemini returns { payments: [{ amount in BRL, description }] } (or [] if file currency ≠ BRL)
    → server returns { payments: [{ id, amount, description }], price } where `amount` is the BRL value from the file and `price` is the TESOURO-per-BRL conversion factor. Both `amount` and `price` are transported as 7-decimal strings (`STELLAR_DECIMALS`).
  → web stores token, price, address, and payments in usePaymentsStore (zustand). PaymentsList shows the subtotal (file total), the recipient amount (`subtotal × 15%`) and the total to pay (`recipient × 1.02`).
  → user clicks Review and confirm → ReviewModal opens:
    → If no Etherfuse customer yet → "Start KYC" button → POST /etherfuse/onboarding → store customerId/bankAccountId/presignedUrl/publicKey in useEtherfuseStore (persisted to localStorage) → navigate to /kyc (TanStack Router) which renders the Etherfuse onboarding URL in an iframe and polls GET /etherfuse/kyc/:customerId/:publicKey every 5s.
    → Once KYC status === 'approved', user goes back to "/" and reopens the modal → POST /etherfuse/quote with sourceAmount = recipientAmount (BRL) → modal renders the quote with the countdown ring (QUOTE_EXPIRY_SECONDS = 60) and a Refresh button.
    → Confirm → POST /etherfuse/order → response includes the PIX `{ pixCode, pixKey, amount }` → modal swaps to PixInstructions (QR code + copy-and-paste textarea).
    → /payment/:orderId is the dedicated status page (polls GET /etherfuse/order/:orderId until status is terminal: completed/failed/refunded/canceled).
```

### Server internals

- **`src/helpers/EnvHelper.ts`** — Zod-validated env; process exits immediately if `GEMINI_API_KEY` or `ETHERFUSE_API_KEY` is missing. `ETHERFUSE_BASE_URL` defaults to the sandbox.
- **`src/helpers/FileHelper.ts`** — Dispatch by MIME type + extension. CSV → JSON string; XLSX/XLS → CSV string per sheet; PDF → raw text; TXT → utf-8 passthrough.
- **`src/services/ai-service.ts`** — Single `analyze(content, { token })` call. Sends the file content to Gemini and returns `{ payments, price }`. Each payment is `{ id, amount, description }` where `amount` is the FIAT value from the file. `price` is the FIAT → on-chain-token conversion factor as a 7-decimal string: for TESOURO, `fetchTesouroPerUsdcPrice() × fetchUsdPerBrlPrice()` (BigNumber, capped via `StringHelper.formatAmount`); for USDC, `1`. Model is `gemini-3.1-flash-lite`. JSON is extracted with a regex fallback (`/\{[\s\S]*\}/`) in case the model adds surrounding text despite the system prompt. AI is instructed to:
  - Extract ONLY `{ amount, description }` per row — never addresses (the destination is provided separately and is global to the upload).
  - NEVER convert currencies — return amounts in the file's FIAT as-is. If file currency doesn't match expected FIAT (BRL for TESOURO, USD for USDC), return `{ payments: [] }`.
  - Treat bare numbers (e.g. `42,90` or `58.22`) as already-denominated in the expected FIAT for the selected token.
- **`src/services/prices-service.ts`** — Pure I/O. `fetchUsdPerBrlPrice()` calls AwesomeAPI (`https://economia.awesomeapi.com.br/json/last/USD-BRL`); `fetchTesouroPerUsdcPrice()` queries Stellar Horizon orderbook. Both return `BigNumber` and throw typed `ErrorCode` (`RATE_FETCH_FAILED` / `ORDERBOOK_FETCH_FAILED`) on any failure — never falls back to 1:1. Called by `ai-service.ts` during `analyze` (TESOURO only) to compute the upload-time `price`.
- **`src/routes/upload-route.ts`** — Validates token + address (both required; address must be a valid Stellar G-address). File validation uses both MIME type AND extension (browsers sometimes send wrong MIME for `.xls`). 10 MB file-size limit is set in `@fastify/multipart` registration. Multipart fields must come BEFORE the file in the FormData stream (`token` and `address` first, `file` last) — `@fastify/multipart` only populates `data.fields` from parts that arrive before the file.
- **`src/services/etherfuse-service.ts`** — Thin wrapper around the Etherfuse Ramp REST API built on a pre-configured `axios` instance (same version `1.7.2` as the web client). Auth header is the raw key (no `Bearer` prefix), set on the axios instance once at module load. Generates partner-side UUIDs for `customerId` / `bankAccountId` / `quoteId` / `orderId`. Exposes `createOnboarding`, `getKycStatus`, `registerBankAccount`, `createQuote`, `createOrder`, `getOrder`, `simulateFiatReceived`. Network/HTTP errors are normalised to `ErrorCode.ETHERFUSE_REQUEST_FAILED`; 404 on order paths maps to `ErrorCode.ORDER_NOT_FOUND`. Quote `sourceAsset` is always `BRL`; `targetAsset` is `TESOURO:GCRYUGD5...`.
- **`src/services/etherfuse-webhook-store.ts`** — In-memory cache (`Map`) of the most recent webhook event per `${event}:${id}` key (e.g. `order_updated:abc-123`). Records the event status, the full data payload and the originating timestamp. Used by the webhook receiver and available for future short-circuiting of polling.
- **`src/routes/etherfuse-route.ts`** — Proxies the Etherfuse flow so the API key never reaches the browser. Endpoints: `POST /etherfuse/onboarding`, `GET /etherfuse/kyc/:customerId/:publicKey`, `POST /etherfuse/bank-account`, `POST /etherfuse/quote`, `POST /etherfuse/order`, `GET /etherfuse/order/:orderId`, `POST /etherfuse/order/:orderId/simulate` (sandbox only), `POST /etherfuse/webhook` (receives Etherfuse webhook events — `order_updated` / `kyc_updated` / etc. — validates the payload, logs through Fastify and stores in `etherfuse-webhook-store`). All routes validate the public key with `StellarHelper.isValidAddress` where applicable and return `{ success: false, error: ErrorCode }` shapes for failures.

### Web internals

- **Routing** — TanStack Router (`src/router/index.tsx`) wires three routes mounted under `<App />`: `/` (HomePage — FileUpload + PaymentsList), `/kyc` (KycPage — Etherfuse onboarding iframe + status polling, requires `customerId`/`publicKey`/`presignedUrl` search params or it redirects home), `/payment/$orderId` (PaymentPage — order status + PIX instructions). Header and Footer live outside the `<RouterProvider>` so they render on every route.
- **State** — `src/hooks/use-payments-store.ts` (Zustand) holds `payments: TPayment[]`, `token: TToken`, `price: string`, `address: string`, `hasPayments`, plus actions `setPayments` / `mergePayments` / `addPayment` / `updatePayment` / `deletePayment` / `setToken` / `setPrice` / `setAddress`. Payments are deduplicated by `id` on every mutation. **`TPayment` is `{ id, amount, description? }`** where `amount` is the **BRL** value — no per-row address or token; the destination address and token are global to the upload. `address` is populated by `FileUpload` after a successful upload so `PaymentsList`/`ReviewModal` can read it.
- **Etherfuse state** — `src/hooks/use-etherfuse-store.ts` (Zustand + `persist` middleware, key `fractapay.etherfuse`) holds `customerId`, `bankAccountId`, `presignedUrl`, `publicKey`. Persistence is intentional: after the user finishes KYC and returns to the app, the customer/bank-account IDs survive a page reload so we don't restart onboarding.
- **Data fetching** — `src/hooks/use-upload-mutation.ts` wraps a TanStack Query `useMutation`. Posts `multipart/form-data` to `/upload` with fields appended in this exact order: `address`, `token`, `file` (file LAST — `@fastify/multipart` requires non-file fields to arrive before the file). Etherfuse hooks live alongside it: `use-onboarding-mutation.ts`, `use-kyc-status-query.ts` (polls every 5s until `approved` or `rejected`), `use-quote-mutation.ts`, `use-order-mutation.ts`, `use-order-query.ts` (polls every 5s until the order reaches a terminal status).
- **Form validation** — Zod schemas in `src/schemas/`. `fileUploadSchema` requires a valid Stellar address via `StellarHelper.isValidAddress`. `paymentEditSchema` has `amount` (BigNumber > 0) and `description` (max 200).
- **Display formatting** — `StringHelper.formatCurrencyAmount(amount, token)` (in `shared/`) formats amounts as `R$ 152,56` for TESOURO using `Intl.NumberFormat` + `SYMBOL_BY_TOKEN` post-processing. Display is fixed at 2 decimals; the stored value keeps full `STELLAR_DECIMALS` precision. Use `StringHelper.formatAmount` (accepts `string | number | BigNumber`) whenever a value is about to cross the network boundary (server↔web) — it caps at `STELLAR_DECIMALS` with `ROUND_DOWN`.
- **Reusable primitives** — `Modal.tsx` wraps `@radix-ui/react-dialog` and is the only place a Radix `Dialog.Root` should be instantiated; other features compose it (e.g. `ReviewModal.tsx`). `Accordion.tsx` wraps `@radix-ui/react-accordion` (`type="single"`, collapsible) and is reused for the fee/conversion details inside `ReviewModal`. `CountdownRing.tsx` renders the circular quote-expiry indicator + Refresh button, fed by `use-countdown.ts` (a 1s ticker over `expiresAt` ISO string). `PixInstructions.tsx` renders the QR (via `react-qr-code`) and a copy-to-clipboard textarea — toast feedback via `ToastHelper`.
- **i18n** — `src/i18next/index.ts` initialises i18next with bundled JSON (`en-US` / `pt-BR`). Language toggle is in `Footer.tsx`. TypeScript-typed translations in `src/types/i18next.d.ts`.
- **API client** — `src/services/server.ts` creates a single axios instance with `baseURL` from `VITE_API_URL`.

### Shared internals (`shared/` — imported as `fractapay-shared`)

- **Types** — `TToken = 'TESOURO'`; `TLanguage = 'en-US' | 'pt-BR'`; `TFiatCurrency = 'BRL'`; `TPixKeyType = 'evp' | 'cpf' | 'cnpj' | 'email' | 'phone'`; `TPayment = { id, amount, description? }`; `TPaymentResponse = { payments, price }`; `TUploadPayload = { file, token, address }` (address REQUIRED); `TUploadResult = { success, payments, price, error? }`; `TRecipientShare = { address, percentage }`. **Etherfuse types**: `TKycStatus`, `TOnboardingPayload`/`TOnboardingResult`, `TKycStatusResult`, `TBankAccountPayload`/`TBankAccountResult`, `TQuotePayload`/`TQuoteResult`, `TOrderPayload`/`TOrderResult` (with `pix?: TPixInstructions`), `TPixInstructions`, `TOrderStatus = 'created' | 'funded' | 'completed' | 'failed' | 'refunded' | 'canceled'`. `ErrorCode` enum adds: `INVALID_PAYLOAD`, `ETHERFUSE_REQUEST_FAILED`, `KYC_NOT_APPROVED`, `QUOTE_EXPIRED`, `ORDER_NOT_FOUND`.
- **Constants** — `ALLOWED_EXTENSIONS`, `ALLOWED_MIME_TYPES`, `ALLOWED_INPUT_ACCEPT`, `SUPPORTED_TOKENS`, `STELLAR_DECIMALS = 7`, `FIAT_BY_TOKEN = { TESOURO: 'BRL' }`, `LANGUAGE_BY_TOKEN`, `SYMBOL_BY_TOKEN = { TESOURO: 'R$' }`, `RECIPIENT_PERCENTAGE = BigNumber('0.15')`, `FEE_PERCENTAGE = BigNumber('0.02')`, `QUOTE_EXPIRY_SECONDS = 60`.
- **Helpers** — `StellarHelper.isValidAddress(value)` (wraps `StrKey.isValidEd25519PublicKey`). `StringHelper.truncateMiddle(value, max)`, `StringHelper.formatAmount(value)` (accepts `string | number | BigNumber`, Stellar 7-decimal cap with `ROUND_DOWN`), `StringHelper.formatCurrencyAmount(value, token)` (locale + symbol via `Intl.NumberFormat`, fixed at 2 decimals for display).

### Contract internals (`contracts/src/lib.rs` → `FractaPayContract`, version `"0.4.0"`)

- **Direct-debit model.** The payer holds the token balance in their own wallet. At execute time the contract calls SAC `transfer(payer, receiver, amount)`. `agreement.payer.require_auth()` covers both the agreement-level auth and the SAC transfer auth in a single signature — there is no on-contract escrow pool.
- **Agreements.** `create_agreement(payer, receiver, token, contract_type, flat_amount, percent_bps, reference_amount, frequency, end_timestamp) -> u64`. Returns an auto-incrementing ID. `contract_type` is `Flat`, `Royalties`, or `Mix`. Payment formula:
  - `Flat`        → `flat_amount`
  - `Royalties`   → `reference_amount * percent_bps / 10_000`
  - `Mix`         → `flat_amount + reference_amount * percent_bps / 10_000`
  `reference_amount` is stored on the agreement and updated via `set_reference(id, new_ref)`. `frequency` is one of `Weekly | Biweekly | Monthly | Quarterly | Yearly | Custom(u64 seconds)`. `receiver` and `token` are immutable after creation — edits change other fields only; switching either requires `end_agreement` + new `create_agreement`.
- **Execution.** `execute_due_payment(id)` (single) and `execute_all_due(payer)` (batch). The execute path reads `token.balance(payer)` first; strict path panics on not-due/paused/ended/insufficient-balance, batch path silently skips them. Each successful execution updates `last_paid_at = now`, `last_amount_paid`, appends a `PaymentRecord` to `PaymentHistory(payer)`, and emits `PaymentExecuted`. `execute_all_due` is order-sensitive when the payer is short: agreements pay in `PayerAgreements` insertion order until balance drains.
- **Lifecycle.** `pause_agreement` records `paused_at = now`. `resume_agreement` adds the paused duration to `last_paid_at` so the schedule is *shifted, not skipped* — no missed cycles, just a later next due. `end_agreement` flips status to `Ended` (one-way); funds stay in the payer's wallet untouched.
- **Queries.** `get_due_payments(payer) -> Vec<DuePayment>` (Active agreements past their next due date), `get_agreement(id)`, `get_payer_agreements(payer)`, `get_payment_history(payer)`.
- **Auth.** Every mutating method calls `payer.require_auth()` (or `admin.require_auth()` for `upgrade`). `execute_due_payment` requires the agreement's stored payer to authorize — not the caller.
- **Storage.** Instance storage holds `Admin` and `NextAgreementId`. Persistent storage holds `Agreement(id)`, `PayerAgreements(payer)`, `PaymentHistory(payer)` — all extended to TTL `535_000` (threshold `100`) on every read/write.
- **Events.** `AgreementCreated/Edited/Paused/Resumed/Ended`, `PaymentExecuted`, `Upgraded` — all use the modern `#[contractevent]` + `.publish(&env)` style, never `env.events().publish(...)`.
- **Errors.** `#[contracterror]` enum `ContractError` with discrete codes (e.g. `PaymentNotDue = 3`, `InsufficientBalance = 8`). Tests assert exact panic strings of the form `"Error(Contract, #N)"`.
- Amounts are in **stroops** (1 XLM = 10,000,000 stroops). The Rust crate-level `#![allow(clippy::too_many_arguments)]` is required because the `#[contractimpl]`/`#[contractargs]`/`#[contractclient]` macros generate functions with >7 args that clippy can't be silenced on per-function.
- Tests use `env.mock_all_auths()`, `register_stellar_asset_contract_v2`, and time-travel via `env.ledger().with_mut(|info| info.timestamp = …)`.

---

## Environment Variables

| File | Variable | Purpose |
|---|---|---|
| `server/.env` | `GEMINI_API_KEY` | Required — Google Gemini API |
| `server/.env` | `ETHERFUSE_API_KEY` | Required — Etherfuse Ramp API key (raw key, no `Bearer` prefix) |
| `server/.env` | `ETHERFUSE_BASE_URL` | Default `https://api.sand.etherfuse.com` (sandbox). Use `https://api.etherfuse.com` for production |
| `server/.env` | `PORT` | Default 3000 |
| `server/.env` | `CORS_ORIGIN` | Default `http://localhost:5173`. Comma-separated list of allowed origins for CORS |
| `web/.env` | `VITE_API_URL` | Default `http://localhost:3000` |

---

## Code Style

- **TypeScript strict mode** in both `server/` and `web/`.
- **Prettier**: no semicolons, single quotes, trailing commas (ES5), 100-char width.
- **Server imports**: no file extensions (e.g. `from './config'`) — `commonjs` module, TypeScript resolves `.ts` files automatically.
- **Husky pre-commit**: runs `lint` + `typecheck` in both `server/` and `web/`.
- **Rust**: `rustfmt` max_width 100, 4-space tabs; Clippy `-D warnings`.
- **No abbreviations in variable/parameter names**: use full words (e.g. `message` not `msg`, `error` not `err`, `request` not `req`, `response` not `res`, `index` not `idx`, `parameter` not `param`).
- **Blank line before `return`**: always leave one blank line before a `return` statement unless it is the very first statement in a block.
- **Trailing newline**: every file must end with a single blank line (newline character at EOF).
- **Arrow functions for components and routes**: use `export const Name = () => {}` — never `export function`. Applies to React components (`web/`) and Fastify route handlers (`server/`). Hooks use `export function useHook() {}` (regular function declaration).
- **Tailwind size shorthand**: when width and height are equal, use `size-*` instead of `w-* h-*` (e.g. `size-4` not `w-4 h-4`).
- **Accessibility**: always apply ARIA attributes where visible text alone is insufficient. Key patterns: `aria-label` on interactive elements whose purpose isn't clear from content (icon-only buttons, ambiguous controls); `aria-hidden="true"` on decorative elements (icons, illustrations); `alt` with meaningful text on informative images, `alt=""` on decorative ones; prefer semantic HTML over ARIA roles — only reach for `role` when no native element fits.
- **Input labels**: every `<input>` and `<textarea>` must have either an associated `<label>` (via `htmlFor`/`id`) or an `aria-label` attribute. Never render a bare input without one.
- **Semantic HTML**: always use the most specific semantic element available (`<main>`, `<header>`, `<nav>`, `<section>`, `<article>`, `<aside>`, `<footer>`, `<h1>`–`<h6>`, `<p>`, `<ul>`, `<ol>`, `<li>`, `<button>`, `<a>`, `<table>`, etc.). Reserve `<div>` and `<span>` exclusively for layout or styling containers that carry no semantic meaning.
- **File naming conventions**: applies across `web/`, `server/`, and `shared/`. Components use PascalCase (e.g. `FileUpload.tsx`, `Button.tsx`). Helper classes use PascalCase (e.g. `FileHelper.ts`, `StringHelper.ts`). Everything else — services, routes, schemas, stores, hooks, types, config, and utilities — uses kebab-case (e.g. `ai-service.ts`, `upload-route.ts`, `payment-schema.ts`, `use-payments-store.ts`, `use-debounce.ts`).
- **TanStack Query hook naming**: hooks wrapping `useQuery` must end with `Query` in the function name and `-query` in the file name (e.g. `useUsersQuery` in `use-users-query.ts`). Hooks wrapping `useMutation` must end with `Mutation` and `-mutation` (e.g. `useUploadMutation` in `use-upload-mutation.ts`). This makes the data-fetching role unambiguous at a glance.
- **Kebab-case for asset files**: all static assets — images, icons, SVGs, fonts — must be named in kebab-case (e.g. `upload-icon.svg`, `logo-dark.png`). No camelCase, PascalCase, or underscores in file names.
- **Icon file suffix**: all icon files must end with `-icon` (e.g. `upload-icon.svg`, `loading-spinner-icon.svg`, `empty-state-icon.svg`).
- **Responsive design**: all UI must work on mobile, tablet, and desktop. Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`) — mobile-first. No fixed pixel widths on layout containers; prefer `w-full`, `max-w-*`, or fluid units. Touch targets must be at least 44×44px.
- **Object shorthand**: when an object property key matches its value variable name, use shorthand — `{ token }` not `{ token: token }`. Enforced via ESLint `object-shorthand` rule.
- **Ellipsis character**: always use the correct Unicode ellipsis `…` (U+2026), never three dots `...`. Applies to all user-facing strings, translations, placeholders, and prompts.
- **Middle truncation for addresses**: always use `StringHelper.truncateMiddle()` to truncate blockchain addresses (e.g. `GABCD…WXYZ`). Never use CSS `truncate` or start/end ellipsis on addresses — both ends carry meaningful information.
- **Form element wrapping**: components that contain `<input>`, `<select>`, or other form controls must wrap them in a `<form>` element. Use `onSubmit={event => event.preventDefault()}` when form submission is handled programmatically. Reusable primitives (e.g. `Input.tsx`, `Select.tsx`) are excluded — the wrapping `<form>` belongs in the parent component.
- **Translation key cleanup**: when a `t('key')` call is removed from JSX/TSX, the key may still exist in the locale JSON files. After removing any `t()` call, run `npx i18next-cli status` inside `web/` to check for unused keys. Unused keys found there are safe to delete from `src/locales/{locale}/{namespace}.json`. TypeScript typed translations (`src/types/i18next.d.ts`) will catch compilation errors if a key is referenced in code but missing from the JSON.
- **Disabled element styles**: use only `disabled:opacity-50` for disabled interactive elements — never add `disabled:cursor-not-allowed` inline. Cursor behavior for disabled elements is managed globally in `src/assets/css/styles.css`. All disabled interactive elements must use the same opacity class to stay visually consistent.
