#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{Client as TokenClient, StellarAssetClient},
    Address, BytesN, Env,
};

const DAY_S: u64 = 86_400;
const WEEK_S: u64 = 7 * DAY_S;
const MONTH_S: u64 = 30 * DAY_S;

fn create_token<'a>(env: &Env, admin: &Address) -> (TokenClient<'a>, StellarAssetClient<'a>) {
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    (
        TokenClient::new(env, &sac.address()),
        StellarAssetClient::new(env, &sac.address()),
    )
}

fn register_contract(env: &Env, admin: &Address) -> Address {
    env.register(FractaPayContract, (admin,))
}

fn advance_ledger(env: &Env, seconds: u64) {
    env.ledger().with_mut(|info| {
        info.timestamp = info.timestamp.saturating_add(seconds);
    });
}

fn set_ledger_timestamp(env: &Env, timestamp: u64) {
    env.ledger().with_mut(|info| {
        info.timestamp = timestamp;
    });
}

fn now(env: &Env) -> u64 {
    env.ledger().timestamp()
}

#[test]
fn test_version() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);
    assert_eq!(
        client.version(),
        soroban_sdk::String::from_str(&env, "0.4.0")
    );
}

#[test]
fn test_get_admin_returns_constructor_admin() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);
    assert_eq!(client.get_admin(), admin);
}

#[test]
#[should_panic]
fn test_upgrade_panics_without_admin_auth() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);
    let dummy_hash = BytesN::<32>::from_array(&env, &[0u8; 32]);
    client.upgrade(&dummy_hash);
}

#[test]
fn test_create_flat_agreement() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, _) = create_token(&env, &admin);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end = now(&env) + 365 * DAY_S;
    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &0i128,
        &Frequency::Weekly,
        &end,
    );

    assert_eq!(id, 0);

    let agreement = client.get_agreement(&id);
    assert_eq!(agreement.payer, payer);
    assert_eq!(agreement.receiver, receiver);
    assert_eq!(agreement.flat_amount, 10_000_i128);
    assert_eq!(agreement.status, Status::Active);
    assert_eq!(agreement.last_paid_at, now(&env));

    let ids = client.get_payer_agreements(&payer);
    assert_eq!(ids.len(), 1);
    assert_eq!(ids.get(0).unwrap(), 0);

    let id2 = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &20_000_i128,
        &0u32,
        &0i128,
        &Frequency::Monthly,
        &end,
    );
    assert_eq!(id2, 1);
    assert_eq!(client.get_payer_agreements(&payer).len(), 2);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn test_create_invalid_bps_panics() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, _) = create_token(&env, &admin);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end = now(&env) + 365 * DAY_S;
    client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Royalties,
        &0i128,
        &10_001u32,
        &1_000_000_i128,
        &Frequency::Monthly,
        &end,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_create_invalid_window_panics() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 10_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, _) = create_token(&env, &admin);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &1_000_i128,
        &0u32,
        &0i128,
        &Frequency::Weekly,
        &5_000u64,
    );
}

#[test]
fn test_execute_flat_due() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &1_000_000_i128);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end = now(&env) + 365 * DAY_S;
    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &0i128,
        &Frequency::Weekly,
        &end,
    );

    advance_ledger(&env, WEEK_S);

    let paid = client.execute_due_payment(&id);
    assert_eq!(paid, 10_000_i128);
    assert_eq!(token.balance(&receiver), 10_000_i128);
    assert_eq!(token.balance(&payer), 990_000_i128);

    let agreement = client.get_agreement(&id);
    assert_eq!(agreement.last_amount_paid, 10_000_i128);
    assert_eq!(agreement.last_paid_at, now(&env));

    let history = client.get_payment_history(&payer);
    assert_eq!(history.len(), 1);
    let entry = history.get(0).unwrap();
    assert_eq!(entry.agreement_id, id);
    assert_eq!(entry.amount, 10_000_i128);
    assert_eq!(entry.receiver, receiver);
}

#[test]
fn test_execute_pulls_from_payer_wallet() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &1_000_i128);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end = now(&env) + 365 * DAY_S;
    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &100_i128,
        &0u32,
        &0i128,
        &Frequency::Weekly,
        &end,
    );

    advance_ledger(&env, WEEK_S);
    let paid = client.execute_due_payment(&id);

    assert_eq!(paid, 100_i128);
    assert_eq!(token.balance(&payer), 900_i128);
    assert_eq!(token.balance(&receiver), 100_i128);
    assert_eq!(token.balance(&contract_id), 0);
}

#[test]
fn test_flat_agreement_in_xlm() {
    // In Soroban testutils, XLM is exercised as a SAC like any other asset —
    // there is no separate "native" client. We label the SAC as XLM and use
    // stroop amounts (1 XLM = 10_000_000 stroops) to match mainnet semantics.
    const STROOPS_PER_XLM: i128 = 10_000_000;

    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (xlm, xlm_admin) = create_token(&env, &admin);

    // Fund payer with 100 XLM
    let starting_balance = 100 * STROOPS_PER_XLM;
    xlm_admin.mint(&payer, &starting_balance);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    // Flat agreement: 5 XLM per week
    let flat_stroops = 5 * STROOPS_PER_XLM;
    let end = now(&env) + 365 * DAY_S;
    let id = client.create_agreement(
        &payer,
        &receiver,
        &xlm.address,
        &ContractType::Flat,
        &flat_stroops,
        &0u32,
        &0i128,
        &Frequency::Weekly,
        &end,
    );

    let agreement = client.get_agreement(&id);
    assert_eq!(agreement.contract_type, ContractType::Flat);
    assert_eq!(agreement.flat_amount, flat_stroops);
    assert_eq!(agreement.token, xlm.address);
    assert_eq!(agreement.status, Status::Active);

    advance_ledger(&env, WEEK_S);
    let paid = client.execute_due_payment(&id);

    assert_eq!(paid, flat_stroops);
    assert_eq!(xlm.balance(&payer), starting_balance - flat_stroops);
    assert_eq!(xlm.balance(&receiver), flat_stroops);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_execute_not_due_panics() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &1_000_000_i128);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end = now(&env) + 365 * DAY_S;
    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &0i128,
        &Frequency::Weekly,
        &end,
    );

    advance_ledger(&env, DAY_S);
    client.execute_due_payment(&id);
}

#[test]
fn test_execute_royalties() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &10_000_000_i128);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end = now(&env) + 365 * DAY_S;
    // 12.5% (1250 bps) of 1_000_000 = 125_000
    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Royalties,
        &0i128,
        &1_250u32,
        &1_000_000_i128,
        &Frequency::Monthly,
        &end,
    );

    advance_ledger(&env, MONTH_S);

    let paid = client.execute_due_payment(&id);
    assert_eq!(paid, 125_000_i128);
    assert_eq!(token.balance(&receiver), 125_000_i128);
}

#[test]
fn test_execute_mix() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &10_000_000_i128);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end = now(&env) + 365 * DAY_S;
    // flat 50_000 + 10% of 1_000_000 = 50_000 + 100_000 = 150_000
    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Mix,
        &50_000_i128,
        &1_000u32,
        &1_000_000_i128,
        &Frequency::Weekly,
        &end,
    );

    advance_ledger(&env, WEEK_S);

    let paid = client.execute_due_payment(&id);
    assert_eq!(paid, 150_000_i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_execute_insufficient_balance_panics() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &50_i128);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end = now(&env) + 365 * DAY_S;
    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &100_i128,
        &0u32,
        &0i128,
        &Frequency::Weekly,
        &end,
    );

    advance_ledger(&env, WEEK_S);
    client.execute_due_payment(&id);
}

#[test]
fn test_pause_shifts_schedule() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &1_000_000_i128);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end = now(&env) + 365 * DAY_S;
    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &0i128,
        &Frequency::Weekly,
        &end,
    );

    // pause after 3 days
    advance_ledger(&env, 3 * DAY_S);
    client.pause_agreement(&id);

    // 10 days pass while paused
    advance_ledger(&env, 10 * DAY_S);
    client.resume_agreement(&id);

    // immediately after resume, still not due (last_paid_at shifted by 10 days)
    let due = client.get_due_payments(&payer);
    assert_eq!(due.len(), 0);

    // advance remaining 4 days of the week and 1 second
    advance_ledger(&env, 4 * DAY_S);
    let due = client.get_due_payments(&payer);
    assert_eq!(due.len(), 1);
    assert_eq!(due.get(0).unwrap().id, id);
    assert_eq!(due.get(0).unwrap().amount, 10_000_i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #9)")]
fn test_paused_execute_panics() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &1_000_000_i128);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end = now(&env) + 365 * DAY_S;
    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &0i128,
        &Frequency::Weekly,
        &end,
    );

    advance_ledger(&env, WEEK_S);
    client.pause_agreement(&id);
    client.execute_due_payment(&id);
}

#[test]
#[should_panic(expected = "Error(Contract, #9)")]
fn test_execute_ended_panics() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &1_000_000_i128);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end = now(&env) + 365 * DAY_S;
    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &0i128,
        &Frequency::Weekly,
        &end,
    );

    advance_ledger(&env, WEEK_S);
    client.end_agreement(&id);
    client.execute_due_payment(&id);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_after_end_timestamp_panics() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &1_000_000_i128);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end = now(&env) + 2 * WEEK_S;
    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &0i128,
        &Frequency::Weekly,
        &end,
    );

    advance_ledger(&env, 3 * WEEK_S);
    client.execute_due_payment(&id);
}

#[test]
fn test_execute_all_due() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver_a = Address::generate(&env);
    let receiver_b = Address::generate(&env);
    let receiver_c = Address::generate(&env);
    let (token, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &10_000_000_i128);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end = now(&env) + 365 * DAY_S;
    // weekly, will be due after a week
    let id_a = client.create_agreement(
        &payer,
        &receiver_a,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &0i128,
        &Frequency::Weekly,
        &end,
    );
    // weekly, will be due after a week
    let id_b = client.create_agreement(
        &payer,
        &receiver_b,
        &token.address,
        &ContractType::Flat,
        &20_000_i128,
        &0u32,
        &0i128,
        &Frequency::Weekly,
        &end,
    );
    // monthly, NOT due after just one week
    let id_c = client.create_agreement(
        &payer,
        &receiver_c,
        &token.address,
        &ContractType::Flat,
        &50_000_i128,
        &0u32,
        &0i128,
        &Frequency::Monthly,
        &end,
    );

    advance_ledger(&env, WEEK_S);
    let total = client.execute_all_due(&payer);

    assert_eq!(total, 30_000_i128);
    assert_eq!(token.balance(&receiver_a), 10_000_i128);
    assert_eq!(token.balance(&receiver_b), 20_000_i128);
    assert_eq!(token.balance(&receiver_c), 0);

    let history = client.get_payment_history(&payer);
    assert_eq!(history.len(), 2);

    let _ = (id_a, id_b, id_c);
}

#[test]
fn test_get_due_payments() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, _) = create_token(&env, &admin);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end = now(&env) + 365 * DAY_S;
    let id1 = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &0i128,
        &Frequency::Weekly,
        &end,
    );
    let _id2 = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &20_000_i128,
        &0u32,
        &0i128,
        &Frequency::Monthly,
        &end,
    );

    advance_ledger(&env, WEEK_S);
    let due = client.get_due_payments(&payer);
    assert_eq!(due.len(), 1);
    assert_eq!(due.get(0).unwrap().id, id1);
    assert_eq!(due.get(0).unwrap().amount, 10_000_i128);
}

#[test]
fn test_multiple_payers_isolated() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer_a = Address::generate(&env);
    let payer_b = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, _) = create_token(&env, &admin);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end = now(&env) + 365 * DAY_S;
    let id_a = client.create_agreement(
        &payer_a,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &5_000_i128,
        &0u32,
        &0i128,
        &Frequency::Weekly,
        &end,
    );
    let id_b = client.create_agreement(
        &payer_b,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &7_000_i128,
        &0u32,
        &0i128,
        &Frequency::Weekly,
        &end,
    );

    assert_eq!(client.get_payer_agreements(&payer_a).len(), 1);
    assert_eq!(client.get_payer_agreements(&payer_b).len(), 1);
    assert_eq!(client.get_payer_agreements(&payer_a).get(0).unwrap(), id_a);
    assert_eq!(client.get_payer_agreements(&payer_b).get(0).unwrap(), id_b);
}

#[test]
fn test_same_receiver_multiple_agreements() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &10_000_000_i128);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end = now(&env) + 365 * DAY_S;
    let weekly = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &0i128,
        &Frequency::Weekly,
        &end,
    );
    let monthly = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &50_000_i128,
        &0u32,
        &0i128,
        &Frequency::Monthly,
        &end,
    );

    advance_ledger(&env, WEEK_S);
    client.execute_due_payment(&weekly);
    assert_eq!(token.balance(&receiver), 10_000_i128);

    advance_ledger(&env, 3 * WEEK_S + DAY_S);
    let total = client.execute_all_due(&payer);
    // weekly: last paid at week_s+1000, now = 4*week_s+day_s+1000 → 22 days since last paid ≥ 7 → due once
    // monthly: last_paid_at=1000, now ≈ 29 days → not due
    assert_eq!(total, 10_000_i128);

    let _ = monthly;
}

#[test]
fn test_set_reference_updates_royalty_amount() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &10_000_000_i128);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end = now(&env) + 365 * DAY_S;
    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Royalties,
        &0i128,
        &1_000u32, // 10%
        &500_000_i128,
        &Frequency::Weekly,
        &end,
    );

    client.set_reference(&id, &1_000_000_i128);

    advance_ledger(&env, WEEK_S);
    let paid = client.execute_due_payment(&id);
    assert_eq!(paid, 100_000_i128); // 10% of 1_000_000
}

#[test]
fn test_edit_agreement_preserves_immutable_fields() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, _) = create_token(&env, &admin);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end1 = now(&env) + 365 * DAY_S;
    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &0i128,
        &Frequency::Weekly,
        &end1,
    );
    let original = client.get_agreement(&id);

    let end2 = now(&env) + 200 * DAY_S;
    client.edit_agreement(
        &id,
        &ContractType::Flat,
        &25_000_i128,
        &0u32,
        &0i128,
        &Frequency::Monthly,
        &end2,
    );

    let edited = client.get_agreement(&id);
    assert_eq!(edited.payer, original.payer);
    assert_eq!(edited.receiver, original.receiver);
    assert_eq!(edited.token, original.token);
    assert_eq!(edited.last_paid_at, original.last_paid_at);
    assert_eq!(edited.flat_amount, 25_000_i128);
    assert_eq!(edited.frequency, Frequency::Monthly);
    assert_eq!(edited.end_timestamp, end2);
}

// ============================================================================
// Coverage: create_agreement validation
// ============================================================================

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn test_create_flat_zero_amount_panics() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, _) = create_token(&env, &admin);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end = now(&env) + 365 * DAY_S;
    client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &0i128,
        &0u32,
        &0i128,
        &Frequency::Weekly,
        &end,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn test_create_royalties_zero_bps_panics() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, _) = create_token(&env, &admin);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end = now(&env) + 365 * DAY_S;
    client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Royalties,
        &0i128,
        &0u32,
        &1_000_000_i128,
        &Frequency::Weekly,
        &end,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn test_create_mix_zero_bps_panics() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, _) = create_token(&env, &admin);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end = now(&env) + 365 * DAY_S;
    client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Mix,
        &10_000_i128,
        &0u32,
        &1_000_000_i128,
        &Frequency::Weekly,
        &end,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn test_create_mix_zero_flat_panics() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, _) = create_token(&env, &admin);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end = now(&env) + 365 * DAY_S;
    client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Mix,
        &0i128,
        &1_000u32,
        &1_000_000_i128,
        &Frequency::Weekly,
        &end,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn test_create_negative_flat_amount_panics() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, _) = create_token(&env, &admin);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end = now(&env) + 365 * DAY_S;
    client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &-1_i128,
        &0u32,
        &0i128,
        &Frequency::Weekly,
        &end,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn test_create_negative_reference_panics() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, _) = create_token(&env, &admin);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end = now(&env) + 365 * DAY_S;
    client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Royalties,
        &0i128,
        &1_000u32,
        &-1_i128,
        &Frequency::Weekly,
        &end,
    );
}

// ============================================================================
// Coverage: edit_agreement error paths
// ============================================================================

fn create_default_flat<'a>(
    env: &Env,
    client: &'a FractaPayContractClient<'a>,
    payer: &Address,
    receiver: &Address,
    token: &Address,
) -> u64 {
    let end = now(env) + 365 * DAY_S;
    client.create_agreement(
        payer,
        receiver,
        token,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &0i128,
        &Frequency::Weekly,
        &end,
    )
}

#[test]
#[should_panic(expected = "Error(Contract, #9)")]
fn test_edit_ended_agreement_panics() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, _) = create_token(&env, &admin);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let id = create_default_flat(&env, &client, &payer, &receiver, &token.address);
    client.end_agreement(&id);

    let end = now(&env) + 200 * DAY_S;
    client.edit_agreement(
        &id,
        &ContractType::Flat,
        &20_000_i128,
        &0u32,
        &0i128,
        &Frequency::Monthly,
        &end,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_edit_invalid_window_panics() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 10_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, _) = create_token(&env, &admin);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let id = create_default_flat(&env, &client, &payer, &receiver, &token.address);
    client.edit_agreement(
        &id,
        &ContractType::Flat,
        &20_000_i128,
        &0u32,
        &0i128,
        &Frequency::Monthly,
        &5_000u64,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn test_edit_invalid_bps_panics() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, _) = create_token(&env, &admin);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let id = create_default_flat(&env, &client, &payer, &receiver, &token.address);
    let end = now(&env) + 200 * DAY_S;
    client.edit_agreement(
        &id,
        &ContractType::Royalties,
        &0_i128,
        &10_001u32,
        &1_000_000_i128,
        &Frequency::Monthly,
        &end,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn test_edit_negative_amount_panics() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, _) = create_token(&env, &admin);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let id = create_default_flat(&env, &client, &payer, &receiver, &token.address);
    let end = now(&env) + 200 * DAY_S;
    client.edit_agreement(
        &id,
        &ContractType::Flat,
        &-1_i128,
        &0u32,
        &0i128,
        &Frequency::Weekly,
        &end,
    );
}

// ============================================================================
// Coverage: set_reference error paths
// ============================================================================

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn test_set_reference_negative_panics() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, _) = create_token(&env, &admin);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let id = create_default_flat(&env, &client, &payer, &receiver, &token.address);
    client.set_reference(&id, &-1_i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #9)")]
fn test_set_reference_ended_panics() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, _) = create_token(&env, &admin);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let id = create_default_flat(&env, &client, &payer, &receiver, &token.address);
    client.end_agreement(&id);
    client.set_reference(&id, &500_000_i128);
}

// ============================================================================
// Coverage: lifecycle WrongStatus
// ============================================================================

#[test]
#[should_panic(expected = "Error(Contract, #9)")]
fn test_pause_already_paused_panics() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, _) = create_token(&env, &admin);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let id = create_default_flat(&env, &client, &payer, &receiver, &token.address);
    client.pause_agreement(&id);
    client.pause_agreement(&id);
}

#[test]
#[should_panic(expected = "Error(Contract, #9)")]
fn test_pause_ended_panics() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, _) = create_token(&env, &admin);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let id = create_default_flat(&env, &client, &payer, &receiver, &token.address);
    client.end_agreement(&id);
    client.pause_agreement(&id);
}

#[test]
#[should_panic(expected = "Error(Contract, #9)")]
fn test_resume_active_panics() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, _) = create_token(&env, &admin);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let id = create_default_flat(&env, &client, &payer, &receiver, &token.address);
    client.resume_agreement(&id);
}

#[test]
#[should_panic(expected = "Error(Contract, #9)")]
fn test_resume_ended_panics() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, _) = create_token(&env, &admin);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let id = create_default_flat(&env, &client, &payer, &receiver, &token.address);
    client.end_agreement(&id);
    client.resume_agreement(&id);
}

#[test]
#[should_panic(expected = "Error(Contract, #9)")]
fn test_end_already_ended_panics() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, _) = create_token(&env, &admin);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let id = create_default_flat(&env, &client, &payer, &receiver, &token.address);
    client.end_agreement(&id);
    client.end_agreement(&id);
}

// ============================================================================
// Coverage: query edge cases
// ============================================================================

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_get_agreement_missing_panics() {
    let env = Env::default();
    set_ledger_timestamp(&env, 1_000);
    let admin = Address::generate(&env);
    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);
    client.get_agreement(&999_u64);
}

#[test]
fn test_get_payment_history_empty() {
    let env = Env::default();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let history = client.get_payment_history(&payer);
    assert_eq!(history.len(), 0);
}

#[test]
fn test_get_payer_agreements_empty() {
    let env = Env::default();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let ids = client.get_payer_agreements(&payer);
    assert_eq!(ids.len(), 0);
}

// ============================================================================
// Coverage: Custom frequency
// ============================================================================

#[test]
fn test_execute_custom_frequency() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &1_000_000_i128);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end = now(&env) + 365 * DAY_S;
    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &0i128,
        &Frequency::Custom(3 * DAY_S),
        &end,
    );

    advance_ledger(&env, 3 * DAY_S);
    let paid = client.execute_due_payment(&id);
    assert_eq!(paid, 10_000_i128);
    assert_eq!(token.balance(&receiver), 10_000_i128);
}

// ============================================================================
// Coverage: execute_all_due non-strict
// ============================================================================

#[test]
fn test_execute_all_due_skips_paused_and_ended() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let r_active = Address::generate(&env);
    let r_paused = Address::generate(&env);
    let r_ended = Address::generate(&env);
    let (token, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &10_000_000_i128);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end = now(&env) + 365 * DAY_S;

    // Active, will be due
    let id_active = client.create_agreement(
        &payer,
        &r_active,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &0i128,
        &Frequency::Weekly,
        &end,
    );
    // Paused
    let id_paused = client.create_agreement(
        &payer,
        &r_paused,
        &token.address,
        &ContractType::Flat,
        &20_000_i128,
        &0u32,
        &0i128,
        &Frequency::Biweekly,
        &end,
    );
    client.pause_agreement(&id_paused);
    // Ended
    let id_ended = client.create_agreement(
        &payer,
        &r_ended,
        &token.address,
        &ContractType::Flat,
        &30_000_i128,
        &0u32,
        &0i128,
        &Frequency::Quarterly,
        &end,
    );
    client.end_agreement(&id_ended);

    advance_ledger(&env, WEEK_S);
    let total = client.execute_all_due(&payer);
    assert_eq!(total, 10_000_i128);
    assert_eq!(token.balance(&r_active), 10_000_i128);
    assert_eq!(token.balance(&r_paused), 0);
    assert_eq!(token.balance(&r_ended), 0);

    let _ = id_active;
}

#[test]
fn test_execute_all_due_skips_insufficient_balance() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let r_small = Address::generate(&env);
    let r_big = Address::generate(&env);
    let (token, token_admin) = create_token(&env, &admin);
    // Wallet only big enough for the smaller agreement
    token_admin.mint(&payer, &10_000_i128);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end = now(&env) + 365 * DAY_S;
    // Smaller agreement (fits): order matters — created first, paid first
    let _id_small = client.create_agreement(
        &payer,
        &r_small,
        &token.address,
        &ContractType::Flat,
        &6_000_i128,
        &0u32,
        &0i128,
        &Frequency::Weekly,
        &end,
    );
    // Larger agreement (would not fit after small paid; payer has 4_000 left)
    let _id_big = client.create_agreement(
        &payer,
        &r_big,
        &token.address,
        &ContractType::Flat,
        &8_000_i128,
        &0u32,
        &0i128,
        &Frequency::Weekly,
        &end,
    );

    advance_ledger(&env, WEEK_S);
    let total = client.execute_all_due(&payer);
    assert_eq!(total, 6_000_i128);
    assert_eq!(token.balance(&r_small), 6_000_i128);
    assert_eq!(token.balance(&r_big), 0);
    assert_eq!(token.balance(&payer), 4_000_i128);
}

#[test]
fn test_execute_all_due_partial_when_balance_drains_midloop() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let r_a = Address::generate(&env);
    let r_b = Address::generate(&env);
    let r_c = Address::generate(&env);
    let (token, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &250_i128);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end = now(&env) + 365 * DAY_S;
    for receiver in &[r_a.clone(), r_b.clone(), r_c.clone()] {
        client.create_agreement(
            &payer,
            receiver,
            &token.address,
            &ContractType::Flat,
            &100_i128,
            &0u32,
            &0i128,
            &Frequency::Weekly,
            &end,
        );
    }

    advance_ledger(&env, WEEK_S);
    let total = client.execute_all_due(&payer);

    assert_eq!(total, 200_i128);
    assert_eq!(token.balance(&r_a), 100_i128);
    assert_eq!(token.balance(&r_b), 100_i128);
    assert_eq!(token.balance(&r_c), 0);
    assert_eq!(token.balance(&payer), 50_i128);

    let history = client.get_payment_history(&payer);
    assert_eq!(history.len(), 2);
}

#[test]
fn test_execute_all_due_no_agreements_returns_zero() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let total = client.execute_all_due(&payer);
    assert_eq!(total, 0);
}

// ============================================================================
// Coverage: successive cycles
// ============================================================================

#[test]
fn test_multiple_cycles_advance_correctly() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &1_000_000_i128);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let end = now(&env) + 365 * DAY_S;
    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &0i128,
        &Frequency::Weekly,
        &end,
    );

    advance_ledger(&env, WEEK_S);
    client.execute_due_payment(&id);
    let after_first = client.get_agreement(&id).last_paid_at;

    advance_ledger(&env, WEEK_S);
    client.execute_due_payment(&id);

    assert_eq!(token.balance(&receiver), 20_000_i128);
    assert_eq!(token.balance(&payer), 980_000_i128);

    let after_second = client.get_agreement(&id).last_paid_at;
    assert!(after_second > after_first);
    assert_eq!(after_second, after_first + WEEK_S);

    let history = client.get_payment_history(&payer);
    assert_eq!(history.len(), 2);
}

// ============================================================================
// Coverage: upgrade auth gate passes
// ============================================================================

// With mock_all_auths the admin auth check succeeds; the call still panics later
// when update_current_contract_wasm rejects an unregistered hash. The panic is
// not from require_auth — this exercises the success branch of the auth gate.
#[test]
#[should_panic]
fn test_upgrade_passes_admin_auth_then_fails_on_invalid_wasm() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let dummy_hash = BytesN::<32>::from_array(&env, &[7u8; 32]);
    client.upgrade(&dummy_hash);
}
