#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::Address as _,
    token::{Client as TokenClient, StellarAssetClient},
    Address, Env,
};

fn create_token<'a>(e: &Env, admin: &Address) -> (TokenClient<'a>, StellarAssetClient<'a>) {
    let sac = e.register_stellar_asset_contract_v2(admin.clone());
    (
        TokenClient::new(e, &sac.address()),
        StellarAssetClient::new(e, &sac.address()),
    )
}

#[test]
fn test_batch_pay_single() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);

    let (token, token_admin) = create_token(&env, &admin);

    // Mint 1000 XLM (in stroops) to sender
    token_admin.mint(&sender, &10_000_000_000_i128);

    let contract_id = env.register_contract(None, FractaPayContract);
    let contract = FractaPayContractClient::new(&env, &contract_id);

    let payments = vec![
        &env,
        Payment {
            address: recipient.clone(),
            amount: 100_000_000_i128, // 10 XLM
        },
    ];

    let total = contract.batch_pay(&token.address, &sender, &payments);

    assert_eq!(total, 100_000_000_i128);
    assert_eq!(token.balance(&recipient), 100_000_000_i128);
    assert_eq!(token.balance(&sender), 9_900_000_000_i128);
}

#[test]
fn test_batch_pay_multiple() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient1 = Address::generate(&env);
    let recipient2 = Address::generate(&env);
    let recipient3 = Address::generate(&env);

    let (token, token_admin) = create_token(&env, &admin);
    token_admin.mint(&sender, &100_000_000_000_i128);

    let contract_id = env.register_contract(None, FractaPayContract);
    let contract = FractaPayContractClient::new(&env, &contract_id);

    let payments = vec![
        &env,
        Payment {
            address: recipient1.clone(),
            amount: 500_000_000_i128, // 50 XLM
        },
        Payment {
            address: recipient2.clone(),
            amount: 300_000_000_i128, // 30 XLM
        },
        Payment {
            address: recipient3.clone(),
            amount: 200_000_000_i128, // 20 XLM
        },
    ];

    let total = contract.batch_pay(&token.address, &sender, &payments);

    assert_eq!(total, 1_000_000_000_i128); // 100 XLM total
    assert_eq!(token.balance(&recipient1), 500_000_000_i128);
    assert_eq!(token.balance(&recipient2), 300_000_000_i128);
    assert_eq!(token.balance(&recipient3), 200_000_000_i128);
}

#[test]
fn test_version() {
    let env = Env::default();
    let contract_id = env.register_contract(None, FractaPayContract);
    let contract = FractaPayContractClient::new(&env, &contract_id);

    let version = contract.version();
    assert_eq!(version, soroban_sdk::String::from_str(&env, "0.1.0"));
}
