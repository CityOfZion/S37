<div align="center">
  <img src="./web/src/assets/logos/logo.svg" alt="FractaPay logo" width="120" />

  <h1>FractaPay</h1>

  <p><strong>AI-powered batch payment processor.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/React-Vite-61DAFB?style=flat-square&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/Node.js-Fastify-green?style=flat-square&logo=node.js" alt="Node.js" />
    <img src="https://img.shields.io/badge/Stellar-Soroban-blue?style=flat-square&logo=stellar" alt="Stellar" />
    <img src="https://img.shields.io/badge/Rust-Soroban-B7410E?style=flat-square&logo=rust" alt="Rust" />
    <img src="https://img.shields.io/badge/Claude-AI-orange?style=flat-square" alt="Claude AI" />
    <img src="https://img.shields.io/badge/Hackathon-Stellar%20×%20NearX-1F75FE?style=flat-square" alt="Hackathon" />
  </p>

  <p>
    Upload a payment file → AI extracts recipients and amounts → Execute on Stellar in one transaction
  </p>
</div>

---

## What is FractaPay?

FractaPay eliminates the pain of manual batch payments on Stellar. Upload any spreadsheet, PDF, or CSV containing payment data, and let Claude AI parse it into a structured list of recipients and amounts. One click executes all payments via a Soroban smart contract.

---

## Architecture

```
root/
├── server/        # Node.js + Fastify + TypeScript  →  file parsing + Claude AI
├── web/           # React + Vite + TailwindCSS      →  user interface
└── contracts/     # Rust + Soroban                  →  Stellar smart contract
```

---

## Quick Start

### 1. Server

```bash
cd server
npm install
npm run dev
```

The server starts at `http://localhost:3000`.

**Available scripts:**

| Command | Description |
|---|---|
| `npm run dev` | Start with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled output |
| `npm run lint` | Run ESLint and Prettier |
| `npm run typecheck` | TypeScript type check |

---

### 2. Web

```bash
cd web
npm install
npm run dev
```

The app opens at `http://localhost:5173`.

**Available scripts:**

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint and Prettier |
| `npm run typecheck` | TypeScript type check |

---

### 3. Smart Contract

```bash
cd contracts
make test        # Run unit tests
make build       # Compile to WASM
make optimize    # Optimize WASM size (requires stellar CLI or wasm-opt)
make deploy-testnet  # Deploy to Stellar testnet
```

**Available make targets:**

| Target | Description                |
|---|----------------------------|
| `make build` | Compile to `wasm32-unknown-unknown`       |
| `make test` | Run Rust unit tests        |
| `make fmt` | Format code with rustfmt   |
| `make lint` | Run Clippy linter          |
| `make check` | fmt-check + lint           |
| `make optimize` | Optimize WASM binary       |
| `make deploy-testnet` | Deploy contract to testnet |

---

## How It Works

```
┌──────────────────────────────────────────────────────────┐
│                        User Flow                         │
│                                                          │
│  [Upload file]  →  [Server parses file]  →  [Claude AI]  │
│        ↓                                                 │
│  [JSON: payments list]  →  [User reviews]                │
│        ↓                                                 │
│  [Soroban contract: batch_pay]  →  [Stellar network]     │
└──────────────────────────────────────────────────────────┘
```

---

## Environment Variables

### Server (`server/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No (default: 3000) | Server port |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key |

### Web (`web/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | No (default: http://localhost:3000) | Backend URL |
| `VITE_PUBLIC_KEY` | Yes | Your Stellar public key |
