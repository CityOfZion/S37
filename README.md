<div align="center">
  <img src="./web/src/assets/logos/logo.svg" alt="FractaPay logo" width="120" />

  <h1>FractaPay</h1>

  <p><strong>AI-powered batch payment processor.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/React-Vite-61DAFB?style=flat-square&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/Node.js-Fastify-green?style=flat-square&logo=node.js" alt="Node.js" />
    <img src="https://img.shields.io/badge/Stellar-Horizon-blue?style=flat-square&logo=stellar" alt="Stellar" />
    <img src="https://img.shields.io/badge/Rust-Soroban-B7410E?style=flat-square&logo=rust" alt="Rust" />
    <img src="https://img.shields.io/badge/Gemini-AI-4285F4?style=flat-square&logo=google" alt="Gemini AI" />
    <img src="https://img.shields.io/badge/Hackathon-Stellar%20×%20NearX-1F75FE?style=flat-square" alt="Hackathon" />
  </p>

  <p>
    Chat with AI to set up batch payments. Register destinations, upload a payment file or type amounts. One confirm sends the batch on Stellar via PIX.
  </p>
</div>

---

## What is FractaPay?

FractaPay eliminates the pain of manual batch payments on Stellar. It uses an AI chat interface so you can set up and confirm payments conversationally.

1. Register your destinations (authors, agencies, recipients) on the **Destinations** page — each with a name, Stellar address, and PIX key.
2. Open the **Chat** and interact with the AI: type payment amounts, describe who gets what, or upload a payment file (CSV, XLS, XLSX, PDF or TXT) with amounts in BRL.
3. AI reads the conversation and file, extracts each payment's amount and description, and proposes allocations across your registered destinations.
4. When you confirm, FractaPay opens a **Review** modal per destination showing the `15%` recipient share and the `2%` Etherfuse + FractaPay fee, with a live quote and a countdown until it expires.
5. Confirm each allocation to generate a **PIX onramp** with Etherfuse. The modal renders a QR code and the copy-and-paste PIX code. Once the payment is detected, the Etherfuse order completes and TESOURO is delivered on Stellar to that destination's address.

KYC is mandatory before the first payment. The first time you confirm, FractaPay launches an embedded Etherfuse onboarding/KYC flow. The order will only generate after the KYC status returns as `approved`.

---

## Architecture

```
root/
├── server/       # Node.js + Fastify + TypeScript      →  chat, AI extraction, live prices
├── web/          # React + Vite + TailwindCSS          →  user interface
├── contracts/    # Rust + Soroban                      →  Stellar smart contract
└── shared/       # TypeScript types and helpers        →  shared between server and web
```

---

## Quick Start

### Server

```bash
cd server
npm install
npm run dev
```

Runs at `http://localhost:3000`.

| Command | Description |
|---|---|
| `npm run dev` | Start with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled output |
| `npm run lint` | Lint and format |
| `npm run typecheck` | TypeScript check |

### Web

```bash
cd web
npm install
npm run dev
```

Opens at `http://localhost:5173`.

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Lint and format |
| `npm run typecheck` | TypeScript check |

### Smart Contract

```bash
cd contracts
make test            # Run unit tests
make build           # Compile to WASM
make optimize        # Optimize WASM size
make deploy-testnet  # Deploy to testnet
```

| Target | Description |
|---|---|
| `make build` | Compile contract |
| `make test` | Run tests |
| `make fmt` | Format code |
| `make lint` | Run linter |
| `make check` | Format check + lint |
| `make optimize` | Optimize WASM binary |
| `make deploy-testnet` | Deploy to testnet |

---

## How It Works

```
┌────────────────────────────────────────────────────────────────┐
│                          User Flow                             │
│                                                                │
│  [Register destinations: name + Stellar address + PIX key]     │
│        ↓                                                       │
│  [Chat with AI: type amounts or upload a payment file]         │
│        ↓                                                       │
│  [AI extracts payments + proposes allocations per destination] │
│        ↓                                                       │
│  [AI requests confirmation → summary table in chat]            │
│        ↓                                                       │
│  [Review modal per allocation: 15% share + 2% fee + quote]     │
│        ↓                                                       │
│  [First time only: Etherfuse KYC embedded flow]                │
│        ↓                                                       │
│  [Confirm → Etherfuse onramp order → PIX QR + copy-paste]      │
│        ↓                                                       │
│  [User pays PIX → TESOURO delivered to address on Stellar]     │
└────────────────────────────────────────────────────────────────┘
```

---

## Environment Variables

### Server (`server/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No (default: 3000) | Server port |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `ETHERFUSE_API_KEY` | Yes | Etherfuse Ramp API key (sandbox or production) |
| `ETHERFUSE_BASE_URL` | No (default: `https://api.sand.etherfuse.com`) | Etherfuse base URL — `https://api.etherfuse.com` for production |
| `CORS_ORIGIN` | No (default: `http://localhost:5173`) | Comma-separated list of allowed CORS origins |

### Web (`web/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | No (default: http://localhost:3000) | Backend URL |

---

## Etherfuse Ramp Integration

FractaPay uses [Etherfuse](https://docs.etherfuse.com/initial-setup) for the BRL ↔ TESOURO PIX onramp/offramp. The server exposes the following endpoints under `/etherfuse/*`:

| Method + Path | Purpose |
|---|---|
| `POST /etherfuse/onboarding` | Create customer + return presigned KYC URL |
| `GET  /etherfuse/kyc/:customerId/:publicKey` | Read KYC status (polled by the web app) |
| `POST /etherfuse/bank-account` | Register a PIX bank account |
| `POST /etherfuse/quote` | Quote BRL → TESOURO with `feeAmount` and `expiresAt` |
| `POST /etherfuse/order` | Create an onramp order; response contains the PIX code |
| `GET  /etherfuse/order/:orderId` | Read order status (polled until completed) |
| `POST /etherfuse/order/:orderId/simulate` | **Sandbox only** — simulate the PIX deposit |
| `POST /etherfuse/webhook` | Receives Etherfuse webhook events (`order_updated`, `kyc_updated`, etc.) and caches the latest status in memory |

The Etherfuse API key never reaches the browser — all calls are proxied through the server, which uses `axios` (same version as the web client) for outbound requests.

Point the Etherfuse dashboard's webhook URL at `<public-host>/etherfuse/webhook` so order/KYC state changes are pushed to the server in real time. The cache lives in process memory (`src/services/etherfuse-webhook-store.ts`) — fine for a single-instance hackathon deployment; swap in Redis or a DB before going multi-instance.