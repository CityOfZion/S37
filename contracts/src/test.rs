#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{Client as TokenClient, StellarAssetClient},
    Address, BytesN, Env, Map,
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

/// Build a payment schedule of absolute timestamps from offsets relative to `now`.
fn schedule(env: &Env, offsets: &[u64]) -> Vec<u64> {
    let base = now(env);
    let mut timestamps = Vec::new(env);
    for offset in offsets.iter() {
        timestamps.push_back(base + *offset);
    }

    timestamps
}

#[test]
fn test_version() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);
    assert_eq!(
        client.version(),
        soroban_sdk::String::from_str(&env, "0.5.0")
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

    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &schedule(&env, &[WEEK_S]),
    );

    assert_eq!(id, 0);

    let agreement = client.get_agreement(&id);
    assert_eq!(agreement.payer, payer);
    assert_eq!(agreement.receiver, receiver);
    assert_eq!(agreement.flat_amount, 10_000_i128);
    assert_eq!(agreement.status, Status::Active);
    assert_eq!(agreement.next_payment_index, 0);
    assert_eq!(agreement.payment_timestamps.len(), 1);
    assert_eq!(agreement.payment_timestamps.get(0).unwrap(), 1_000 + WEEK_S);

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
        &schedule(&env, &[MONTH_S]),
    );
    assert_eq!(id2, 1);
    assert_eq!(client.get_payer_agreements(&payer).len(), 2);
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
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

    client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Royalties,
        &0i128,
        &10_001u32,
        &schedule(&env, &[MONTH_S]),
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
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

    // Empty schedule is invalid.
    client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &1_000_i128,
        &0u32,
        &Vec::new(&env),
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_create_unsorted_timestamps_panics() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, _) = create_token(&env, &admin);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    // Not strictly ascending.
    client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &1_000_i128,
        &0u32,
        &schedule(&env, &[2 * WEEK_S, WEEK_S]),
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_create_all_past_timestamps_panics() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 10_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, _) = create_token(&env, &admin);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    // Last timestamp is in the past (now = 10_000).
    let mut past = Vec::new(&env);
    past.push_back(5_000u64);
    client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &1_000_i128,
        &0u32,
        &past,
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

    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &schedule(&env, &[WEEK_S]),
    );

    advance_ledger(&env, WEEK_S);

    // Flat ignores the reference amount.
    let paid = client.execute_due_payment(&id, &0i128);
    assert_eq!(paid, 10_000_i128);
    assert_eq!(token.balance(&receiver), 10_000_i128);
    assert_eq!(token.balance(&payer), 990_000_i128);

    let agreement = client.get_agreement(&id);
    assert_eq!(agreement.last_amount_paid, 10_000_i128);
    assert_eq!(agreement.next_payment_index, 1);

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

    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &100_i128,
        &0u32,
        &schedule(&env, &[WEEK_S]),
    );

    advance_ledger(&env, WEEK_S);
    let paid = client.execute_due_payment(&id, &0i128);

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

    // Flat agreement: 5 XLM, one payment a week out
    let flat_stroops = 5 * STROOPS_PER_XLM;
    let id = client.create_agreement(
        &payer,
        &receiver,
        &xlm.address,
        &ContractType::Flat,
        &flat_stroops,
        &0u32,
        &schedule(&env, &[WEEK_S]),
    );

    let agreement = client.get_agreement(&id);
    assert_eq!(agreement.contract_type, ContractType::Flat);
    assert_eq!(agreement.flat_amount, flat_stroops);
    assert_eq!(agreement.token, xlm.address);
    assert_eq!(agreement.status, Status::Active);

    advance_ledger(&env, WEEK_S);
    let paid = client.execute_due_payment(&id, &0i128);

    assert_eq!(paid, flat_stroops);
    assert_eq!(xlm.balance(&payer), starting_balance - flat_stroops);
    assert_eq!(xlm.balance(&receiver), flat_stroops);
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
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

    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &schedule(&env, &[WEEK_S]),
    );

    advance_ledger(&env, DAY_S);
    client.execute_due_payment(&id, &0i128);
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

    // 12.5% (1250 bps) of the execute-time reference
    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Royalties,
        &0i128,
        &1_250u32,
        &schedule(&env, &[MONTH_S]),
    );

    advance_ledger(&env, MONTH_S);

    // Reference declared at execution: 12.5% of 1_000_000 = 125_000
    let paid = client.execute_due_payment(&id, &1_000_000_i128);
    assert_eq!(paid, 125_000_i128);
    assert_eq!(token.balance(&receiver), 125_000_i128);
}

#[test]
fn test_royalties_reference_varies_per_payment() {
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

    // 10% (1000 bps), two scheduled payments.
    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Royalties,
        &0i128,
        &1_000u32,
        &schedule(&env, &[WEEK_S, 2 * WEEK_S]),
    );

    // First payment: 10% of 1_000_000 = 100_000
    advance_ledger(&env, WEEK_S);
    let first = client.execute_due_payment(&id, &1_000_000_i128);
    assert_eq!(first, 100_000_i128);

    // Second payment with a different (volatile) reference: 10% of 2_000_000 = 200_000
    advance_ledger(&env, WEEK_S);
    let second = client.execute_due_payment(&id, &2_000_000_i128);
    assert_eq!(second, 200_000_i128);

    assert_eq!(token.balance(&receiver), 300_000_i128);
    assert_eq!(client.get_agreement(&id).last_amount_paid, 200_000_i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_execute_royalties_zero_reference_panics() {
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

    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Royalties,
        &0i128,
        &1_000u32,
        &schedule(&env, &[WEEK_S]),
    );

    advance_ledger(&env, WEEK_S);
    // Royalties with a zero reference yields a zero amount → InvalidAmount.
    client.execute_due_payment(&id, &0i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_execute_mix_negative_reference_panics() {
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

    // Mix with a positive flat floor; a negative reference must not be allowed to
    // erode it (would otherwise pay below flat_amount).
    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Mix,
        &50_000_i128,
        &1_000u32,
        &schedule(&env, &[WEEK_S]),
    );

    advance_ledger(&env, WEEK_S);
    client.execute_due_payment(&id, &-1_000_i128);
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

    // flat 50_000 + 10% of execute-time reference
    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Mix,
        &50_000_i128,
        &1_000u32,
        &schedule(&env, &[WEEK_S]),
    );

    advance_ledger(&env, WEEK_S);

    // 50_000 + 10% of 1_000_000 = 50_000 + 100_000 = 150_000
    let paid = client.execute_due_payment(&id, &1_000_000_i128);
    assert_eq!(paid, 150_000_i128);
}

#[test]
fn test_execute_mix_zero_reference_pays_flat_only() {
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

    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Mix,
        &50_000_i128,
        &1_000u32,
        &schedule(&env, &[WEEK_S]),
    );

    advance_ledger(&env, WEEK_S);
    // No reference → only the flat portion is paid.
    let paid = client.execute_due_payment(&id, &0i128);
    assert_eq!(paid, 50_000_i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
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

    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &100_i128,
        &0u32,
        &schedule(&env, &[WEEK_S]),
    );

    advance_ledger(&env, WEEK_S);
    client.execute_due_payment(&id, &0i128);
}

#[test]
fn test_pause_blocks_resume_reactivates() {
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

    // One payment due a week after creation.
    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &schedule(&env, &[WEEK_S]),
    );

    // Pause after 3 days, before the payment is due.
    advance_ledger(&env, 3 * DAY_S);
    client.pause_agreement(&id);

    // While paused, nothing is due even once the timestamp passes.
    advance_ledger(&env, 10 * DAY_S);
    let due = client.get_due_payments(&payer);
    assert_eq!(due.len(), 0);

    // Timestamps are absolute and unchanged: on resume the missed payment is
    // immediately due (status gate only, no schedule shift).
    client.resume_agreement(&id);
    let due = client.get_due_payments(&payer);
    assert_eq!(due.len(), 1);
    assert_eq!(due.get(0).unwrap().id, id);
    assert_eq!(due.get(0).unwrap().amount, 10_000_i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
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

    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &schedule(&env, &[WEEK_S]),
    );

    advance_ledger(&env, WEEK_S);
    client.pause_agreement(&id);
    client.execute_due_payment(&id, &0i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
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

    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &schedule(&env, &[WEEK_S]),
    );

    advance_ledger(&env, WEEK_S);
    client.end_agreement(&id);
    client.execute_due_payment(&id, &0i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_execute_after_schedule_complete_panics() {
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

    // Single-payment schedule.
    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &schedule(&env, &[WEEK_S]),
    );

    advance_ledger(&env, WEEK_S);
    // First execution consumes the only timestamp.
    client.execute_due_payment(&id, &0i128);
    // Schedule complete (index past end) → AfterEnd.
    client.execute_due_payment(&id, &0i128);
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

    // Due after a week
    let id_a = client.create_agreement(
        &payer,
        &receiver_a,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &schedule(&env, &[WEEK_S]),
    );
    // Due after a week
    let id_b = client.create_agreement(
        &payer,
        &receiver_b,
        &token.address,
        &ContractType::Flat,
        &20_000_i128,
        &0u32,
        &schedule(&env, &[WEEK_S]),
    );
    // Due after a month — NOT due after just one week
    let id_c = client.create_agreement(
        &payer,
        &receiver_c,
        &token.address,
        &ContractType::Flat,
        &50_000_i128,
        &0u32,
        &schedule(&env, &[MONTH_S]),
    );

    advance_ledger(&env, WEEK_S);
    // All Flat → references map is empty.
    let total = client.execute_all_due(&payer, &Map::new(&env));

    assert_eq!(total, 30_000_i128);
    assert_eq!(token.balance(&receiver_a), 10_000_i128);
    assert_eq!(token.balance(&receiver_b), 20_000_i128);
    assert_eq!(token.balance(&receiver_c), 0);

    let history = client.get_payment_history(&payer);
    assert_eq!(history.len(), 2);

    let _ = (id_a, id_b, id_c);
}

#[test]
fn test_execute_all_due_with_royalties_reference_map() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let r_flat = Address::generate(&env);
    let r_royalty = Address::generate(&env);
    let (token, token_admin) = create_token(&env, &admin);
    token_admin.mint(&payer, &10_000_000_i128);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let id_flat = client.create_agreement(
        &payer,
        &r_flat,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &schedule(&env, &[WEEK_S]),
    );
    // 10% royalty
    let id_royalty = client.create_agreement(
        &payer,
        &r_royalty,
        &token.address,
        &ContractType::Royalties,
        &0i128,
        &1_000u32,
        &schedule(&env, &[WEEK_S]),
    );

    advance_ledger(&env, WEEK_S);

    // Supply the royalty agreement's reference via the map; flat needs no entry.
    let mut references = Map::new(&env);
    references.set(id_royalty, 1_000_000_i128);
    let total = client.execute_all_due(&payer, &references);

    // flat 10_000 + 10% of 1_000_000 = 10_000 + 100_000 = 110_000
    assert_eq!(total, 110_000_i128);
    assert_eq!(token.balance(&r_flat), 10_000_i128);
    assert_eq!(token.balance(&r_royalty), 100_000_i128);

    let _ = id_flat;
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

    let id1 = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &schedule(&env, &[WEEK_S]),
    );
    let _id2 = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &20_000_i128,
        &0u32,
        &schedule(&env, &[MONTH_S]),
    );

    advance_ledger(&env, WEEK_S);
    let due = client.get_due_payments(&payer);
    assert_eq!(due.len(), 1);
    assert_eq!(due.get(0).unwrap().id, id1);
    assert_eq!(due.get(0).unwrap().amount, 10_000_i128);
    assert_eq!(due.get(0).unwrap().timestamp, 1_000 + WEEK_S);
}

#[test]
fn test_get_next_payments() {
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

    let id1 = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &schedule(&env, &[WEEK_S, 2 * WEEK_S]),
    );
    let id2 = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &20_000_i128,
        &0u32,
        &schedule(&env, &[MONTH_S]),
    );

    // Nothing is due yet, but both have an upcoming payment.
    assert_eq!(client.get_due_payments(&payer).len(), 0);
    let next = client.get_next_payments(&payer);
    assert_eq!(next.len(), 2);
    let n1 = next.get(0).unwrap();
    assert_eq!(n1.id, id1);
    assert_eq!(n1.amount, 10_000_i128);
    assert_eq!(n1.timestamp, 1_000 + WEEK_S);
    let n2 = next.get(1).unwrap();
    assert_eq!(n2.id, id2);
    assert_eq!(n2.amount, 20_000_i128);
    assert_eq!(n2.timestamp, 1_000 + MONTH_S);

    // After paying id1's first timestamp, its next payment is the second one.
    advance_ledger(&env, WEEK_S);
    client.execute_due_payment(&id1, &0i128);
    let next = client.get_next_payments(&payer);
    assert_eq!(next.len(), 2);
    assert_eq!(next.get(0).unwrap().timestamp, 1_000 + 2 * WEEK_S);

    // Once id1's schedule is complete it drops out of the list.
    advance_ledger(&env, WEEK_S);
    client.execute_due_payment(&id1, &0i128);
    let next = client.get_next_payments(&payer);
    assert_eq!(next.len(), 1);
    assert_eq!(next.get(0).unwrap().id, id2);
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

    let id_a = client.create_agreement(
        &payer_a,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &5_000_i128,
        &0u32,
        &schedule(&env, &[WEEK_S]),
    );
    let id_b = client.create_agreement(
        &payer_b,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &7_000_i128,
        &0u32,
        &schedule(&env, &[WEEK_S]),
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

    // Two payments: one a week out, one four weeks out.
    let weekly = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &schedule(&env, &[WEEK_S, 4 * WEEK_S]),
    );
    // Single payment a month out.
    let monthly = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &50_000_i128,
        &0u32,
        &schedule(&env, &[MONTH_S]),
    );

    advance_ledger(&env, WEEK_S);
    client.execute_due_payment(&weekly, &0i128);
    assert_eq!(token.balance(&receiver), 10_000_i128);

    advance_ledger(&env, 3 * WEEK_S + DAY_S);
    let total = client.execute_all_due(&payer, &Map::new(&env));
    // weekly: second timestamp (now = 4w + 1d after create) is due → pays once
    // monthly: due at 30 days, now ≈ 29 days → not due
    assert_eq!(total, 10_000_i128);

    let _ = monthly;
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

    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &schedule(&env, &[WEEK_S]),
    );
    let original = client.get_agreement(&id);

    let new_schedule = schedule(&env, &[MONTH_S]);
    client.edit_agreement(&id, &ContractType::Flat, &25_000_i128, &0u32, &new_schedule);

    let edited = client.get_agreement(&id);
    assert_eq!(edited.payer, original.payer);
    assert_eq!(edited.receiver, original.receiver);
    assert_eq!(edited.token, original.token);
    assert_eq!(edited.next_payment_index, original.next_payment_index);
    assert_eq!(edited.flat_amount, 25_000_i128);
    assert_eq!(edited.payment_timestamps, new_schedule);
}

// ============================================================================
// Coverage: create_agreement validation
// ============================================================================

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
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

    client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &0i128,
        &0u32,
        &schedule(&env, &[WEEK_S]),
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
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

    client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Royalties,
        &0i128,
        &0u32,
        &schedule(&env, &[WEEK_S]),
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
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

    client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Mix,
        &10_000_i128,
        &0u32,
        &schedule(&env, &[WEEK_S]),
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
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

    client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Mix,
        &0i128,
        &1_000u32,
        &schedule(&env, &[WEEK_S]),
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
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

    client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &-1_i128,
        &0u32,
        &schedule(&env, &[WEEK_S]),
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
    client.create_agreement(
        payer,
        receiver,
        token,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &schedule(env, &[WEEK_S]),
    )
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
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

    client.edit_agreement(
        &id,
        &ContractType::Flat,
        &20_000_i128,
        &0u32,
        &schedule(&env, &[MONTH_S]),
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
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
    // Empty schedule is invalid.
    client.edit_agreement(
        &id,
        &ContractType::Flat,
        &20_000_i128,
        &0u32,
        &Vec::new(&env),
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
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
    client.edit_agreement(
        &id,
        &ContractType::Royalties,
        &0_i128,
        &10_001u32,
        &schedule(&env, &[MONTH_S]),
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
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
    client.edit_agreement(
        &id,
        &ContractType::Flat,
        &-1_i128,
        &0u32,
        &schedule(&env, &[WEEK_S]),
    );
}

// ============================================================================
// Coverage: lifecycle WrongStatus
// ============================================================================

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
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
#[should_panic(expected = "Error(Contract, #8)")]
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
#[should_panic(expected = "Error(Contract, #8)")]
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
#[should_panic(expected = "Error(Contract, #8)")]
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
#[should_panic(expected = "Error(Contract, #8)")]
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

#[test]
fn test_get_payer_agreements_full_empty() {
    let env = Env::default();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let agreements = client.get_payer_agreements_full(&payer);
    assert_eq!(agreements.len(), 0);
}

#[test]
fn test_get_payer_agreements_full_returns_objects() {
    let env = Env::default();
    env.mock_all_auths();
    set_ledger_timestamp(&env, 1_000);

    let admin = Address::generate(&env);
    let payer = Address::generate(&env);
    let receiver = Address::generate(&env);
    let (token, _) = create_token(&env, &admin);

    let contract_id = register_contract(&env, &admin);
    let client = FractaPayContractClient::new(&env, &contract_id);

    let id1 = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &schedule(&env, &[WEEK_S]),
    );
    let id2 = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Royalties,
        &0i128,
        &1_000u32,
        &schedule(&env, &[MONTH_S]),
    );

    let agreements = client.get_payer_agreements_full(&payer);
    assert_eq!(agreements.len(), 2);

    // Insertion order preserved, full objects returned (matches get_agreement).
    let first = agreements.get(0).unwrap();
    assert_eq!(first.id, id1);
    assert_eq!(first.payer, payer);
    assert_eq!(first.receiver, receiver);
    assert_eq!(first.token, token.address);
    assert_eq!(first.contract_type, ContractType::Flat);
    assert_eq!(first.flat_amount, 10_000_i128);
    assert_eq!(first.status, Status::Active);
    assert_eq!(first, client.get_agreement(&id1));

    let second = agreements.get(1).unwrap();
    assert_eq!(second.id, id2);
    assert_eq!(second.contract_type, ContractType::Royalties);
    assert_eq!(second.percent_bps, 1_000u32);
    assert_eq!(second, client.get_agreement(&id2));
}

#[test]
fn test_get_payer_agreements_full_isolated_per_payer() {
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

    let id_a = client.create_agreement(
        &payer_a,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &5_000_i128,
        &0u32,
        &schedule(&env, &[WEEK_S]),
    );
    client.create_agreement(
        &payer_b,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &7_000_i128,
        &0u32,
        &schedule(&env, &[WEEK_S]),
    );

    let a = client.get_payer_agreements_full(&payer_a);
    assert_eq!(a.len(), 1);
    assert_eq!(a.get(0).unwrap().id, id_a);
    assert_eq!(a.get(0).unwrap().payer, payer_a);

    let b = client.get_payer_agreements_full(&payer_b);
    assert_eq!(b.len(), 1);
    assert_eq!(b.get(0).unwrap().payer, payer_b);
    assert_eq!(b.get(0).unwrap().flat_amount, 7_000_i128);
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

    // Active, will be due
    let id_active = client.create_agreement(
        &payer,
        &r_active,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &schedule(&env, &[WEEK_S]),
    );
    // Paused
    let id_paused = client.create_agreement(
        &payer,
        &r_paused,
        &token.address,
        &ContractType::Flat,
        &20_000_i128,
        &0u32,
        &schedule(&env, &[WEEK_S]),
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
        &schedule(&env, &[WEEK_S]),
    );
    client.end_agreement(&id_ended);

    advance_ledger(&env, WEEK_S);
    let total = client.execute_all_due(&payer, &Map::new(&env));
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

    // Smaller agreement (fits): order matters — created first, paid first
    let _id_small = client.create_agreement(
        &payer,
        &r_small,
        &token.address,
        &ContractType::Flat,
        &6_000_i128,
        &0u32,
        &schedule(&env, &[WEEK_S]),
    );
    // Larger agreement (would not fit after small paid; payer has 4_000 left)
    let _id_big = client.create_agreement(
        &payer,
        &r_big,
        &token.address,
        &ContractType::Flat,
        &8_000_i128,
        &0u32,
        &schedule(&env, &[WEEK_S]),
    );

    advance_ledger(&env, WEEK_S);
    let total = client.execute_all_due(&payer, &Map::new(&env));
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

    for receiver in &[r_a.clone(), r_b.clone(), r_c.clone()] {
        client.create_agreement(
            &payer,
            receiver,
            &token.address,
            &ContractType::Flat,
            &100_i128,
            &0u32,
            &schedule(&env, &[WEEK_S]),
        );
    }

    advance_ledger(&env, WEEK_S);
    let total = client.execute_all_due(&payer, &Map::new(&env));

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

    let total = client.execute_all_due(&payer, &Map::new(&env));
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

    // Two scheduled payments, a week apart.
    let id = client.create_agreement(
        &payer,
        &receiver,
        &token.address,
        &ContractType::Flat,
        &10_000_i128,
        &0u32,
        &schedule(&env, &[WEEK_S, 2 * WEEK_S]),
    );

    advance_ledger(&env, WEEK_S);
    client.execute_due_payment(&id, &0i128);
    let after_first = client.get_agreement(&id).next_payment_index;

    advance_ledger(&env, WEEK_S);
    client.execute_due_payment(&id, &0i128);

    assert_eq!(token.balance(&receiver), 20_000_i128);
    assert_eq!(token.balance(&payer), 980_000_i128);

    let after_second = client.get_agreement(&id).next_payment_index;
    assert_eq!(after_first, 1);
    assert_eq!(after_second, 2);

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
