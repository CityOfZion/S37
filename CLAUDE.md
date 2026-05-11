# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**FractaPay** — AI-powered batch payment processor. Built for Hackathon Stellar 37° × NearX.

Upload a payment file (CSV/XLS/XLSX/PDF/TXT) → Claude AI extracts `{ amount, address }` pairs → Soroban smart contract executes batch transfers.

## Monorepo Structure

Three independent packages, each with its own `node_modules` / `Cargo.lock`:

```
server/     Node.js + Fastify + TypeScript  (port 3000)
web/        React + Vite + TypeScript       (port 5173)
contracts/  Rust + Soroban SDK 22
```

All three must be set up and run independently. There is no root-level `package.json`.

---

## Commands

### Server (`cd server`)

```bash
npm install
cp .env.example .env      # then set ANTHROPIC_API_KEY
npm run dev               # tsx watch — hot reload
npm run build             # tsc → dist/
npm run lint              # ESLint (auto-fixes)
npm run typecheck         # tsc --noEmit
```

### Web (`cd web`)

```bash
npm install
cp .env.example .env      # set VITE_API_URL and VITE_PUBLIC_KEY
npm run dev               # Vite dev server
npm run build             # tsc + vite build
npm run lint              # ESLint (auto-fixes)
npm run typecheck
```

### Contracts (`cd contracts`)

```bash
cargo test                # run all unit tests
cargo test <test_name>    # run a single test
make build                # cargo build --release --target wasm32-unknown-unknown
make lint                 # cargo clippy
make fmt                  # cargo fmt
make check                # fmt-check + clippy
make optimize             # shrink WASM (needs stellar CLI or wasm-opt)
make deploy-testnet       # deploy to Stellar testnet
```

---

## Architecture

### Request flow

```
web (FileUpload component)
  → POST multipart/form-data to server /upload
    → file.service.ts parses buffer by type (csv-parse / xlsx / pdf-parse)
    → ai.service.ts sends extracted text to Claude claude-sonnet-4-6
    → Claude returns { payments: [{ amount, address, description }] }
  → web renders PaymentList
    → user clicks Execute → calls Soroban batch_pay contract
```

### Server internals

- **`src/config.ts`** — Zod-validated env; process exits immediately if `ANTHROPIC_API_KEY` is missing.
- **`src/services/file.service.ts`** — Dispatch by MIME type + extension. CSV → JSON string; XLSX/XLS → CSV string per sheet; PDF → raw text; TXT → utf-8 passthrough.
- **`src/services/ai.service.ts`** — Single `analyzePayments(content)` call. Model is hard-coded to `claude-sonnet-4-6`. JSON is extracted with a regex fallback (`/\{[\s\S]*\}/`) in case the model adds surrounding text despite the system prompt.
- **`src/routes/upload.route.ts`** — File validation uses both MIME type AND extension (browsers sometimes send wrong MIME for `.xls`). 10 MB file-size limit is set in `@fastify/multipart` registration.

### Web internals

- **State** lives only in `App.tsx` (`payments: Payment[]`). No global store.
- **Data fetching** — `useUpload` hook wraps a TanStack Query `useMutation`; error/loading state comes from the mutation.
- **i18n** — `src/i18n/index.ts` initialises i18next with bundled JSON (`en-US` / `pt-BR`). Language toggle is in `Header.tsx`.
- **API client** — `src/services/api.ts` creates a single axios instance with `baseURL` from `VITE_API_URL`.

### Contract internals

- **`batch_pay(env, token, from, payments)`** — loops `Vec<Payment>` and calls `token::Client::transfer` for each. `from.require_auth()` is the only auth check. Emits `BATCHPAID` event on completion.
- Amounts are in **stroops** (1 XLM = 10,000,000 stroops).
- Tests use `env.mock_all_auths()` and `register_stellar_asset_contract_v2`.

---

## Environment Variables

| File | Variable | Purpose |
|---|---|---|
| `server/.env` | `ANTHROPIC_API_KEY` | Required — Claude API |
| `server/.env` | `PORT` | Default 3000 |
| `web/.env` | `VITE_API_URL` | Default `http://localhost:3000` |
| `web/.env` | `VITE_PUBLIC_KEY` | Stellar public key shown in UI |

---

## Code Style

- **TypeScript strict mode** in both `server/` and `web/`.
- **Prettier**: no semicolons, single quotes, trailing commas (ES5), 100-char width.
- **Server imports**: no file extensions (e.g. `from './config'`) — `commonjs` module, TypeScript resolves `.ts` files automatically.
- **Husky pre-commit**: runs `lint-staged` + `typecheck` in both `server/` and `web/`.
- **Rust**: `rustfmt` max_width 100, 4-space tabs; Clippy `-D warnings`.
- **No abbreviations in variable/parameter names**: use full words (e.g. `message` not `msg`, `error` not `err`, `request` not `req`, `response` not `res`, `index` not `idx`, `parameter` not `param`).
- **Blank line before `return`**: always leave one blank line before a `return` statement unless it is the very first statement in a block.
- **Trailing newline**: every file must end with a single blank line (newline character at EOF).
- **Arrow functions for components and routes**: use `export const Name = () => {}` — never `export function`. Applies to React components (`web/`) and Fastify route handlers (`server/`). Hooks use `export function useHook() {}` (regular function declaration).
- **Tailwind size shorthand**: when width and height are equal, use `size-*` instead of `w-* h-*` (e.g. `size-4` not `w-4 h-4`).
- **Accessibility**: always apply ARIA attributes where visible text alone is insufficient. Key patterns: `aria-label` on interactive elements whose purpose isn't clear from content (icon-only buttons, ambiguous controls); `aria-hidden="true"` on decorative elements (icons, illustrations); `alt` with meaningful text on informative images, `alt=""` on decorative ones; prefer semantic HTML over ARIA roles — only reach for `role` when no native element fits.
- **Input labels**: every `<input>` and `<textarea>` must have either an associated `<label>` (via `htmlFor`/`id`) or an `aria-label` attribute. Never render a bare input without one.
- **Semantic HTML**: always use the most specific semantic element available (`<main>`, `<header>`, `<nav>`, `<section>`, `<article>`, `<aside>`, `<footer>`, `<h1>`–`<h6>`, `<p>`, `<ul>`, `<ol>`, `<li>`, `<button>`, `<a>`, `<table>`, etc.). Reserve `<div>` and `<span>` exclusively for layout or styling containers that carry no semantic meaning.
- **Kebab-case for asset files**: all static assets — images, icons, SVGs, fonts — must be named in kebab-case (e.g. `upload-icon.svg`, `logo-dark.png`). No camelCase, PascalCase, or underscores in file names.
- **Icon file suffix**: all icon files must end with `-icon` (e.g. `upload-icon.svg`, `loading-spinner-icon.svg`, `empty-state-icon.svg`).
- **Responsive design**: all UI must work on mobile, tablet, and desktop. Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`) — mobile-first. No fixed pixel widths on layout containers; prefer `w-full`, `max-w-*`, or fluid units. Touch targets must be at least 44×44px.
- **Object shorthand**: when an object property key matches its value variable name, use shorthand — `{ token }` not `{ token: token }`. Enforced via ESLint `object-shorthand` rule.
- **Ellipsis character**: always use the correct Unicode ellipsis `…` (U+2026), never three dots `...`. Applies to all user-facing strings, translations, placeholders, and prompts.
- **Middle truncation for addresses**: always use `StringHelper.truncateMiddle()` to truncate blockchain addresses (e.g. `GABCD…WXYZ`). Never use CSS `truncate` or start/end ellipsis on addresses — both ends carry meaningful information.
- **Form element wrapping**: components that contain `<input>`, `<select>`, or other form controls must wrap them in a `<form>` element. Use `onSubmit={event => event.preventDefault()}` when form submission is handled programmatically. Reusable primitives (e.g. `Input.tsx`, `Select.tsx`) are excluded — the wrapping `<form>` belongs in the parent component.
