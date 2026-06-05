#![no_std]
#![allow(clippy::too_many_arguments)]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, panic_with_error, token,
    Address, BytesN, Env, Map, Vec,
};

const TTL_THRESHOLD: u32 = 100;
const TTL_EXTEND_TO: u32 = 535_000;

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
    pub payment_timestamps: Vec<u64>,
    pub next_payment_index: u32,
    pub last_amount_paid: i128,
    pub status: Status,
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
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct NextPayment {
    pub id: u64,
    pub amount: i128,
    pub timestamp: u64,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    AgreementNotFound = 1,
    PaymentNotDue = 2,
    AfterEnd = 3,
    InvalidWindow = 4,
    InvalidAmount = 5,
    InvalidBps = 6,
    InsufficientBalance = 7,
    WrongStatus = 8,
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
        extend_instance_ttl(&env);
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    pub fn version(env: Env) -> soroban_sdk::String {
        soroban_sdk::String::from_str(&env, "0.5.0")
    }

    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        extend_instance_ttl(&env);

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
        payment_timestamps: Vec<u64>,
    ) -> u64 {
        payer.require_auth();
        extend_instance_ttl(&env);

        validate_timestamps(&env, &payment_timestamps);
        validate_terms(&env, &contract_type, flat_amount, percent_bps);

        let id = next_agreement_id(&env);

        let agreement = Agreement {
            id,
            payer: payer.clone(),
            receiver: receiver.clone(),
            token: token.clone(),
            contract_type,
            flat_amount,
            percent_bps,
            payment_timestamps,
            next_payment_index: 0,
            last_amount_paid: 0,
            status: Status::Active,
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
        payment_timestamps: Vec<u64>,
    ) {
        let mut agreement = load_agreement(&env, id);
        agreement.payer.require_auth();
        extend_instance_ttl(&env);

        if agreement.status == Status::Ended {
            panic_with_error!(&env, ContractError::WrongStatus);
        }

        validate_timestamps(&env, &payment_timestamps);
        if (payment_timestamps.len()) < agreement.next_payment_index {
            panic_with_error!(&env, ContractError::InvalidWindow);
        }
        validate_terms(&env, &contract_type, flat_amount, percent_bps);

        agreement.contract_type = contract_type;
        agreement.flat_amount = flat_amount;
        agreement.percent_bps = percent_bps;
        agreement.payment_timestamps = payment_timestamps;

        save_agreement(&env, &agreement);

        AgreementEdited { id }.publish(&env);
    }

    pub fn pause_agreement(env: Env, id: u64) {
        let mut agreement = load_agreement(&env, id);
        agreement.payer.require_auth();
        extend_instance_ttl(&env);

        if agreement.status != Status::Active {
            panic_with_error!(&env, ContractError::WrongStatus);
        }

        agreement.status = Status::Paused;
        save_agreement(&env, &agreement);

        AgreementPaused { id }.publish(&env);
    }

    pub fn resume_agreement(env: Env, id: u64) {
        let mut agreement = load_agreement(&env, id);
        agreement.payer.require_auth();
        extend_instance_ttl(&env);

        if agreement.status != Status::Paused {
            panic_with_error!(&env, ContractError::WrongStatus);
        }

        agreement.status = Status::Active;
        save_agreement(&env, &agreement);

        AgreementResumed { id }.publish(&env);
    }

    pub fn end_agreement(env: Env, id: u64) {
        let mut agreement = load_agreement(&env, id);
        agreement.payer.require_auth();
        extend_instance_ttl(&env);

        if agreement.status == Status::Ended {
            panic_with_error!(&env, ContractError::WrongStatus);
        }

        agreement.status = Status::Ended;
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
            if agreement.next_payment_index >= agreement.payment_timestamps.len() {
                continue;
            }
            let timestamp = agreement
                .payment_timestamps
                .get(agreement.next_payment_index)
                .unwrap();
            if now_ts < timestamp {
                continue;
            }
            let amount = compute_payment_amount(&agreement, 0);
            due.push_back(DuePayment {
                id,
                amount,
                timestamp,
            });
        }

        due
    }

    /// The upcoming payment for each Active agreement: the timestamp at
    /// `next_payment_index` (whether or not it is due yet), with its amount.
    /// Agreements that are not Active or whose schedule is complete are skipped.
    pub fn get_next_payments(env: Env, payer: Address) -> Vec<NextPayment> {
        let ids = payer_agreements(&env, &payer);
        let mut next = Vec::new(&env);

        for id in ids.iter() {
            let agreement = load_agreement(&env, id);
            if agreement.status != Status::Active {
                continue;
            }
            if agreement.next_payment_index >= agreement.payment_timestamps.len() {
                continue;
            }
            let timestamp = agreement
                .payment_timestamps
                .get(agreement.next_payment_index)
                .unwrap();
            let amount = compute_payment_amount(&agreement, 0);
            next.push_back(NextPayment {
                id,
                amount,
                timestamp,
            });
        }

        next
    }

    /// Execute the due payment for one agreement. `reference_amount` is the
    /// volatile royalty base for this payment (used by `Royalties`/`Mix`; ignored
    /// by `Flat`). For `Royalties` a non-positive reference yields a zero amount
    /// and panics `InvalidAmount`.
    pub fn execute_due_payment(env: Env, id: u64, reference_amount: i128) -> i128 {
        let mut agreement = load_agreement(&env, id);
        agreement.payer.require_auth();
        extend_instance_ttl(&env);

        execute_one(&env, &mut agreement, reference_amount, true)
    }

    /// Batch-execute every due payment for `payer`. `references` maps an
    /// agreement id to its per-execution royalty base; agreements absent from the
    /// map use `0` (so `Royalties` with no entry is skipped, `Mix` pays its flat
    /// portion only).
    pub fn execute_all_due(env: Env, payer: Address, references: Map<u64, i128>) -> i128 {
        payer.require_auth();
        extend_instance_ttl(&env);

        let ids = payer_agreements(&env, &payer);
        let mut total: i128 = 0;

        for id in ids.iter() {
            let mut agreement = load_agreement(&env, id);
            if agreement.payer != payer {
                continue;
            }
            let reference_amount = references.get(id).unwrap_or(0);
            let paid = execute_one(&env, &mut agreement, reference_amount, false);
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

/// Bump the instance entry's TTL so `Admin`/`NextAgreementId` (and the contract
/// instance + Wasm) are not archived. Called from every mutating entry point.
fn extend_instance_ttl(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
}

/// Validate a payment schedule: non-empty, strictly ascending, and ending in the
/// future (the last timestamp must be after `now`, else the whole schedule is in
/// the past). Panics with `InvalidWindow` on any violation.
fn validate_timestamps(env: &Env, payment_timestamps: &Vec<u64>) {
    let length = payment_timestamps.len();
    if length == 0 {
        panic_with_error!(env, ContractError::InvalidWindow);
    }

    let mut previous = payment_timestamps.get(0).unwrap();
    for index in 1..length {
        let current = payment_timestamps.get(index).unwrap();
        if current <= previous {
            panic_with_error!(env, ContractError::InvalidWindow);
        }
        previous = current;
    }

    let last = payment_timestamps.get(length - 1).unwrap();
    if last <= now(env) {
        panic_with_error!(env, ContractError::InvalidWindow);
    }
}

/// Compute a payment's amount. `reference_amount` is supplied per-execution (the
/// volatile royalty base) and ignored for `Flat`; for queries before execution
/// pass `0` to get only the pre-known (flat) portion.
fn compute_payment_amount(agreement: &Agreement, reference_amount: i128) -> i128 {
    match agreement.contract_type {
        ContractType::Flat => agreement.flat_amount,
        ContractType::Royalties => reference_amount * (agreement.percent_bps as i128) / BPS_DENOM,
        ContractType::Mix => {
            agreement.flat_amount + reference_amount * (agreement.percent_bps as i128) / BPS_DENOM
        }
    }
}

fn validate_terms(env: &Env, contract_type: &ContractType, flat_amount: i128, percent_bps: u32) {
    if flat_amount < 0 {
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
fn execute_one(env: &Env, agreement: &mut Agreement, reference_amount: i128, strict: bool) -> i128 {
    let now_ts = now(env);

    if agreement.status != Status::Active {
        if strict {
            panic_with_error!(env, ContractError::WrongStatus);
        }

        return 0;
    }
    if agreement.next_payment_index >= agreement.payment_timestamps.len() {
        if strict {
            panic_with_error!(env, ContractError::AfterEnd);
        }

        return 0;
    }
    let due_ts = agreement
        .payment_timestamps
        .get(agreement.next_payment_index)
        .unwrap();
    if now_ts < due_ts {
        if strict {
            panic_with_error!(env, ContractError::PaymentNotDue);
        }

        return 0;
    }

    if reference_amount < 0 {
        if strict {
            panic_with_error!(env, ContractError::InvalidAmount);
        }

        return 0;
    }

    let amount = compute_payment_amount(agreement, reference_amount);
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

    agreement.next_payment_index += 1;
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
