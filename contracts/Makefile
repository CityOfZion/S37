.PHONY: build test fmt lint clean optimize check

build:
	cargo build --release --target wasm32-unknown-unknown

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
		stellar contract optimize --wasm target/wasm32-unknown-unknown/release/omnisplit.wasm; \
	elif command -v wasm-opt >/dev/null 2>&1; then \
		wasm-opt -Oz -o target/wasm32-unknown-unknown/release/omnisplit_optimized.wasm \
			target/wasm32-unknown-unknown/release/omnisplit.wasm; \
	else \
		echo "Install stellar CLI or wasm-opt for optimization"; \
	fi

deploy-testnet: build
	stellar contract deploy \
		--wasm target/wasm32-unknown-unknown/release/omnisplit.wasm \
		--network testnet

install-tools:
	cargo install --locked stellar-cli --features opt
