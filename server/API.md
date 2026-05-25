# FractaPay Server API

HTTP reference for `server/` (Fastify, default port `3000`). Every endpoint is listed with method, path, auth requirement, request shape, response shape, error codes, and one runnable `curl` example.

- **Base URL (dev):** `http://localhost:3000`
- **Auth model:** signed httpOnly cookie `fractapay_session` (name configurable via `SESSION_COOKIE_NAME`) set by `GET /auth/google/callback`. Cookie holds an opaque `Session.id`; server resolves the user on each request via `requireAuth` / `optionalAuth` (`server/src/hooks/require-auth.ts`).
- **Error envelope:** unless noted, error responses are `{ "success": false, "error": "<ErrorCode>" }`. `ErrorCode` enum lives in `shared/src/types/index.ts` — see the table at the bottom of this file.
- **CORS:** single-origin (`CORS_ORIGIN`, default `http://localhost:5173`); methods `GET, POST, OPTIONS`; `credentials: true`.
- **Multipart limit:** 10 MB per file (`@fastify/multipart`). Non-file fields must arrive in the form **before** the file part.
- **Stellar addresses:** validated with `StrKey.isValidEd25519PublicKey` via `StellarHelper.isValidAddress` (`shared/`).

Examples below assume:

```sh
BASE=http://localhost:3000
COOKIES=cookies.txt
```

---

## Conventions

Each endpoint section uses the same layout:

- **Auth:** `None` / `Required` (`requireAuth`) / `Optional` (`optionalAuth`).
- **Request:** path params, query, body, multipart fields.
- **Success (200):** JSON body shape, unless a different status is shown.
- **Errors:** `STATUS · ErrorCode` pairs.
- **Notes:** anything non-obvious.
- **Example:** one runnable `curl`.

---

## Health (`health-route.ts`)

### GET / · GET /health

- **Auth:** None
- **Request:** —
- **Success (200):** `{ "status": "ok", "service": "fractapay-server" }`
- **Errors:** —
- **Notes:** Same handler bound to both paths.
- **Example:**

  ```sh
  curl -s $BASE/health
  ```

---

## Auth (`auth-route.ts`)

### GET /auth/google

- **Auth:** None
- **Request:** —
- **Success (302):** Redirect to Google consent screen.
- **Errors:** —
- **Notes:** Auto-registered by `@fastify/oauth2` as `startRedirectPath`. Not implemented in `auth-route.ts`.
- **Example:** open in a browser — `http://localhost:3000/auth/google`.

### GET /auth/google/callback

- **Auth:** None
- **Request:** query `code`, `state` (from Google).
- **Success (302):** Redirect to `WEB_LOGIN_SUCCESS_URL`. Sets signed cookie `fractapay_session = <Session.id>` (httpOnly, sameSite=lax, maxAge 7d).
- **Errors:** `302 → WEB_LOGIN_FAILURE_URL` on any exception (token exchange failure, userinfo failure, DB error).
- **Notes:** Upserts `User` + `OAuthAccount` (stores `access_token` / `refresh_token` / `id_token` / `expires_at` / `scope` / `token_type`), then creates a `Session` row with the request `user-agent` and `ip`.
- **Example:** browser flow only.

### GET /auth/me

- **Auth:** Required (`requireAuth`)
- **Request:** cookie `fractapay_session`.
- **Success (200):** `{ "success": true, "user": { "id": string, "email": string, "name": string | null, "picture": string | null } }`
- **Errors:** `401 · UNAUTHORIZED` (no/invalid cookie), `401 · SESSION_EXPIRED` (session row missing or expired).
- **Notes:** —
- **Example:**

  ```sh
  curl -i --cookie $COOKIES $BASE/auth/me
  ```

### POST /auth/logout

- **Auth:** Optional (`optionalAuth`)
- **Request:** cookie `fractapay_session` (optional).
- **Success (200):** `{ "success": true }`. Clears the cookie; deletes the `Session` row if the cookie resolved.
- **Errors:** —
- **Notes:** Idempotent — safe to call without a cookie.
- **Example:**

  ```sh
  curl -i -X POST --cookie $COOKIES --cookie-jar $COOKIES $BASE/auth/logout
  ```

### POST /auth/signup

- **Auth:** None
- **Request:** —
- **Success:** never — returns 501.
- **Errors:** `501 · NOT_IMPLEMENTED`.
- **Notes:** Placeholder for future email/password (or magic-link) sign-up.
- **Example:**

  ```sh
  curl -i -X POST $BASE/auth/signup
  ```

---

## Upload (`upload-route.ts`)

### POST /upload

- **Auth:** None
- **Request:** `multipart/form-data` — fields **in this order**:
  - `address` — Stellar G-address (required).
  - `token` — must be in `SUPPORTED_TOKENS` (currently `TESOURO`).
  - `file` — `.csv` / `.xls` / `.xlsx` / `.pdf` / `.txt` (validated by both MIME type and extension), ≤ 10 MB. **Must be the last part.**
- **Headers:** optional `Accept-Language: en-US` / `pt-BR` (defaults to `pt-BR`).
- **Success (200):** `{ "success": true, "payments": TPayment[], "price": string }` where `TPayment = { id, amount, description? }` and `price` is the FIAT → on-chain-token conversion factor (7-decimal string).
- **Errors:** `400 · NO_FILE`, `400 · INVALID_TOKEN`, `400 · INVALID_ADDRESS`, `400 · UNSUPPORTED_FILE_TYPE`, `500 · AI_PARSE_FAILED` / `500 · RATE_FETCH_FAILED` / `500 · ORDERBOOK_FETCH_FAILED` / `500 · UNKNOWN`.
- **Notes:** Calls Gemini via `ai-service.ts`; for TESOURO, `price` is `tesouro/USDC × USD/BRL` from the Stellar orderbook + AwesomeAPI.
- **Example:**

  ```sh
  curl -s -X POST $BASE/upload \
    -F "address=GA...YOURSTELLARADDRESS..." \
    -F "token=TESOURO" \
    -F "file=@./payments.csv"
  ```

---

## Etherfuse (`etherfuse-route.ts`)

### POST /etherfuse/onboarding

- **Auth:** None
- **Request:** `{ "publicKey": string }` (Stellar G-address).
- **Success (200):** `{ "customerId": string, "bankAccountId": string, "presignedUrl": string }`.
- **Errors:** `400 · INVALID_ADDRESS`, `502 · ETHERFUSE_REQUEST_FAILED` / `502 · CUSTOMER_ALREADY_EXISTS` / `502 · UNKNOWN`.
- **Notes:** Generates partner-side UUIDs for `customerId` / `bankAccountId`. `presignedUrl` is the KYC document upload URL.
- **Example:**

  ```sh
  curl -s -X POST $BASE/etherfuse/onboarding \
    -H "Content-Type: application/json" \
    -d '{"publicKey":"GA...YOURSTELLARADDRESS..."}'
  ```

### GET /etherfuse/customer/:publicKey

- **Auth:** None
- **Request:** path `publicKey` (Stellar G-address).
- **Success (200):** `{ "customerId": string, "bankAccountId": string, "presignedUrl": string }`.
- **Errors:** `400 · INVALID_ADDRESS`, `404 · CUSTOMER_NOT_FOUND`, `502 · ETHERFUSE_REQUEST_FAILED` / `502 · UNKNOWN`.
- **Notes:** Used to recover IDs after a page reload before re-running onboarding.
- **Example:**

  ```sh
  curl -s $BASE/etherfuse/customer/GA...YOURSTELLARADDRESS...
  ```

### GET /etherfuse/kyc/:customerId/:publicKey

- **Auth:** None
- **Request:** path `customerId`, `publicKey`.
- **Success (200):** `{ "status": "not_started" | "pending" | "approved" | "rejected" }`.
- **Errors:** `400 · INVALID_ADDRESS`, `502 · ETHERFUSE_REQUEST_FAILED` / `502 · UNKNOWN`.
- **Notes:** Web polls this every 5s via `use-kyc-status-query.ts`.
- **Example:**

  ```sh
  curl -s $BASE/etherfuse/kyc/c-uuid-here/GA...YOURSTELLARADDRESS...
  ```

### POST /etherfuse/bank-account

- **Auth:** None
- **Request:**

  ```json
  {
    "presignedUrl": "string",
    "pixKey": "string",
    "pixKeyType": "evp | cpf | cnpj | email | phone",
    "firstName": "string",
    "lastName": "string",
    "cpf": "string"
  }
  ```

- **Success (200):** `{ "bankAccountId": string, "pixKey"?: string, "status": string }`.
- **Errors:** `400 · INVALID_PAYLOAD`, `502 · ETHERFUSE_REQUEST_FAILED` / `502 · UNKNOWN`.
- **Notes:** All six body fields are required; `pixKeyType` must be one of the five values above.
- **Example:**

  ```sh
  curl -s -X POST $BASE/etherfuse/bank-account \
    -H "Content-Type: application/json" \
    -d '{"presignedUrl":"https://...","pixKey":"user@example.com","pixKeyType":"email","firstName":"Ada","lastName":"Lovelace","cpf":"12345678900"}'
  ```

### POST /etherfuse/quote

- **Auth:** None
- **Request:**

  ```json
  {
    "customerId": "string",
    "sourceAmount": "string (BRL)",
    "token": "TESOURO",
    "publicKey": "string (Stellar G-address)"
  }
  ```

- **Success (200):** `{ "quoteId", "sourceAmount", "destinationAmount", "exchangeRate", "feeAmount", "etherfuseFeeAmount", "fractapayFeeAmount", "expiresAt", "createdAt" }` — all strings.
- **Errors:** `400 · INVALID_PAYLOAD`, `502 · ETHERFUSE_REQUEST_FAILED` / `502 · QUOTE_EXPIRED` / `502 · UNKNOWN`.
- **Notes:** `sourceAsset` is always `BRL`; quote validity is `QUOTE_EXPIRY_SECONDS` (60s). Web shows a `CountdownRing` against `expiresAt`.
- **Example:**

  ```sh
  curl -s -X POST $BASE/etherfuse/quote \
    -H "Content-Type: application/json" \
    -d '{"customerId":"c-uuid","sourceAmount":"100.00","token":"TESOURO","publicKey":"GA..."}'
  ```

### POST /etherfuse/order

- **Auth:** None
- **Request:**

  ```json
  {
    "quoteId": "string",
    "customerId": "string",
    "bankAccountId": "string",
    "publicKey": "string (Stellar G-address)",
    "memo": "string (optional)"
  }
  ```

- **Success (200):** `{ "orderId", "status": "created" | "funded" | "completed" | "failed" | "refunded" | "canceled", "pix"?: TPixInstructions, "confirmedTxSignature"?: string, "amountInFiat"?: string, "amountInTokens"?: string }` where `TPixInstructions = { pixCode, pixKey?, pixKeyType?, beneficiary?, amount, currency: "BRL" }`.
- **Errors:** `400 · INVALID_PAYLOAD`, `502 · ETHERFUSE_REQUEST_FAILED` / `502 · PENDING_ORDER_EXISTS` / `502 · KYC_NOT_APPROVED` / `502 · UNKNOWN`.
- **Notes:** `quoteId` must be unexpired and belong to `customerId`. The response `pix` block drives the QR + clipboard UI.
- **Example:**

  ```sh
  curl -s -X POST $BASE/etherfuse/order \
    -H "Content-Type: application/json" \
    -d '{"quoteId":"q-uuid","customerId":"c-uuid","bankAccountId":"b-uuid","publicKey":"GA..."}'
  ```

### GET /etherfuse/order/:orderId

- **Auth:** None
- **Request:** path `orderId`.
- **Success (200):** Same shape as `POST /etherfuse/order` response.
- **Errors:** `404 · ORDER_NOT_FOUND`, `502 · ETHERFUSE_REQUEST_FAILED` / `502 · UNKNOWN`.
- **Notes:** Web polls every 5s via `use-order-query.ts` until `status` is terminal (`completed` / `failed` / `refunded` / `canceled`).
- **Example:**

  ```sh
  curl -s $BASE/etherfuse/order/o-uuid
  ```

### POST /etherfuse/webhook

- **Auth:** None
- **Request:**

  ```json
  {
    "event": "bank_account_updated | customer_updated | order_updated | quote_updated | swap_updated | kyc_updated",
    "data": { "id": "string", "status": "string", "...": "..." },
    "timestamp": 1730000000
  }
  ```

- **Success (200):** `{ "success": true }`.
- **Errors:** `400 · INVALID_PAYLOAD` (missing/unknown event, missing `data.id`, non-string `data.status`, missing `timestamp`).
- **Notes:** **No signature verification.** Payload is stored in-memory by `etherfuse-webhook-store.ts` keyed by `${event}:${data.id}` — sandbox-grade only. In production, gate this behind a shared secret header or move it behind a reverse-proxy ACL before enabling.
- **Example:**

  ```sh
  curl -s -X POST $BASE/etherfuse/webhook \
    -H "Content-Type: application/json" \
    -d '{"event":"order_updated","data":{"id":"o-uuid","status":"completed"},"timestamp":1730000000}'
  ```

### POST /etherfuse/order/:orderId/simulate

- **Auth:** None
- **Request:** path `orderId`.
- **Success (200):** `{ "success": true }`.
- **Errors:** `502 · ETHERFUSE_REQUEST_FAILED` / `502 · UNKNOWN`.
- **Notes:** **Sandbox only.** Route is registered only when `process.env.NODE_ENV !== 'production'` (`isProduction` gate in `etherfuse-route.ts`). In production this path returns Fastify's default 404.
- **Example:**

  ```sh
  curl -s -X POST $BASE/etherfuse/order/o-uuid/simulate
  ```

---

## Chat (`chat-route.ts`)

### POST /chat

- **Auth:** None
- **Request:** `multipart/form-data`:
  - `messages` — JSON string: `[{ "role": "user" | "assistant", "content": string }, …]`.
  - `context` — JSON string: `{ "destinations": TDestination[], "payments": TPayment[], "allocations": TDestinationAllocation[], "language": "en-US" | "pt-BR" }`.
  - `file` — optional, same MIME/extension rules as `/upload`, ≤ 10 MB.
- **Headers:** optional `Accept-Language` overrides `context.language`.
- **Success (200):** `{ "message": string, "action": "none" | "add_payments" | "set_allocations" | "request_confirmation" | "execute" | "clear", "payments"?: TPayment[], "price"?: string, "allocations"?: TDestinationAllocation[], "summary"?: TPaymentSummaryItem[] }`.
- **Errors:** `400 · INVALID_PAYLOAD` (no multipart, missing `messages`/`context`, invalid JSON), `500 · AI_PARSE_FAILED` / `500 · RATE_FETCH_FAILED` / `500 · ORDERBOOK_FETCH_FAILED` / `500 · UNKNOWN`.
- **Notes:** Even text-only chat requests must use `multipart/form-data` because the handler always calls `request.file()`. Send `messages` and `context` as form fields and either omit the file part or attach a stub. Unparseable / disallowed files are silently dropped — the chat still runs.
- **Example (text only — empty stub file):**

  ```sh
  curl -s -X POST $BASE/chat \
    -F 'messages=[{"role":"user","content":"hello"}]' \
    -F 'context={"destinations":[],"payments":[],"allocations":[],"language":"pt-BR"}' \
    -F 'file=@/dev/null;filename='
  ```

- **Example (with file):**

  ```sh
  curl -s -X POST $BASE/chat \
    -F 'messages=[{"role":"user","content":"parse this"}]' \
    -F 'context={"destinations":[],"payments":[],"allocations":[],"language":"pt-BR"}' \
    -F 'file=@./payments.csv'
  ```

---

## ErrorCode reference

Mirror of the enum in `shared/src/types/index.ts`. When the server returns a non-2xx with `{ "success": false, "error": "<code>" }`, the `<code>` is one of these.

| Code                       | Typical status | When                                                                                    |
| -------------------------- | -------------- | --------------------------------------------------------------------------------------- |
| `NO_FILE`                  | 400            | `/upload` called without a file part.                                                   |
| `UNSUPPORTED_FILE_TYPE`    | 400            | File MIME and extension both rejected.                                                  |
| `INVALID_TOKEN`            | 400            | `token` missing or not in `SUPPORTED_TOKENS`.                                           |
| `INVALID_ADDRESS`          | 400            | Stellar address fails `StrKey.isValidEd25519PublicKey`.                                 |
| `INVALID_PAYLOAD`          | 400            | Required JSON / multipart fields missing or malformed.                                  |
| `AI_PARSE_FAILED`          | 500            | Gemini returned a non-JSON or unparsable response.                                      |
| `NETWORK_ERROR`            | 500            | Generic network failure inside a service.                                               |
| `RATE_FETCH_FAILED`        | 500            | AwesomeAPI USD/BRL fetch failed.                                                        |
| `ORDERBOOK_FETCH_FAILED`   | 500            | Stellar Horizon orderbook fetch failed.                                                 |
| `ETHERFUSE_REQUEST_FAILED` | 502            | Etherfuse HTTP/network error.                                                           |
| `KYC_NOT_APPROVED`         | 502            | Order creation blocked by KYC status.                                                   |
| `QUOTE_EXPIRED`            | 502            | Quote used past `expiresAt`.                                                            |
| `ORDER_NOT_FOUND`          | 404            | `GET /etherfuse/order/:orderId` missing.                                                |
| `PENDING_ORDER_EXISTS`     | 502            | Existing pending order blocks a new one.                                                |
| `CUSTOMER_ALREADY_EXISTS`  | 502            | Onboarding called for an already-onboarded `publicKey`.                                 |
| `CUSTOMER_NOT_FOUND`       | 404            | `GET /etherfuse/customer/:publicKey` missing.                                           |
| `UNAUTHORIZED`             | 401            | `requireAuth` saw no/invalid cookie.                                                    |
| `SESSION_EXPIRED`          | 401            | Session row missing or past `expiresAt`.                                                |
| `OAUTH_FAILED`             | —              | Reserved; currently the OAuth callback redirects on failure rather than returning JSON. |
| `NOT_IMPLEMENTED`          | 501            | `POST /auth/signup` stub.                                                               |
| `UNKNOWN`                  | 500 / 502      | Fallback when an upstream error string doesn't match any other `ErrorCode`.             |
