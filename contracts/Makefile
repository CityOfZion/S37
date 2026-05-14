.PHONY: build test fmt fmt-check lint clean optimize check install-tools \
	deploy-testnet setup-accounts require-contract-id print-contract-id \
	invoke-version invoke-create-agreement invoke-get-due invoke-get-agreement \
	invoke-execute invoke-history invoke-pause invoke-resume invoke-end

# ─── Identities + scenario constants ──────────────────────────────────────────
# Override per invocation: `make invoke-execute AGREEMENT_ID=1`
PAYER             ?= Bob
RECEIVER          ?= charlie
ADMIN             ?= alice
NETWORK           ?= testnet
FLAT_AMOUNT       ?= 12345
FREQUENCY_SECONDS ?= 180

# Contract + agreement state — default reads from .contract-id (written by deploy-testnet)
CONTRACT_ID       ?= CAVEWL2VRXYUZBGJCDPETZSHXNB7OZCATWVSGXF2GAARMRL6VJEMQW5L
AGREEMENT_ID      ?= 0

# Native XLM SAC address on the chosen network (derived lazily)
XLM_SAC            = CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC

# Default end_timestamp = now + 24h (room for many 3-minute cycles)
END_TIMESTAMP      = $(shell echo $$(( $$(date +%s) + 86400 )))

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

# Bob (payer) → Charlie (receiver), native XLM, Flat 12345 stroops every 180 s.
# Notes:
#   * Stellar CLI ≥ 22 accepts bare unit variants (`Flat`) and inline-JSON tuple
#     variants (`'{"Custom":180}'`). If your CLI rejects them, try `'"Flat"'` and
#     `'{"custom":180}'` (lowercase tag).
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
		--reference_amount 0 \
		--frequency '{"Custom":$(FREQUENCY_SECONDS)}' \
		--end_timestamp $(END_TIMESTAMP)

invoke-get-due: require-contract-id
	stellar contract invoke \
		--id $(CONTRACT_ID) \
		--network $(NETWORK) \
		--source-account $(PAYER) \
		-- \
		get_due_payments \
		--payer $(PAYER)

invoke-get-agreement: require-contract-id
	stellar contract invoke \
		--id $(CONTRACT_ID) \
		--network $(NETWORK) \
		--source-account $(PAYER) \
		-- \
		get_agreement \
		--id $(AGREEMENT_ID)

invoke-execute: require-contract-id
	stellar contract invoke \
		--id $(CONTRACT_ID) \
		--network $(NETWORK) \
		--source-account $(PAYER) \
		-- \
		execute_due_payment \
		--id $(AGREEMENT_ID)

invoke-history: require-contract-id
	stellar contract invoke \
		--id $(CONTRACT_ID) \
		--network $(NETWORK) \
		--source-account $(PAYER) \
		-- \
		get_payment_history \
		--payer $(PAYER)

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
		--reference_amount 0 \
		--frequency '{"Custom":$(FREQUENCY_SECONDS)}' \
		--end_timestamp $(shell echo $$(( $$(date +%s) + 172800 )))
