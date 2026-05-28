# server/CLAUDE.md

Server package guidance. See [/CLAUDE.md](../CLAUDE.md) for project overview, monorepo map, request flow, and global code style.

## Commands

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

## Architecture

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
- **`src/routes/upload-route.ts`** — Validates token (required); `address` is optional and no longer required in the upload flow (destination address is selected separately via DestinationsPage). File validation uses both MIME type AND extension (browsers sometimes send wrong MIME for `.xls`). 10 MB file-size limit is set in `@fastify/multipart` registration. Multipart fields must come BEFORE the file in the FormData stream (`token` first, `file` last) — `@fastify/multipart` only populates `data.fields` from parts that arrive before the file.
- **`src/services/etherfuse-service.ts`** — Thin wrapper around the Etherfuse Ramp REST API built on a pre-configured `axios` instance (same version `1.7.2` as the web client). Auth header is the raw key (no `Bearer` prefix), set on the axios instance once at module load. Generates partner-side UUIDs for `customerId` / `bankAccountId` / `quoteId` / `orderId`. Exposes `createOnboarding`, `getKycStatus`, `registerBankAccount`, `createQuote`, `createOrder`, `getOrder`, `simulateFiatReceived`. Network/HTTP errors are normalised to `ErrorCode.ETHERFUSE_REQUEST_FAILED`; 404 on order paths maps to `ErrorCode.ORDER_NOT_FOUND`. Quote `sourceAsset` is always `BRL`; `targetAsset` is `TESOURO:GCRYUGD5...`.
- **`src/services/etherfuse-webhook-store.ts`** — In-memory cache (`Map`) of the most recent webhook event per `${event}:${id}` key (e.g. `order_updated:abc-123`). Records the event status, the full data payload and the originating timestamp. Used by the webhook receiver and available for future short-circuiting of polling.
- **`src/routes/etherfuse-route.ts`** — Proxies the Etherfuse flow so the API key never reaches the browser. Endpoints: `POST /etherfuse/onboarding`, `GET /etherfuse/kyc/:customerId/:publicKey`, `POST /etherfuse/bank-account`, `POST /etherfuse/quote`, `POST /etherfuse/order`, `GET /etherfuse/order/:orderId`, `POST /etherfuse/order/:orderId/simulate` (sandbox only), `POST /etherfuse/webhook` (receives Etherfuse webhook events — `order_updated` / `kyc_updated` / etc. — validates the payload, logs through Fastify and stores in `etherfuse-webhook-store`). All routes validate the public key with `StellarHelper.isValidAddress` where applicable and return `{ success: false, error: ErrorCode }` shapes for failures. **Webhook setup**: point the Etherfuse dashboard's webhook URL at `<public-host>/etherfuse/webhook` so order/KYC state changes are pushed in real time. The in-memory `etherfuse-webhook-store` is fine for single-instance hackathon deployment; swap in Redis or a DB before scaling to multi-instance.
- **Auth model is stateless JWT** (Bearer token, not cookies). The token is delivered to the SPA via an **authorization-code + PKCE exchange**, never in a URL fragment: the OAuth callback hands back a short-lived one-time `code` in a query param, the SPA POSTs `{ code, verifier }` to `/auth/exchange`, and the server signs the 7-day HS256 JWT there (so the 7-day clock starts at exchange, not at the Google callback). The SPA stores it in `localStorage` (`fractapay.token`) and sends it as `Authorization: Bearer …` on every API call. There is no server-side session store — `requireAuth` verifies the signature in-process. `@fastify/cookie` is registered both because `@fastify/oauth2` uses it for the `state`/PKCE round-trip with Google AND because the PKCE-exchange flow stashes the SPA's `code_challenge` in a signed `fractapay_pkce` cookie across the Google redirect (see auth-route + the root `onRequest` hook in `index.ts`). The cookie scheme for *app auth* (signed `fractapay_session` + `Session` table) was removed.
- **`src/hooks/require-auth.ts`** — Fastify `preHandler`s. `requireAuth` calls `request.jwtVerify<TJwtPayload>()` (payload `{ sub, email }`); on failure replies `401 UNAUTHORIZED`. On success it does a single `findUserById(payload.sub)` (canonical row, so avatar/name edits propagate) — replies `401 SESSION_EXPIRED` if the user is gone — then decorates `request.user` (TUser). `optionalAuth` does the same but never replies. The `FastifyJWT` interface is module-augmented here (`payload: TJwtPayload`, `user: TUser`) so `request.jwtVerify()` and `request.user` are typed — do NOT also declare `FastifyRequest { user }`, it collides (TS2717).
- **`@fastify/jwt` registration** (`src/index.ts`) pins `sign: { algorithm: 'HS256', iss: 'fractapay-server' }` and `verify: { algorithms: ['HS256'], allowedIss: 'fractapay-server', clockTolerance: 30 }`. Signing secret is `EnvHelper.SESSION_SECRET` (shared with the cookie plugin). CORS no longer sets `credentials: true`; `allowedHeaders` is explicit (`Content-Type`, `Authorization`, `Accept-Language`) — add to that list if a new request header is introduced.
- **`src/routes/auth-route.ts`** — `GET /auth/google` is registered automatically by `@fastify/oauth2` (as `startRedirectPath`) and kicks off the authorization-code + PKCE flow with Google. **A root-level `onRequest` hook in `index.ts`** (root because oauth2 owns `/auth/google` — an encapsulated plugin hook won't fire for it) reads the SPA's `?cc=<challenge>` and stashes it in a signed, httpOnly, SameSite=Lax `fractapay_pkce` cookie (`path: /auth`, 10-min maxAge) so the challenge survives the Google round-trip. `GET /auth/google/callback` exchanges the Google code for tokens, fetches userinfo, upserts the user, reads + unsigns the `fractapay_pkce` cookie (redirects to `WEB_LOGIN_FAILURE_URL` if absent), mints a one-time `code` via `createAuthCode({ userId, email, challenge })`, clears the cookie, sets `Cache-Control: no-store`, and redirects to `WEB_LOGIN_SUCCESS_URL?code=<code>` (query param, **not** a `#token` fragment — the JWT is never put in any URL). `POST /auth/exchange` (no auth) takes `TExchangePayload { code, verifier }`: `consumeAuthCode(code)` (single-use + TTL), `PkceHelper.verifyChallenge(verifier, challenge)`, then `reply.jwtSign` the 7-day JWT and return `TExchangeResult { success, token }`; bad shape → `400 INVALID_PAYLOAD`, bad/expired code or mismatched verifier → `400 INVALID_AUTH_CODE`. `POST /auth/logout` (uses `optionalAuth`) is a no-op success (stateless — the client wipes its own `localStorage`; there is nothing to revoke server-side). `GET /auth/me` requires `requireAuth` and returns `{ user: TUser }`. `POST /auth/onboarding` requires `requireAuth`, takes `TCompleteOnboardingPayload { companyName }` (400 `INVALID_PAYLOAD` if blank), calls `markOnboardingCompleted(userId, companyName)` to stamp `onboardingCompletedAt = now`, and returns the refreshed `{ user: TUser }`. `POST /auth/signup` is a placeholder that replies `501 NOT_IMPLEMENTED` (Google OAuth is the only real path for now).
- **`src/services/auth-code-store.ts`** — In-memory `Map` of pending one-time auth codes for the PKCE exchange. `createAuthCode({ userId, email, challenge })` returns a `randomBytes(32).base64url` code with a 60s TTL; `consumeAuthCode(code)` deletes on read (single-use) and returns `null` if absent or expired. Single server instance + seconds-long TTL = restart-loss is harmless, no DB needed.
- **`src/helpers/PkceHelper.ts`** — `verifyChallenge(verifier, challenge)` computes `sha256(verifier)` base64url and compares to the stored challenge with `timingSafeEqual` (length-guarded). This is the S256 PKCE check for the SPA↔server exchange leg (distinct from oauth2's own PKCE with Google).

### Server DB layer

- **Schema** — `server/prisma/schema.prisma` uses `provider = "mysql"` (Prisma's MariaDB-compatible driver). `DATABASE_URL` is read from `server/.env` for both Prisma CLI and runtime. Note: `@db.Json` columns are stored as `LONGTEXT` on MariaDB.
- **Auth models** — `User` (id cuid, unique email, optional `emailVerified` / `name` / `avatarUrl` / `companyName` / `onboardingCompletedAt`); `OAuthAccount` (FK `userId`, `provider` + `providerAccountId` uniquely identifies the IdP identity — Google `sub` for now — plus the cached `accessToken` / `refreshToken` / `idToken` / `expiresAt`, all `@db.Text`). `OAuthAccount` has `@@unique([provider, providerAccountId])` so the same Google account can't be attached to two users. There is no `Session` model — auth is stateless JWT (see Server internals). The cached `refreshToken` / `idToken` are written but not currently read after login.
- **Client** — `server/src/services/prisma-service.ts` exports a `PrismaClient` singleton cached on `globalThis` so `tsx watch` reloads don't open new connection pools, and re-exports everything from `@prisma/client` (`export * from '@prisma/client'`) so consumers can import model types (`User`, `OAuthAccount`) and the `Prisma` namespace (for `Prisma.PrismaClientKnownRequestError` etc.) from the same file. User-row helpers live in `server/src/services/user-service.ts` (`findUserById`, `mapUserToTUser`, `upsertGoogleUser`, `markOnboardingCompleted`).
- **Local dev** — `docker compose up -d` in `server/` brings up `mariadb:11` on `:3306` (db `fractapay`, user/pass `fractapay`/`fractapay`). `npm run db:migrate` creates a timestamped migration; `npm run db:seed` runs `prisma/seed.ts`. `postinstall` runs `prisma generate`, so a fresh `npm install` always has a usable client.
- **Production (Fly.io)** — see the "Production deployment (Fly.io)" section in [/CLAUDE.md](../CLAUDE.md).

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

## Code Style

Inherits global rules from [/CLAUDE.md](../CLAUDE.md). Server-specific:

- **TypeScript strict mode**.
- **Server imports**: no file extensions (e.g. `from './config'`) — `commonjs` module, TypeScript resolves `.ts` files automatically.
- **Arrow functions for routes**: use `export const Name = () => {}` for Fastify route handlers — never `export function`. Hooks use `export function useHook() {}` (regular function declaration).
