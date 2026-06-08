.PHONY: build test fmt fmt-check lint clean optimize check install-tools bindings \
	deploy-testnet setup-accounts require-contract-id print-contract-id \
	invoke-version invoke-create-agreement invoke-create-royalties invoke-get-due invoke-get-agreement \
	invoke-execute invoke-history invoke-pause invoke-resume invoke-end edit-agreement \
	invoke-get-next

# ─── Identities + scenario constants ──────────────────────────────────────────
# Override per invocation: `make invoke-execute AGREEMENT_ID=1`
PAYER             ?= Bob
RECEIVER          ?= charlie
ADMIN             ?= delta
NETWORK           ?= testnet
FLAT_AMOUNT       ?= 12345
# Royalty/Mix base, declared at execution time (volatile per payment). Ignored by Flat.
REFERENCE_AMOUNT  ?= 0

# Contract + agreement state — default reads from .contract-id (written by deploy-testnet)
CONTRACT_ID       ?= $(shell cat .contract-id 2>/dev/null)
AGREEMENT_ID      ?= 0

# Native XLM SAC address on the chosen network (derived lazily)
XLM_SAC            = CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC

# Output directory for generated TypeScript bindings (override with BINDINGS_DIR=…)
BINDINGS_DIR      ?= bindings

# Default payment schedule = two timestamps, now + 3min and now + 6min.
# Override with your own JSON array: `make invoke-create-agreement PAYMENT_TIMESTAMPS='[111,222]'`
PAYMENT_TIMESTAMPS = $(shell echo "[$$(( $$(date +%s) + 180 )),$$(( $$(date +%s) + 360 ))]")

# ─── Build / lint / test ──────────────────────────────────────────────────────

build:
	cargo build --release --target wasm32v1-none

test:
	cargo test

fmt:
	cargo fmt

fmt-check:
	cargo fmt -- --check

lint:
	cargo clippy --all-targets --all-features -- -D warnings

check: fmt-check lint

clean:
	cargo clean

optimize: build
	@if command -v stellar >/dev/null 2>&1; then \
		stellar contract optimize --wasm target/wasm32v1-none/release/fractapay.wasm; \
	elif command -v wasm-opt >/dev/null 2>&1; then \
		wasm-opt -Oz -o target/wasm32v1-none/release/fractapay_optimized.wasm \
			target/wasm32v1-none/release/fractapay.wasm; \
	else \
		echo "Install stellar CLI or wasm-opt for optimization"; \
	fi

install-tools:
	cargo install --locked stellar-cli --features opt

# Generate TypeScript bindings for the deployed contract into $(BINDINGS_DIR).
# Reads CONTRACT_ID from .contract-id; fetches the contract spec from the network.
bindings: require-contract-id
	stellar contract bindings typescript \
		--network $(NETWORK) \
		--contract-id $(CONTRACT_ID) \
		--output-dir $(BINDINGS_DIR) \
		--overwrite

# ─── Deploy + identity setup ──────────────────────────────────────────────────

# Idempotent. Funds via testnet friendbot.
setup-accounts:
	@for who in $(ADMIN) $(PAYER) $(RECEIVER); do \
		if stellar keys ls 2>/dev/null | grep -qx "$$who"; then \
			echo "$$who already exists; skipping."; \
		else \
			echo "Generating + funding $$who…"; \
			stellar keys generate --network $(NETWORK) --fund $$who; \
		fi; \
	done

# Deploys and captures the contract id to ./.contract-id for the invoke-* targets.
deploy-testnet: build
	@stellar contract deploy \
		--wasm target/wasm32v1-none/release/fractapay.wasm \
		--network $(NETWORK) \
		--source-account $(ADMIN) \
		-- \
		--admin $(ADMIN) | tee /dev/tty | awk '/^C[A-Z2-7]{55}$$/ {id=$$0} END {print id}' > .contract-id
	@echo "Saved contract id to .contract-id: $$(cat .contract-id)"

# ─── Invoke helpers ───────────────────────────────────────────────────────────

require-contract-id:
	@if [ -z "$(CONTRACT_ID)" ]; then \
		echo "CONTRACT_ID is empty. Run 'make deploy-testnet' first or pass CONTRACT_ID=C…"; \
		exit 1; \
	fi

print-contract-id:
	@echo $(CONTRACT_ID)

invoke-version: require-contract-id
	stellar contract invoke \
		--id $(CONTRACT_ID) \
		--network $(NETWORK) \
		--source-account $(ADMIN) \
		-- \
		version

# Bob (payer) → Charlie (receiver), native XLM, Flat 12345 stroops at each timestamp.
# Notes:
#   * Stellar CLI ≥ 22 accepts bare unit variants (`Flat`); if yours rejects it, try `'"Flat"'`.
#   * --payment_timestamps is a JSON array of u64 unix seconds, strictly ascending.
#   * No reference amount at create — for Royalties/Mix it is declared per payment at execute.
#   * Prints the new agreement's u64 id; re-pass it via AGREEMENT_ID=<n>.
invoke-create-agreement: require-contract-id
	stellar contract invoke \
		--id $(CONTRACT_ID) \
		--network $(NETWORK) \
		--source-account $(PAYER) \
		-- \
		create_agreement \
		--payer $(PAYER) \
		--receiver $(RECEIVER) \
		--token $(XLM_SAC) \
		--contract_type Flat \
		--flat_amount $(FLAT_AMOUNT) \
		--percent_bps 0 \
		--payment_timestamps '$(PAYMENT_TIMESTAMPS)'

# Royalties agreement at 25% (2500 bps). flat_amount 0; the royalty base is declared
# per payment at execute time (`make invoke-execute REFERENCE_AMOUNT=…`).
invoke-create-royalties: require-contract-id
	stellar contract invoke \
		--id $(CONTRACT_ID) \
		--network $(NETWORK) \
		--source-account $(PAYER) \
		-- \
		create_agreement \
		--payer $(PAYER) \
		--receiver $(RECEIVER) \
		--token $(XLM_SAC) \
		--contract_type Royalties \
		--flat_amount 0 \
		--percent_bps 2500 \
		--payment_timestamps '$(PAYMENT_TIMESTAMPS)'

# Lists agreements whose next scheduled timestamp (at next_payment_index) has elapsed.
invoke-get-due: require-contract-id
	stellar contract invoke \
		--id $(CONTRACT_ID) \
		--network $(NETWORK) \
		--source-account $(PAYER) \
		-- \
		get_due_payments \
		--payer $(PAYER)

# Lists each Active agreement's upcoming payment (at next_payment_index) whether due yet or not.
invoke-get-next: require-contract-id
	stellar contract invoke \
		--id $(CONTRACT_ID) \
		--network $(NETWORK) \
		--source-account $(PAYER) \
		-- \
		get_next_payments \
		--payer $(PAYER)

invoke-get-agreement: require-contract-id
	stellar contract invoke \
		--id $(CONTRACT_ID) \
		--network $(NETWORK) \
		--source-account $(PAYER) \
		-- \
		get_agreement \
		--id $(AGREEMENT_ID)

# Pays exactly ONE due timestamp (the one at next_payment_index) and advances the
# cursor. --reference_amount is the volatile royalty base for this payment (Flat
# ignores it; Royalties needs it > 0). Run again to catch up on further elapsed
# timestamps. Panics: #3 not due yet, #4 schedule complete, #6 zero/negative amount
# (e.g. Royalties with no reference), #8 insufficient payer balance.
invoke-execute: require-contract-id
	stellar contract invoke \
		--id $(CONTRACT_ID) \
		--network $(NETWORK) \
		--source-account $(PAYER) \
		-- \
		execute_due_payment \
		--id $(AGREEMENT_ID) \
		--reference_amount $(REFERENCE_AMOUNT)

invoke-history: require-contract-id
	stellar contract invoke \
		--id $(CONTRACT_ID) \
		--network $(NETWORK) \
		--source-account $(PAYER) \
		-- \
		get_payment_history \
		--payer $(PAYER)

# Pause/resume is a status gate only — timestamps are absolute and never shifted.
# While paused, execute is blocked; on resume any elapsed timestamp is due at once.
invoke-pause: require-contract-id
	stellar contract invoke \
		--id $(CONTRACT_ID) \
		--network $(NETWORK) \
		--source-account $(PAYER) \
		-- \
		pause_agreement \
		--id $(AGREEMENT_ID)

invoke-resume: require-contract-id
	stellar contract invoke \
		--id $(CONTRACT_ID) \
		--network $(NETWORK) \
		--source-account $(PAYER) \
		-- \
		resume_agreement \
		--id $(AGREEMENT_ID)

invoke-end: require-contract-id
	stellar contract invoke \
		--id $(CONTRACT_ID) \
		--network $(NETWORK) \
		--source-account $(PAYER) \
		-- \
		end_agreement \
		--id $(AGREEMENT_ID)

# Replaces terms + schedule. New --payment_timestamps must be non-empty, strictly
# ascending, end in the future, and have length >= the already-paid count
# (next_payment_index); the cursor is preserved. Fails with #9 if the agreement is Ended.
edit-agreement: require-contract-id
	stellar contract invoke \
		--id $(CONTRACT_ID) \
		--network $(NETWORK) \
		--source-account $(PAYER) \
		-- \
		edit_agreement \
		--id $(AGREEMENT_ID) \
		--contract_type Flat \
		--flat_amount 120000000 \
		--percent_bps 0 \
		--payment_timestamps '$(PAYMENT_TIMESTAMPS)'
