#![no_std]
#![allow(clippy::too_many_arguments)]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, panic_with_error, token,
    Address, BytesN, Env, Vec,
};

const TTL_THRESHOLD: u32 = 100;
const TTL_EXTEND_TO: u32 = 535_000;

const DAY: u64 = 86_400;
const BPS_DENOM: i128 = 10_000;

#[contracttype]
pub enum DataKey {
    Admin,
    NextAgreementId,
    Agreement(u64),
    PayerAgreements(Address),
    PaymentHistory(Address),
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum ContractType {
    Flat,
    Royalties,
    Mix,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum Frequency {
    Weekly,
    Biweekly,
    Monthly,
    Quarterly,
    Yearly,
    Custom(u64),
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum Status {
    Active,
    Paused,
    Ended,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Agreement {
    pub id: u64,
    pub payer: Address,
    pub receiver: Address,
    pub token: Address,
    pub contract_type: ContractType,
    pub flat_amount: i128,
    pub percent_bps: u32,
    pub reference_amount: i128,
    pub frequency: Frequency,
    pub last_paid_at: u64,
    pub last_amount_paid: i128,
    pub end_timestamp: u64,
    pub status: Status,
    pub paused_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct PaymentRecord {
    pub agreement_id: u64,
    pub payer: Address,
    pub receiver: Address,
    pub token: Address,
    pub amount: i128,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct DuePayment {
    pub id: u64,
    pub amount: i128,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    AgreementNotFound = 1,
    NotPayer = 2,
    PaymentNotDue = 3,
    AfterEnd = 4,
    InvalidWindow = 5,
    InvalidAmount = 6,
    InvalidBps = 7,
    InsufficientBalance = 8,
    WrongStatus = 9,
    ReferenceRequired = 10,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq)]
pub struct AgreementCreated {
    pub id: u64,
    #[topic]
    pub payer: Address,
    #[topic]
    pub receiver: Address,
    #[topic]
    pub token: Address,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq)]
pub struct AgreementEdited {
    pub id: u64,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq)]
pub struct AgreementPaused {
    pub id: u64,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq)]
pub struct AgreementResumed {
    pub id: u64,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq)]
pub struct AgreementEnded {
    pub id: u64,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq)]
pub struct PaymentExecuted {
    pub id: u64,
    #[topic]
    pub payer: Address,
    #[topic]
    pub receiver: Address,
    #[topic]
    pub token: Address,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq)]
pub struct Upgraded {
    pub new_wasm_hash: BytesN<32>,
}

#[contract]
pub struct FractaPayContract;

#[contractimpl]
impl FractaPayContract {
    pub fn __constructor(env: Env, admin: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::NextAgreementId, &0u64);
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    pub fn version(env: Env) -> soroban_sdk::String {
        soroban_sdk::String::from_str(&env, "0.4.0")
    }

    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        env.deployer()
            .update_current_contract_wasm(new_wasm_hash.clone());

        Upgraded { new_wasm_hash }.publish(&env);
    }

    pub fn create_agreement(
        env: Env,
        payer: Address,
        receiver: Address,
        token: Address,
        contract_type: ContractType,
        flat_amount: i128,
        percent_bps: u32,
        reference_amount: i128,
        frequency: Frequency,
        end_timestamp: u64,
    ) -> u64 {
        payer.require_auth();

        let now_ts = now(&env);
        if end_timestamp <= now_ts {
            panic_with_error!(&env, ContractError::InvalidWindow);
        }
        validate_terms(
            &env,
            &contract_type,
            flat_amount,
            percent_bps,
            reference_amount,
        );

        let id = next_agreement_id(&env);

        let agreement = Agreement {
            id,
            payer: payer.clone(),
            receiver: receiver.clone(),
            token: token.clone(),
            contract_type,
            flat_amount,
            percent_bps,
            reference_amount,
            frequency,
            last_paid_at: now_ts,
            last_amount_paid: 0,
            end_timestamp,
            status: Status::Active,
            paused_at: 0,
        };

        save_agreement(&env, &agreement);
        append_payer_agreement(&env, &payer, id);

        AgreementCreated {
            id,
            payer,
            receiver,
            token,
        }
        .publish(&env);

        id
    }

    pub fn edit_agreement(
        env: Env,
        id: u64,
        contract_type: ContractType,
        flat_amount: i128,
        percent_bps: u32,
        reference_amount: i128,
        frequency: Frequency,
        end_timestamp: u64,
    ) {
        let mut agreement = load_agreement(&env, id);
        agreement.payer.require_auth();

        if agreement.status == Status::Ended {
            panic_with_error!(&env, ContractError::WrongStatus);
        }

        let now_ts = now(&env);
        if end_timestamp <= now_ts {
            panic_with_error!(&env, ContractError::InvalidWindow);
        }
        validate_terms(
            &env,
            &contract_type,
            flat_amount,
            percent_bps,
            reference_amount,
        );

        agreement.contract_type = contract_type;
        agreement.flat_amount = flat_amount;
        agreement.percent_bps = percent_bps;
        agreement.reference_amount = reference_amount;
        agreement.frequency = frequency;
        agreement.end_timestamp = end_timestamp;

        save_agreement(&env, &agreement);

        AgreementEdited { id }.publish(&env);
    }

    pub fn set_reference(env: Env, id: u64, reference_amount: i128) {
        let mut agreement = load_agreement(&env, id);
        agreement.payer.require_auth();

        if agreement.status == Status::Ended {
            panic_with_error!(&env, ContractError::WrongStatus);
        }
        if reference_amount < 0 {
            panic_with_error!(&env, ContractError::InvalidAmount);
        }

        agreement.reference_amount = reference_amount;
        save_agreement(&env, &agreement);

        AgreementEdited { id }.publish(&env);
    }

    pub fn pause_agreement(env: Env, id: u64) {
        let mut agreement = load_agreement(&env, id);
        agreement.payer.require_auth();

        if agreement.status != Status::Active {
            panic_with_error!(&env, ContractError::WrongStatus);
        }

        agreement.status = Status::Paused;
        agreement.paused_at = now(&env);
        save_agreement(&env, &agreement);

        AgreementPaused { id }.publish(&env);
    }

    pub fn resume_agreement(env: Env, id: u64) {
        let mut agreement = load_agreement(&env, id);
        agreement.payer.require_auth();

        if agreement.status != Status::Paused {
            panic_with_error!(&env, ContractError::WrongStatus);
        }

        let paused_duration = now(&env) - agreement.paused_at;
        agreement.last_paid_at += paused_duration;
        agreement.paused_at = 0;
        agreement.status = Status::Active;
        save_agreement(&env, &agreement);

        AgreementResumed { id }.publish(&env);
    }

    pub fn end_agreement(env: Env, id: u64) {
        let mut agreement = load_agreement(&env, id);
        agreement.payer.require_auth();

        if agreement.status == Status::Ended {
            panic_with_error!(&env, ContractError::WrongStatus);
        }

        agreement.status = Status::Ended;
        agreement.paused_at = 0;
        save_agreement(&env, &agreement);

        AgreementEnded { id }.publish(&env);
    }

    pub fn get_due_payments(env: Env, payer: Address) -> Vec<DuePayment> {
        let ids = payer_agreements(&env, &payer);
        let mut due = Vec::new(&env);
        let now_ts = now(&env);

        for id in ids.iter() {
            let agreement = load_agreement(&env, id);
            if agreement.status != Status::Active {
                continue;
            }
            if now_ts > agreement.end_timestamp {
                continue;
            }
            let interval = interval_seconds(&agreement.frequency);
            if now_ts < agreement.last_paid_at + interval {
                continue;
            }
            let amount = compute_payment_amount(&agreement);
            due.push_back(DuePayment { id, amount });
        }

        due
    }

    pub fn execute_due_payment(env: Env, id: u64) -> i128 {
        let mut agreement = load_agreement(&env, id);
        agreement.payer.require_auth();

        execute_one(&env, &mut agreement, true)
    }

    pub fn execute_all_due(env: Env, payer: Address) -> i128 {
        payer.require_auth();

        let ids = payer_agreements(&env, &payer);
        let mut total: i128 = 0;

        for id in ids.iter() {
            let mut agreement = load_agreement(&env, id);
            if agreement.payer != payer {
                continue;
            }
            let paid = execute_one(&env, &mut agreement, false);
            total += paid;
        }

        total
    }

    pub fn get_agreement(env: Env, id: u64) -> Agreement {
        load_agreement(&env, id)
    }

    pub fn get_payer_agreements(env: Env, payer: Address) -> Vec<u64> {
        payer_agreements(&env, &payer)
    }

    pub fn get_payment_history(env: Env, payer: Address) -> Vec<PaymentRecord> {
        let key = DataKey::PaymentHistory(payer);
        let history = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| Vec::new(&env));
        if env.storage().persistent().has(&key) {
            env.storage()
                .persistent()
                .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
        }

        history
    }
}

fn now(env: &Env) -> u64 {
    env.ledger().timestamp()
}

fn interval_seconds(frequency: &Frequency) -> u64 {
    match frequency {
        Frequency::Weekly => 7 * DAY,
        Frequency::Biweekly => 14 * DAY,
        Frequency::Monthly => 30 * DAY,
        Frequency::Quarterly => 90 * DAY,
        Frequency::Yearly => 365 * DAY,
        Frequency::Custom(seconds) => *seconds,
    }
}

fn compute_payment_amount(agreement: &Agreement) -> i128 {
    match agreement.contract_type {
        ContractType::Flat => agreement.flat_amount,
        ContractType::Royalties => {
            agreement.reference_amount * (agreement.percent_bps as i128) / BPS_DENOM
        }
        ContractType::Mix => {
            agreement.flat_amount
                + agreement.reference_amount * (agreement.percent_bps as i128) / BPS_DENOM
        }
    }
}

fn validate_terms(
    env: &Env,
    contract_type: &ContractType,
    flat_amount: i128,
    percent_bps: u32,
    reference_amount: i128,
) {
    if flat_amount < 0 || reference_amount < 0 {
        panic_with_error!(env, ContractError::InvalidAmount);
    }
    if percent_bps > BPS_DENOM as u32 {
        panic_with_error!(env, ContractError::InvalidBps);
    }
    match contract_type {
        ContractType::Flat => {
            if flat_amount == 0 {
                panic_with_error!(env, ContractError::InvalidAmount);
            }
        }
        ContractType::Royalties => {
            if percent_bps == 0 {
                panic_with_error!(env, ContractError::InvalidBps);
            }
        }
        ContractType::Mix => {
            if percent_bps == 0 {
                panic_with_error!(env, ContractError::InvalidBps);
            }
            if flat_amount == 0 {
                panic_with_error!(env, ContractError::InvalidAmount);
            }
        }
    }
}

fn next_agreement_id(env: &Env) -> u64 {
    let current: u64 = env
        .storage()
        .instance()
        .get(&DataKey::NextAgreementId)
        .unwrap_or(0);
    env.storage()
        .instance()
        .set(&DataKey::NextAgreementId, &(current + 1));

    current
}

fn load_agreement(env: &Env, id: u64) -> Agreement {
    let key = DataKey::Agreement(id);
    let agreement: Agreement = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| panic_with_error!(env, ContractError::AgreementNotFound));
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);

    agreement
}

fn save_agreement(env: &Env, agreement: &Agreement) {
    let key = DataKey::Agreement(agreement.id);
    env.storage().persistent().set(&key, agreement);
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
}

fn append_payer_agreement(env: &Env, payer: &Address, id: u64) {
    let key = DataKey::PayerAgreements(payer.clone());
    let mut ids: Vec<u64> = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| Vec::new(env));
    ids.push_back(id);
    env.storage().persistent().set(&key, &ids);
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
}

fn payer_agreements(env: &Env, payer: &Address) -> Vec<u64> {
    let key = DataKey::PayerAgreements(payer.clone());
    let ids: Vec<u64> = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| Vec::new(env));
    if env.storage().persistent().has(&key) {
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
    }

    ids
}

fn append_history(env: &Env, payer: &Address, record: PaymentRecord) {
    let key = DataKey::PaymentHistory(payer.clone());
    let mut history: Vec<PaymentRecord> = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| Vec::new(env));
    history.push_back(record);
    env.storage().persistent().set(&key, &history);
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
}

/// Run a single agreement's payment. When `strict`, an undue/paused/ended/post-end
/// agreement panics. When non-strict (batch path), it returns 0 and skips.
fn execute_one(env: &Env, agreement: &mut Agreement, strict: bool) -> i128 {
    let now_ts = now(env);

    if agreement.status != Status::Active {
        if strict {
            panic_with_error!(env, ContractError::WrongStatus);
        }

        return 0;
    }
    if now_ts > agreement.end_timestamp {
        if strict {
            panic_with_error!(env, ContractError::AfterEnd);
        }

        return 0;
    }
    let interval = interval_seconds(&agreement.frequency);
    if now_ts < agreement.last_paid_at + interval {
        if strict {
            panic_with_error!(env, ContractError::PaymentNotDue);
        }

        return 0;
    }

    let amount = compute_payment_amount(agreement);
    if amount <= 0 {
        if strict {
            panic_with_error!(env, ContractError::InvalidAmount);
        }

        return 0;
    }

    let token_client = token::Client::new(env, &agreement.token);
    let payer_balance = token_client.balance(&agreement.payer);
    if payer_balance < amount {
        if strict {
            panic_with_error!(env, ContractError::InsufficientBalance);
        }

        return 0;
    }

    token_client.transfer(&agreement.payer, &agreement.receiver, &amount);

    agreement.last_paid_at = now_ts;
    agreement.last_amount_paid = amount;
    save_agreement(env, agreement);

    append_history(
        env,
        &agreement.payer,
        PaymentRecord {
            agreement_id: agreement.id,
            payer: agreement.payer.clone(),
            receiver: agreement.receiver.clone(),
            token: agreement.token.clone(),
            amount,
            timestamp: now_ts,
        },
    );

    PaymentExecuted {
        id: agreement.id,
        payer: agreement.payer.clone(),
        receiver: agreement.receiver.clone(),
        token: agreement.token.clone(),
        amount,
    }
    .publish(env);

    amount
}

mod test;
