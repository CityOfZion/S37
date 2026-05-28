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

## Code Style

Inherits global rules from [/CLAUDE.md](../CLAUDE.md). Rust-specific:

- **Rust**: `rustfmt` max_width 100, 4-space tabs; Clippy `-D warnings`.
