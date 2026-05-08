#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, vec, Address, Env, Symbol, Vec,
};

/// A single payment entry: recipient address and amount in stroops.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Payment {
    pub address: Address,
    /// Amount in stroops (1 XLM = 10_000_000 stroops)
    pub amount: i128,
}

/// Events emitted by the contract
const BATCH_PAID: Symbol = symbol_short!("BATCHPAID");

#[contract]
pub struct OmniSplitContract;

#[contractimpl]
impl OmniSplitContract {
    /// Execute batch payments from `from` to multiple recipients.
    ///
    /// # Arguments
    /// * `token` - The Stellar token contract address (e.g. XLM native token wrapper)
    /// * `from` - The sender address (must authorize this transaction)
    /// * `payments` - A vector of Payment structs (address + amount)
    ///
    /// # Returns
    /// Total amount transferred
    pub fn batch_pay(env: Env, token: Address, from: Address, payments: Vec<Payment>) -> i128 {
        from.require_auth();

        let token_client = token::Client::new(&env, &token);
        let mut total: i128 = 0;

        for payment in payments.iter() {
            token_client.transfer(&from, &payment.address, &payment.amount);
            total += payment.amount;
        }

        env.events().publish((BATCH_PAID,), (from, total, payments.len() as u32));

        total
    }

    /// Get the version of this contract.
    pub fn version(env: Env) -> soroban_sdk::String {
        soroban_sdk::String::from_str(&env, "0.1.0")
    }
}

mod test;
