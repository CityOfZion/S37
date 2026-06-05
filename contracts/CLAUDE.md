# contracts/CLAUDE.md

Contracts package guidance. See [/CLAUDE.md](../CLAUDE.md) for project overview, monorepo map, request flow, and global code style.

## Commands

```bash
cargo test                # run all unit tests
cargo test <test_name>    # run a single test (substring match, e.g. cargo test test_execute_mix)
cargo test -- --nocapture # show stdout from tests
make test                 # alias for `cargo test` (no extra flags supported)
make build                # cargo build --release --target wasm32v1-none
make lint                 # cargo clippy --all-targets --all-features -- -D warnings
make fmt                  # cargo fmt
make check                # fmt-check + clippy
make optimize             # shrink WASM (needs stellar CLI or wasm-opt)
make deploy-testnet       # deploy to Stellar testnet
make clean                # cargo clean
```

For single-test runs and `--nocapture`, invoke `cargo test` directly — the `make test` target wraps `cargo test` with no passthrough arguments. The Makefile also exposes deploy + invoke helpers (`make invoke-create-agreement`, `make invoke-execute`, `make invoke-history`, etc.) for testnet interaction; override scenario constants like `AGREEMENT_ID`, `PAYER`, `FLAT_AMOUNT` via env (`make invoke-execute AGREEMENT_ID=1`).

WASM output: `contracts/target/wasm32v1-none/release/fractapay.wasm`. The `wasm32-unknown-unknown` target is broken on Rust 1.82+ with Soroban SDK 26 — always use `wasm32v1-none` (already installed via `rustup`).

## Architecture

### Contract internals (`contracts/src/lib.rs` → `FractaPayContract`, version `"0.5.0"`)

- **Direct-debit model.** The payer holds the token balance in their own wallet. At execute time the contract calls SAC `transfer(payer, receiver, amount)`. `agreement.payer.require_auth()` covers both the agreement-level auth and the SAC transfer auth in a single signature — there is no on-contract escrow pool.
- **Agreements.** `create_agreement(payer, receiver, token, contract_type, flat_amount, percent_bps, payment_timestamps) -> u64`. Returns an auto-incrementing ID. `contract_type` is `Flat`, `Royalties`, or `Mix`. Payment formula (`reference_amount` supplied per-execution, see Execution):
  - `Flat`        → `flat_amount`
  - `Royalties`   → `reference_amount * percent_bps / 10_000`
  - `Mix`         → `flat_amount + reference_amount * percent_bps / 10_000`
  `receiver` and `token` are immutable after creation — edits change other fields only; switching either requires `end_agreement` + new `create_agreement`.
- **Volatile royalty base.** `reference_amount` is **not** stored on the agreement — it is declared at execute time, since it changes for every payment. A **negative** reference is always rejected (`InvalidAmount`) so it can never erode `Mix`'s flat floor. `Flat` ignores it; `Royalties` needs it `> 0` (a zero reference yields a zero amount → `InvalidAmount`); `Mix` with a zero reference pays only its flat portion. Queries (`get_due_payments`/`get_next_payments`) compute amounts with reference `0`, so they report the pre-known (flat) portion only.
- **Scheduling — explicit timestamps.** `payment_timestamps: Vec<u64>` is the exact list of unix-second instants at which payments are due (no interval/frequency math). `validate_timestamps` requires it non-empty, strictly ascending, and with its last element in the future (else `InvalidWindow`). A `next_payment_index: u32` cursor tracks progress: payment `i` is due when `now >= payment_timestamps[i]`. There is **no** `end_timestamp` — the agreement is complete once `next_payment_index >= len`, after which `execute` panics `AfterEnd`.
- **Execution.** `execute_due_payment(id, reference_amount)` (single) and `execute_all_due(payer, references: Map<u64,i128>)` (batch — each agreement's reference looked up by id, absent ⇒ `0`). Each call pays at most **one** timestamp — the one at `next_payment_index` if `now` has reached it. The execute path reads `token.balance(payer)` first; strict path panics on not-due/paused/ended(complete)/zero-amount/insufficient-balance, batch path silently skips them. Each successful execution advances `next_payment_index += 1`, sets `last_amount_paid`, appends a `PaymentRecord` to `PaymentHistory(payer)`, and emits `PaymentExecuted`. `execute_all_due` is order-sensitive when the payer is short: agreements pay in `PayerAgreements` insertion order until balance drains.
- **Lifecycle.** Pause/resume is a **status gate only** — timestamps are absolute and never shifted. `pause_agreement` sets status `Paused` (blocks execution); `resume_agreement` sets it back to `Active`, at which point any timestamp that elapsed while paused is immediately due. `end_agreement` flips status to `Ended` (one-way); funds stay in the payer's wallet untouched.
- **Queries.** `get_due_payments(payer) -> Vec<DuePayment>` (Active agreements whose `next_payment_index` timestamp has elapsed), `get_next_payments(payer) -> Vec<NextPayment>` (the upcoming payment `{id, amount, timestamp}` for each Active agreement, due or not), `get_agreement(id)`, `get_payer_agreements(payer)`, `get_payment_history(payer)`.
- **Auth.** Every mutating method calls `payer.require_auth()` (or `admin.require_auth()` for `upgrade`). `execute_due_payment` requires the agreement's stored payer to authorize — not the caller.
- **Storage.** Instance storage holds `Admin` and `NextAgreementId`; its TTL is bumped to `535_000` (threshold `100`) on every mutating entry point via `extend_instance_ttl`, so the instance + Wasm are not archived. Persistent storage holds `Agreement(id)`, `PayerAgreements(payer)`, `PaymentHistory(payer)` — all extended to the same TTL on every read/write.
- **Events.** `AgreementCreated/Edited/Paused/Resumed/Ended`, `PaymentExecuted`, `Upgraded` — all use the modern `#[contractevent]` + `.publish(&env)` style, never `env.events().publish(...)`.
- **Errors.** `#[contracterror]` enum `ContractError` with sequential codes 1–8 (e.g. `PaymentNotDue = 2`, `InsufficientBalance = 7`). Tests assert exact panic strings of the form `"Error(Contract, #N)"`.
- Amounts are in **stroops** (1 XLM = 10,000,000 stroops). The Rust crate-level `#![allow(clippy::too_many_arguments)]` is required because the `#[contractimpl]`/`#[contractargs]`/`#[contractclient]` macros generate functions with >7 args that clippy can't be silenced on per-function.
- Tests use `env.mock_all_auths()`, `register_stellar_asset_contract_v2`, and time-travel via `env.ledger().with_mut(|info| info.timestamp = …)`.

## Code Style

Inherits global rules from [/CLAUDE.md](../CLAUDE.md). Rust-specific:

- **Rust**: `rustfmt` max_width 100, 4-space tabs; Clippy `-D warnings`.
