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

---

## Commands

### Server (`cd server`)

```bash
npm install               # installs deps; postinstall runs `prisma generate`
cp .env.example .env      # then set GEMINI_API_KEY and DATABASE_URL
npm run dev               # tsx watch — hot reload
npm run build             # tsc → dist/
npm run lint              # ESLint and Prettier
npm run typecheck         # tsc --noEmit
npm run db:up             # docker compose up -d (MariaDB on :3306)
npm run db:down           # docker compose down
npm run db:migrate        # prisma migrate dev — create + apply a migration
npm run db:deploy         # prisma migrate deploy — apply pending migrations (CI/prod)
npm run db:generate       # prisma generate — regenerate client after schema edits
npm run db:studio         # open Prisma Studio
npm run db:seed           # tsx prisma/seed.ts
npm run db:reset          # prisma migrate reset (DROPS the database)
```

After editing `server/prisma/schema.prisma`, run `npm run db:generate` in `server/` (or `npm install` — `postinstall` triggers it) before `tsx watch` will see new model types.

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
auth gate (router beforeLoad, see Web internals → Routing)
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

### Server internals

- **`src/helpers/EnvHelper.ts`** — Zod-validated env; process exits immediately if `GEMINI_API_KEY` or `ETHERFUSE_API_KEY` is missing. `ETHERFUSE_BASE_URL` defaults to the sandbox.
- **`src/helpers/FileHelper.ts`** — Dispatch by MIME type + extension. CSV → JSON string; XLSX/XLS → CSV string per sheet; PDF → raw text; TXT → utf-8 passthrough.
- **`src/services/ai-service.ts`** — Single `analyze(content, { token })` call. Sends the file content to Gemini and returns `{ payments, price }`. Each payment is `{ id, amount, description }` where `amount` is the FIAT value from the file. `price` is the FIAT → on-chain-token conversion factor as a 7-decimal string: for TESOURO, `fetchTesouroPerUsdcPrice() × fetchUsdPerBrlPrice()` (BigNumber, capped via `StringHelper.formatAmount`); for USDC, `1`. Model is `gemini-3.1-flash-lite`. JSON is extracted with a regex fallback (`/\{[\s\S]*\}/`) in case the model adds surrounding text despite the system prompt. AI is instructed to:
  - Extract ONLY `{ amount, description }` per row — never addresses (the destination is provided separately and is global to the upload).
  - NEVER convert currencies — return amounts in the file's FIAT as-is. If file currency doesn't match expected FIAT (BRL for TESOURO, USD for USDC), return `{ payments: [] }`.
  - Treat bare numbers (e.g. `42,90` or `58.22`) as already-denominated in the expected FIAT for the selected token.
- **`src/services/chat-service.ts`** — Conversational AI agent. `processChat(input)` takes the full message history, available destinations, current payments, and allocations. Builds a context block injected into the Gemini system prompt each call. If `filePayments` are passed (from `/chat` route's file processing), they override AI-parsed payments. Returns `TChatResponse` with `action` field driving client state transitions.
- **`src/routes/chat-route.ts`** — `POST /chat` accepts multipart with `messages` (JSON string), `context` (JSON string with destinations/payments/allocations/language), and an optional `file`. If a file is present and valid, processes it through `FileHelper` + `analyze()` first, then passes results to `chat-service`. Returns `TChatResponse`.
- **`src/services/prices-service.ts`** — Pure I/O. `fetchUsdPerBrlPrice()` calls AwesomeAPI (`https://economia.awesomeapi.com.br/json/last/USD-BRL`); `fetchTesouroPerUsdcPrice()` queries Stellar Horizon orderbook. Both return `BigNumber` and throw typed `ErrorCode` (`RATE_FETCH_FAILED` / `ORDERBOOK_FETCH_FAILED`) on any failure — never falls back to 1:1. Called by `ai-service.ts` during `analyze` (TESOURO only) to compute the upload-time `price`.
- **`src/services/etherfuse-service.ts`** — Thin wrapper around the Etherfuse Ramp REST API built on a pre-configured `axios` instance (same version `1.7.2` as the web client). Auth header is the raw key (no `Bearer` prefix), set on the axios instance once at module load. Generates partner-side UUIDs for `customerId` / `bankAccountId` / `quoteId` / `orderId`. Exposes `createOnboarding`, `getKycStatus`, `registerBankAccount`, `createQuote`, `createOrder`, `getOrder`, `simulateFiatReceived`. Network/HTTP errors are normalised to `ErrorCode.ETHERFUSE_REQUEST_FAILED`; 404 on order paths maps to `ErrorCode.ORDER_NOT_FOUND`. Quote `sourceAsset` is always `BRL`; `targetAsset` is `TESOURO:GCRYUGD5...`.
- **`src/services/etherfuse-webhook-store.ts`** — In-memory cache (`Map`) of the most recent webhook event per `${event}:${id}` key (e.g. `order_updated:abc-123`). Records the event status, the full data payload and the originating timestamp. Used by the webhook receiver and available for future short-circuiting of polling.
- **`src/routes/etherfuse-route.ts`** — Proxies the Etherfuse flow so the API key never reaches the browser. Endpoints: `POST /etherfuse/onboarding`, `GET /etherfuse/kyc/:customerId/:publicKey`, `POST /etherfuse/bank-account`, `POST /etherfuse/quote`, `POST /etherfuse/order`, `GET /etherfuse/order/:orderId`, `POST /etherfuse/order/:orderId/simulate` (sandbox only), `POST /etherfuse/webhook` (receives Etherfuse webhook events — `order_updated` / `kyc_updated` / etc. — validates the payload, logs through Fastify and stores in `etherfuse-webhook-store`). All routes validate the public key with `StellarHelper.isValidAddress` where applicable and return `{ success: false, error: ErrorCode }` shapes for failures.
- **Auth model is stateless JWT** (Bearer token, not cookies). The token is delivered to the SPA via an **authorization-code + PKCE exchange**, never in a URL fragment: the OAuth callback hands back a short-lived one-time `code` in a query param, the SPA POSTs `{ code, verifier }` to `/auth/exchange`, and the server signs the 7-day HS256 JWT there (so the 7-day clock starts at exchange, not at the Google callback). The SPA stores it in `localStorage` (`fractapay.token`) and sends it as `Authorization: Bearer …` on every API call. There is no server-side session store — `requireAuth` verifies the signature in-process. `@fastify/cookie` is registered both because `@fastify/oauth2` uses it for the `state`/PKCE round-trip with Google AND because the PKCE-exchange flow stashes the SPA's `code_challenge` in a signed `fractapay_pkce` cookie across the Google redirect (see auth-route + the root `onRequest` hook in `index.ts`). The cookie scheme for *app auth* (signed `fractapay_session` + `Session` table) was removed.
- **`src/hooks/require-auth.ts`** — Fastify `preHandler`s. `requireAuth` calls `request.jwtVerify<TJwtPayload>()` (payload `{ sub, email }`); on failure replies `401 UNAUTHORIZED`. On success it does a single `findUserById(payload.sub)` (canonical row, so avatar/name edits propagate) — replies `401 SESSION_EXPIRED` if the user is gone — then decorates `request.user` (TUser). `optionalAuth` does the same but never replies. The `FastifyJWT` interface is module-augmented here (`payload: TJwtPayload`, `user: TUser`) so `request.jwtVerify()` and `request.user` are typed — do NOT also declare `FastifyRequest { user }`, it collides (TS2717).
- **`@fastify/jwt` registration** (`src/index.ts`) pins `sign: { algorithm: 'HS256', iss: 'fractapay-server' }` and `verify: { algorithms: ['HS256'], allowedIss: 'fractapay-server', clockTolerance: 30 }`. Signing secret is `EnvHelper.SESSION_SECRET` (shared with the cookie plugin). CORS no longer sets `credentials: true`; `allowedHeaders` is explicit (`Content-Type`, `Authorization`, `Accept-Language`) — add to that list if a new request header is introduced.
- **`src/routes/auth-route.ts`** — `GET /auth/google` is registered automatically by `@fastify/oauth2` (as `startRedirectPath`) and kicks off the authorization-code + PKCE flow with Google. **A root-level `onRequest` hook in `index.ts`** (root because oauth2 owns `/auth/google` — an encapsulated plugin hook won't fire for it) reads the SPA's `?cc=<challenge>` and stashes it in a signed, httpOnly, SameSite=Lax `fractapay_pkce` cookie (`path: /auth`, 10-min maxAge) so the challenge survives the Google round-trip. `GET /auth/google/callback` exchanges the Google code for tokens, fetches userinfo, upserts the user, reads + unsigns the `fractapay_pkce` cookie (redirects to `WEB_LOGIN_FAILURE_URL` if absent), mints a one-time `code` via `createAuthCode({ userId, email, challenge })`, clears the cookie, sets `Cache-Control: no-store`, and redirects to `WEB_LOGIN_SUCCESS_URL?code=<code>` (query param, **not** a `#token` fragment — the JWT is never put in any URL). `POST /auth/exchange` (no auth) takes `TExchangePayload { code, verifier }`: `consumeAuthCode(code)` (single-use + TTL), `PkceHelper.verifyChallenge(verifier, challenge)`, then `reply.jwtSign` the 7-day JWT and return `TExchangeResult { success, token }`; bad shape → `400 INVALID_PAYLOAD`, bad/expired code or mismatched verifier → `400 INVALID_AUTH_CODE`. `POST /auth/logout` (uses `optionalAuth`) is a no-op success (stateless — the client wipes its own `localStorage`; there is nothing to revoke server-side). `GET /auth/me` requires `requireAuth` and returns `{ user: TUser }`. `POST /auth/onboarding` requires `requireAuth`, takes `TCompleteOnboardingPayload { companyName }` (400 `INVALID_PAYLOAD` if blank), calls `markOnboardingCompleted(userId, companyName)` to stamp `onboardingCompletedAt = now`, and returns the refreshed `{ user: TUser }`. `POST /auth/signup` is a placeholder that replies `501 NOT_IMPLEMENTED` (Google OAuth is the only real path for now).
- **`src/services/auth-code-store.ts`** — In-memory `Map` of pending one-time auth codes for the PKCE exchange. `createAuthCode({ userId, email, challenge })` returns a `randomBytes(32).base64url` code with a 60s TTL; `consumeAuthCode(code)` deletes on read (single-use) and returns `null` if absent or expired. Single server instance + seconds-long TTL = restart-loss is harmless, no DB needed.
- **`src/helpers/PkceHelper.ts`** — `verifyChallenge(verifier, challenge)` computes `sha256(verifier)` base64url and compares to the stored challenge with `timingSafeEqual` (length-guarded). This is the S256 PKCE check for the SPA↔server exchange leg (distinct from oauth2's own PKCE with Google).

### Web internals

- **Routing** — TanStack Router (`src/router/index.tsx`) defines a root route and an `id: 'auth'` pathless layout route (renders `RootLayout`, enforces session auth). Auth-protected routes: `/chat` (ChatPage), `/payments` (PaymentsListPage — order history), `/destinations` (DestinationsPage — recipients CRUD), `/profile` (ProfilePage — editable display name), `/payment/$orderId` (PaymentPage — receipt). `/` redirects to `/chat`. Public routes: `/login`. TypeScript type paths for auth-nested routes use the `/auth/` prefix (e.g. `useParams({ from: '/auth/payment/$orderId' })`); `to` in `navigate()` uses the URL path without prefix.
- **Auth & onboarding pages/hooks** — `LoginPage` renders `SignInButton` (sets `window.location.href = ${API_URL}/auth/google` to start OAuth) plus a "Sign Up" button wired to `useSignupMutation` (POST `/auth/signup` → 501, placeholder). `OnboardingPage` collects `companyName` + optional `cnpj` (`onboarding-schema.ts`) but submits only `companyName` via `useCompleteOnboardingMutation` (POST `/auth/onboarding`). `useUserQuery` (`use-user-query.ts`) wraps `GET /auth/me` with a 5-min stale time; `useLogoutMutation` clears the token + stores.
- **State** — `src/hooks/use-payments-store.ts` (Zustand) holds `payments: TPayment[]`, `token: TToken`, `price: string`, `address: string`, `hasPayments`, plus actions `setPayments` / `mergePayments` / `addPayment` / `updatePayment` / `deletePayment` / `setToken` / `setPrice` / `setAddress`. Payments are deduplicated by `id` on every mutation. **`TPayment` is `{ id, amount, description? }`** where `amount` is the **BRL** value — no per-row address or token; the destination address and token are global to the upload. `address` is populated after a successful upload so `ReviewModal` can read it. See also `TDestination` for the named destination model.
- **Destinations state** — `src/hooks/use-destinations-store.ts` (Zustand + `persist` middleware, key `fractapay.destinations`) holds `destinations: TDestination[]` with actions `addDestination` / `updateDestination` / `deleteDestination`. Persisted to localStorage. Each destination has `id`, `name` (max 200 chars), `token`, `pixKey`, `pixKeyType`.
- **Chat state** — `src/hooks/use-chat-store.ts` (Zustand, not persisted) holds the active conversation: `messages: TChatMessage[]`, `payments: TPayment[]`, `price: string`, `allocations: TDestinationAllocation[]`, `summary: TPaymentSummaryItem[]`, `isProcessing: boolean`, `draftMessage: string`. Reset on `execute` completion. `useChatMutation` (TanStack Query) posts to `POST /chat` with full history + context.
- **Conversation store** — `src/hooks/use-conversation-store.ts` (Zustand + `persist`, key `fractapay.conversations`) saves completed conversations: `id`, `title` (auto-generated from date + amount), `payments`, `allocations`, `summary`, `orderId?`, `orderStatus?`, `totalAmount?`, `createdAt`, `updatedAt`. Powers both the sidebar recent-conversations list and the PaymentsListPage order history.
- **Etherfuse state** — `src/hooks/use-etherfuse-store.ts` (Zustand + `persist` middleware, key `fractapay.etherfuse`) holds `customerId`, `bankAccountId`, `presignedUrl`, `publicKey`. Persistence is intentional: after the user finishes KYC and returns to the app, the customer/bank-account IDs survive a page reload so we don't restart onboarding.
- **Data fetching** — Etherfuse hooks: `use-onboarding-mutation.ts`, `use-kyc-status-query.ts` (polls every 5s until `approved` or `rejected`), `use-quote-mutation.ts`, `use-order-mutation.ts`, `use-order-query.ts` (polls every 5s until the order reaches a terminal status).
- **Form validation** — Zod schemas in `src/schemas/`. `fileUploadSchema` requires a valid Stellar address via `StellarHelper.isValidAddress`. `paymentEditSchema` has `amount` (BigNumber > 0) and `description` (max 200).
- **Display formatting** — `StringHelper.formatCurrencyAmount(amount, token)` (in `shared/`) formats amounts as `R$ 152,56` for TESOURO using `Intl.NumberFormat` + `SYMBOL_BY_TOKEN` post-processing. Display is fixed at 2 decimals; the stored value keeps full `STELLAR_DECIMALS` precision. Use `StringHelper.formatAmount` (accepts `string | number | BigNumber`) whenever a value is about to cross the network boundary (server↔web) — it caps at `STELLAR_DECIMALS` with `ROUND_DOWN`.
- **Reusable primitives** — `Modal.tsx` wraps `@radix-ui/react-dialog`; `Accordion.tsx` wraps `@radix-ui/react-accordion`; `CountdownRing.tsx` renders the quote-expiry ring; `PixInstructions.tsx` renders QR + copy-and-paste PIX code with pending-order banner when `isRecovered=true`; `Skeleton.tsx` renders animated loading placeholders; `RightPanel.tsx` is a thin wrapper over `SidebarPanel` (side=right, max-w-sm) — payments list or allocations detail; `UserAvatar.tsx` renders a user photo or initial-letter fallback; `ChatMessage.tsx` renders one chat bubble with avatar, file attachment, summary table, and timestamp; `ChatInput.tsx` renders the chat input area (suggestions chips, file preview, textarea, send button); `ChatPaymentsBar.tsx` renders the payments count bar and order-executed banner; `ChatThinking.tsx` renders the AI "…" typing indicator; `ChatSuggestions.tsx` renders the 4 example chips that fade out after the first user message; `DaySeparator.tsx` renders a date divider between messages from different days; `SidebarPanel.tsx` is the base for all sliding panels — handles overlay backdrop, slide animation, focus trap, Escape key, and `inert` management. Props: `open`, `onClose`, `ariaLabel`, `side` (`left|right`), `staticOnDesktop` (sticky on `lg:`, overlay on mobile), `panelClassName`, `header`, `children`, `footer`. `SidebarPanelHeader` is a convenience sub-component for the standard title+close header; `ChatSidebar.tsx` uses `SidebarPanel` (side=left, staticOnDesktop=true, w-64) — conversation list, new-conversation button with warning modal guard; `EmptyState.tsx` renders the standard empty-state layout (icon + title + optional description + optional action) — used in PaymentsPage and DestinationsPage; `ConversationWarningModal.tsx` (in `modals/`) warns before overwriting an unsaved new conversation — only shown when `activeConversationId === null` and user has sent messages.
- **Constants** — `web/src/constants/order-status.ts` exports `ORDER_STATUS_CLASSES` (a `Record<TOrderStatus, string>` mapping each status to Tailwind badge classes) — used by both `PaymentsPage` and `PaymentPage`.
- **i18n** — `src/i18next/index.ts` initialises i18next with bundled JSON (`en-US` / `pt-BR`). Language toggle is in `Footer.tsx`. TypeScript-typed translations in `src/types/i18next.d.ts`.
- **API client** — `src/services/server.ts` creates a single axios instance with `baseURL` from `VITE_API_URL`. A request interceptor injects `Accept-Language` and, when present, `Authorization: Bearer <localStorage['fractapay.token']>`. A response interceptor wipes the stored token on a `401` **only** when the request URL starts with `/auth/` or the response body's `error` is `UNAUTHORIZED` / `SESSION_EXPIRED` — so a proxied upstream 401 (e.g. Etherfuse) doesn't log the user out. No `withCredentials` (auth is Bearer, not cookies).
- **Auth token lifecycle (web)** — `SignInButton` starts login: it generates a PKCE `verifier` (`src/helpers/pkce.ts` — `generateVerifier` + `computeChallenge`, native `crypto.getRandomValues`/`crypto.subtle`), saves the verifier in `sessionStorage` (`PKCE_VERIFIER_STORAGE_KEY`), and navigates to `${API_URL}/auth/google?cc=<challenge>`. After OAuth, `exchangeCodeFromQuery()` (`src/helpers/auth-token.ts`) is `await`ed once from `src/index.tsx` at bootstrap **before** `createRoot`/render — the await matters because the exchange is a network POST and the token must be in `localStorage` before the first route guard fires `/auth/me` (the old fragment capture was synchronous; this is not). It reads `?code=` from the query, reads the verifier from sessionStorage, POSTs `{ code, verifier }` to `/auth/exchange`, stores the returned JWT under `AUTH_TOKEN_STORAGE_KEY` (`fractapay.token`), then always clears the verifier and strips the query via `replaceState`. Guarded against session-fixation — exchange is skipped (and query stripped) if a token already exists, the landing isn't trusted, or the verifier is missing: `isTrustedLanding()` accepts the app root (`ROOT_PATHS`, derived from `BASE_PATH` — `/` in dev, `/S37` + `/S37/` in prod) or a `document.referrer` whose origin === `VITE_API_URL` origin. `useLogoutMutation` POSTs `/auth/logout` (best-effort) then `localStorage.removeItem` the token and resets the stores.

### Shared internals (`shared/` — imported as `fractapay-shared`)

- **Types** — `TToken = 'TESOURO'`; `TLanguage = 'en-US' | 'pt-BR'`; `TFiatCurrency = 'BRL'`; `TPixKeyType = 'evp' | 'cpf' | 'cnpj' | 'email' | 'phone'`; `TPayment = { id, amount, description? }`; `TPaymentResponse = { payments, price }`; `TUploadPayload = { file, token, address? }` (address optional — destination is selected separately); `TUploadResult = { success, payments, price, error? }`; `TRecipientShare = { address, percentage }`; `TDestination = { id, name, token, pixKey, pixKeyType }` (no `stellarAddress` — the global address comes from `usePaymentsStore`); `TDestinationAllocation = { destination: TDestination, percentage: number }`; `TChatMessage`, `TChatRequest`, `TChatResponse`, `TChatHistoryMessage`, `TChatAction` (includes `update_payments` with delta `add | remove` per item), `TPaymentSummaryItem = { destinationName, token, amount, percentage, feeAmount?, totalAmount? }` (server computes `feeAmount` and `totalAmount` from `FEE_PERCENTAGE`; `token` derived from `allocation.destination.token`). **Etherfuse types**: `TKycStatus`, `TOnboardingPayload`/`TOnboardingResult`, `TKycStatusResult`, `TBankAccountPayload`/`TBankAccountResult`, `TQuotePayload`/`TQuoteResult`, `TOrderPayload`/`TOrderResult` (with `pix?: TPixInstructions`), `TPixInstructions`, `TOrderStatus = 'created' | 'funded' | 'completed' | 'failed' | 'refunded' | 'canceled'`. **Auth types**: `TUser = { id, email, name: string | null, picture: string | null, onboardingCompletedAt: string | null }` (`picture` maps from the DB `avatarUrl`; `onboardingCompletedAt` is an ISO string or null); `TAuthMeResult = { success: true; user: TUser } | { success: false; error: ErrorCode }`; `TCompleteOnboardingPayload = { companyName }`; `TExchangePayload = { code, verifier }` and `TExchangeResult = { success: true; token } | { success: false; error: ErrorCode }` (the PKCE code→JWT exchange). `ErrorCode` enum adds: `INVALID_PAYLOAD`, `ETHERFUSE_REQUEST_FAILED`, `KYC_NOT_APPROVED`, `QUOTE_EXPIRED`, `ORDER_NOT_FOUND`, `PENDING_ORDER_EXISTS`, `CUSTOMER_ALREADY_EXISTS`, `CUSTOMER_NOT_FOUND`, `FILE_PARSE_FAILED`, `NO_PAYMENTS_FOUND`, `UNAUTHORIZED`, `SESSION_EXPIRED`, `OAUTH_FAILED`, `INVALID_AUTH_CODE`, `NOT_IMPLEMENTED`.
- **Constants** — `ALLOWED_EXTENSIONS`, `ALLOWED_MIME_TYPES`, `ALLOWED_INPUT_ACCEPT`, `SUPPORTED_TOKENS`, `STELLAR_DECIMALS = 7`, `FIAT_BY_TOKEN = { TESOURO: 'BRL' }`, `LANGUAGE_BY_TOKEN`, `SYMBOL_BY_TOKEN = { TESOURO: 'R$' }`, `RECIPIENT_PERCENTAGE = BigNumber('0.15')`, `FEE_PERCENTAGE = BigNumber('0.02')`, `QUOTE_EXPIRY_SECONDS = 60`.
- **Helpers** — `StellarHelper.isValidAddress(value)` (wraps `StrKey.isValidEd25519PublicKey`). `StringHelper.truncateMiddle(value, max)`, `StringHelper.formatAmount(value)` (accepts `string | number | BigNumber`, Stellar 7-decimal cap with `ROUND_DOWN`), `StringHelper.formatCurrencyAmount(value, token)` (locale + symbol via `Intl.NumberFormat`, fixed at 2 decimals for display).

### Server DB layer

- **Schema** — `server/prisma/schema.prisma` uses `provider = "mysql"` (Prisma's MariaDB-compatible driver). `DATABASE_URL` is read from `server/.env` for both Prisma CLI and runtime. Note: `@db.Json` columns are stored as `LONGTEXT` on MariaDB.
- **Auth models** — `User` (id cuid, unique email, optional `emailVerified` / `name` / `avatarUrl` / `companyName` / `onboardingCompletedAt`); `OAuthAccount` (FK `userId`, `provider` + `providerAccountId` uniquely identifies the IdP identity — Google `sub` for now — plus the cached `accessToken` / `refreshToken` / `idToken` / `expiresAt`, all `@db.Text`). `OAuthAccount` has `@@unique([provider, providerAccountId])` so the same Google account can't be attached to two users. There is no `Session` model — auth is stateless JWT (see Server internals). The cached `refreshToken` / `idToken` are written but not currently read after login.
- **Client** — `server/src/services/prisma-service.ts` exports a `PrismaClient` singleton cached on `globalThis` so `tsx watch` reloads don't open new connection pools, and re-exports everything from `@prisma/client` (`export * from '@prisma/client'`) so consumers can import model types (`User`, `OAuthAccount`) and the `Prisma` namespace (for `Prisma.PrismaClientKnownRequestError` etc.) from the same file. User-row helpers live in `server/src/services/user-service.ts` (`findUserById`, `mapUserToTUser`, `upsertGoogleUser`, `markOnboardingCompleted`).
- **Local dev** — `docker compose up -d` in `server/` brings up `mariadb:11` on `:3306` (db `fractapay`, user/pass `fractapay`/`fractapay`). `npm run db:migrate` creates a timestamped migration; `npm run db:seed` runs `prisma/seed.ts`. `postinstall` runs `prisma generate`, so a fresh `npm install` always has a usable client.
- **Production (Fly.io)** — see the dedicated section below.

### Production deployment (Fly.io)

Two Fly apps in the same org, region `gru`:

- **`fractapay-server`** — Node/Fastify app. Root `fly.toml`, root `Dockerfile`. Connects to the DB at `fractapay-mariadb.internal:3306` over Fly's private 6PN network.
- **`fractapay-mariadb`** — `mariadb:11`. Config in `infra/mariadb/` (`Dockerfile`, `fly.toml`, `my.cnf`). No `[http_service]` — private only. A `mariadb_data` volume mounts `/var/lib/mysql`. `my.cnf` sets `bind-address = ::` so the daemon accepts the IPv6 connections that arrive over 6PN.

**Production image extras (server).** `Dockerfile` runtime stage installs `openssl` (`apk add --no-cache openssl`) for Prisma's query engine on Alpine, and `COPY`s `server/prisma/` into the image so the schema and migrations ship with the build. `prisma` lives in `dependencies` (not devDeps) so `npm prune --omit=dev` doesn't drop the CLI.

**Migrations.** Root `fly.toml` defines `[deploy] release_command = 'npx prisma migrate deploy'`. Fly runs the release command in a one-off machine built from the same image, **before** rolling new server machines. A failed migration aborts the deploy.

#### First-time provisioning

Run from the repo root. `fly auth whoami` should already show you logged in.

```bash
# 1. DB app + persistent volume.
fly apps create fractapay-mariadb
fly volumes create mariadb_data --region gru --size 3 -a fractapay-mariadb

# 2. Generate passwords and set them BEFORE the first deploy.
#    The mariadb:11 image only creates MARIADB_USER on first boot when
#    /var/lib/mysql is empty — set secrets late and the user is never created.
ROOT_PW=$(openssl rand -hex 24)
APP_PW=$(openssl rand -hex 24)
fly secrets set MARIADB_ROOT_PASSWORD="$ROOT_PW" MARIADB_PASSWORD="$APP_PW" -a fractapay-mariadb

# 3. Deploy MariaDB. Build context must be infra/mariadb/ — `fly deploy` uses cwd,
#    so cd in (or pass the path positional). `-c path/fly.toml` alone leaves the
#    build context at repo root and the `COPY my.cnf` step fails.
cd infra/mariadb && fly deploy && cd -
# Equivalent: fly deploy infra/mariadb

# 4. Wire the server to the DB.
fly apps create fractapay-server   # skip if it already exists
fly secrets set \
  DATABASE_URL="mysql://fractapay:$APP_PW@fractapay-mariadb.internal:3306/fractapay" \
  -a fractapay-server
# Set the other server secrets too (GEMINI_API_KEY, ETHERFUSE_API_KEY,
# SESSION_SECRET, GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET, etc.).

# 5. Deploy the server. release_command applies pending migrations first.
fly deploy
```

#### Routine deploys

```bash
fly deploy                  # server. Migrations run automatically.
fly deploy infra/mariadb    # DB image / config changes only.
```

#### Running Prisma manually against the Fly DB (no server deploy needed)

Open a WireGuard tunnel and run Prisma locally. Works without the server app even existing.

```bash
# Terminal 1 — keep open. Tunnels localhost:3306 to fractapay-mariadb.internal:3306.
fly proxy 3306 -a fractapay-mariadb

# Terminal 2 — from server/. Inline DATABASE_URL beats the local .env shadow.
cd server
DATABASE_URL="mysql://fractapay:$APP_PW@127.0.0.1:3306/fractapay" \
  npx prisma migrate deploy        # or: npm run db:seed, db:studio, migrate status
```

Local `:3306` collision? Use `fly proxy 3307:3306 -a fractapay-mariadb` and switch the URL host to `127.0.0.1:3307`.

#### Health checks

```bash
fly status -a fractapay-mariadb                 # machine started, volume attached
fly logs -a fractapay-mariadb | tail -50        # expect "ready for connections"
fly ssh console -a fractapay-mariadb \
  -C "healthcheck.sh --connect --innodb_initialized"   # exit 0 = healthy
```

#### Troubleshooting

- **`P1000: Authentication failed`** — usually one of: (a) literal `<APP_PW>` placeholder still in the URL; (b) `.env` shadowed your shell var (use inline `DATABASE_URL=… npx prisma …`, not a separate `export`); (c) volume was created before the DB secrets, so MariaDB initialized without the app user. Test root login through the proxy; if root works but `fractapay` doesn't, `ALTER USER 'fractapay'@'%' IDENTIFIED BY '<APP_PW>'; FLUSH PRIVILEGES;`. If even root fails, the volume was init'd empty — destroy the machine, destroy the volume, recreate the volume, confirm `fly secrets list` shows the passwords, redeploy.
- **`failed to calculate checksum of ref … "/my.cnf"`** — you ran `fly deploy -c infra/mariadb/fly.toml` from the repo root. Build context = cwd. Fix: `cd infra/mariadb && fly deploy` (or `fly deploy infra/mariadb`).
- **Prisma engine error about `libssl`** — the runtime image is missing `openssl`. Should already be installed by `apk add --no-cache openssl` in `Dockerfile`; check the layer didn't get skipped.

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
| `server/.env` | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Required — Google OAuth credentials registered with `@fastify/oauth2` |
| `server/.env` | `OAUTH_CALLBACK_URL` | Default `http://localhost:3000/auth/google/callback`. Must match the redirect URI registered in Google Cloud Console |
| `server/.env` | `WEB_BASE_URL` | Default `http://localhost:5173`. Base of the web app; default for the login redirect URLs below |
| `server/.env` | `WEB_LOGIN_SUCCESS_URL` | Default `${WEB_BASE_URL}`. Where `/auth/google/callback` redirects after a successful login. **Must include the SPA base path in prod** (e.g. `https://host/S37/`) — `exchangeCodeFromQuery`'s `isTrustedLanding()` only runs the PKCE code→token exchange when the landing pathname matches the SPA base path (`/S37` in prod, `/` in dev); a path mismatch makes login **silently fail** |
| `server/.env` | `WEB_LOGIN_FAILURE_URL` | Default `${WEB_BASE_URL}/?login=failed`. Redirect target on OAuth callback failure |
| `server/.env` | `SESSION_SECRET` | Required, ≥32 chars. HS256 secret for `@fastify/jwt` (signs the Bearer token); also the `@fastify/cookie` secret for the OAuth state/PKCE cookie |
| `server/.env` | `DATABASE_URL` | Required — MariaDB connection string; consumed by both Prisma CLI (`migrate`, `seed`, `studio`) and the runtime PrismaClient |
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
- **Use reusable component primitives**: Never use raw `<button>` or `<input>` elements — always use the `Button` or `Input` components (or other established reusable primitives). Raw HTML interactive elements bypass variant, size, and accessibility defaults.
- **Unused translations and files**: After removing any `t('key')` call, run `npx i18next-cli status` inside `web/` to find orphaned keys and delete them from the locale JSON files. After removing an import or asset, verify nothing else references it before deleting the file.
- **Middle truncation for addresses**: always use `StringHelper.truncateMiddle()` to truncate blockchain addresses (e.g. `GABCD…WXYZ`). Never use CSS `truncate` or start/end ellipsis on addresses — both ends carry meaningful information.
- **Form element wrapping**: components that contain `<input>`, `<select>`, or other form controls must wrap them in a `<form>` element. Use `onSubmit={event => event.preventDefault()}` when form submission is handled programmatically. Reusable primitives (e.g. `Input.tsx`, `Select.tsx`) are excluded — the wrapping `<form>` belongs in the parent component.
- **Translation key cleanup**: when a `t('key')` call is removed from JSX/TSX, the key may still exist in the locale JSON files. After removing any `t()` call, run `npx i18next-cli status` inside `web/` to check for unused keys. Unused keys found there are safe to delete from `src/locales/{locale}/{namespace}.json`. TypeScript typed translations (`src/types/i18next.d.ts`) will catch compilation errors if a key is referenced in code but missing from the JSON.
- **Disabled element styles**: use only `disabled:opacity-50` for disabled interactive elements — never add `disabled:cursor-not-allowed` inline. Cursor behavior for disabled elements is managed globally in `src/assets/css/styles.css`. All disabled interactive elements must use the same opacity class to stay visually consistent.
