import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CB3DVCQ7Q72XK537PJUHPYMUWHMCHCPXC37ATXTQUKIDEUNMGUF34NDR",
  }
} as const

export type Status = {tag: "Active", values: void} | {tag: "Paused", values: void} | {tag: "Ended", values: void};

export type DataKey = {tag: "Admin", values: void} | {tag: "NextAgreementId", values: void} | {tag: "Agreement", values: readonly [u64]} | {tag: "PayerAgreements", values: readonly [string]} | {tag: "PaymentHistory", values: readonly [string]};



export interface Agreement {
  contract_type: ContractType;
  flat_amount: i128;
  id: u64;
  last_amount_paid: i128;
  next_payment_index: u32;
  payer: string;
  payment_timestamps: Array<u64>;
  percent_bps: u32;
  receiver: string;
  status: Status;
  token: string;
}


export interface DuePayment {
  amount: i128;
  id: u64;
  timestamp: u64;
}


export interface NextPayment {
  amount: i128;
  id: u64;
  timestamp: u64;
}

export type ContractType = {tag: "Flat", values: void} | {tag: "Royalties", values: void} | {tag: "Mix", values: void};

export const ContractError = {
  1: {message:"AgreementNotFound"},
  2: {message:"PaymentNotDue"},
  3: {message:"AfterEnd"},
  4: {message:"InvalidWindow"},
  5: {message:"InvalidAmount"},
  6: {message:"InvalidBps"},
  7: {message:"InsufficientBalance"},
  8: {message:"WrongStatus"}
}


export interface PaymentRecord {
  agreement_id: u64;
  amount: i128;
  payer: string;
  receiver: string;
  timestamp: u64;
  token: string;
}







export interface Client {
  /**
   * Construct and simulate a upgrade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  upgrade: ({new_wasm_hash}: {new_wasm_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a version transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  version: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a get_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_admin: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a end_agreement transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  end_agreement: ({id}: {id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_agreement transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_agreement: ({id}: {id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Agreement>>

  /**
   * Construct and simulate a edit_agreement transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  edit_agreement: ({id, contract_type, flat_amount, percent_bps, payment_timestamps}: {id: u64, contract_type: ContractType, flat_amount: i128, percent_bps: u32, payment_timestamps: Array<u64>}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a execute_all_due transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Batch-execute every due payment for `payer`. `references` maps an
   * agreement id to its per-execution royalty base; agreements absent from the
   * map use `0` (so `Royalties` with no entry is skipped, `Mix` pays its flat
   * portion only).
   */
  execute_all_due: ({payer, references}: {payer: string, references: Map<u64, i128>}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a pause_agreement transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  pause_agreement: ({id}: {id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a create_agreement transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  create_agreement: ({payer, receiver, token, contract_type, flat_amount, percent_bps, payment_timestamps}: {payer: string, receiver: string, token: string, contract_type: ContractType, flat_amount: i128, percent_bps: u32, payment_timestamps: Array<u64>}, options?: MethodOptions) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a get_due_payments transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_due_payments: ({payer}: {payer: string}, options?: MethodOptions) => Promise<AssembledTransaction<Array<DuePayment>>>

  /**
   * Construct and simulate a resume_agreement transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  resume_agreement: ({id}: {id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_next_payments transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * The upcoming payment for each Active agreement: the timestamp at
   * `next_payment_index` (whether or not it is due yet), with its amount.
   * Agreements that are not Active or whose schedule is complete are skipped.
   */
  get_next_payments: ({payer}: {payer: string}, options?: MethodOptions) => Promise<AssembledTransaction<Array<NextPayment>>>

  /**
   * Construct and simulate a execute_due_payment transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Execute the due payment for one agreement. `reference_amount` is the
   * volatile royalty base for this payment (used by `Royalties`/`Mix`; ignored
   * by `Flat`). For `Royalties` a non-positive reference yields a zero amount
   * and panics `InvalidAmount`.
   */
  execute_due_payment: ({id, reference_amount}: {id: u64, reference_amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a get_payment_history transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_payment_history: ({payer}: {payer: string}, options?: MethodOptions) => Promise<AssembledTransaction<Array<PaymentRecord>>>

  /**
   * Construct and simulate a get_payer_agreements transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_payer_agreements: ({payer}: {payer: string}, options?: MethodOptions) => Promise<AssembledTransaction<Array<u64>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {admin}: {admin: string},
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy({admin}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAgAAAAAAAAAAAAAABlN0YXR1cwAAAAAAAwAAAAAAAAAAAAAABkFjdGl2ZQAAAAAAAAAAAAAAAAAGUGF1c2VkAAAAAAAAAAAAAAAAAAVFbmRlZAAAAA==",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABQAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAAPTmV4dEFncmVlbWVudElkAAAAAAEAAAAAAAAACUFncmVlbWVudAAAAAAAAAEAAAAGAAAAAQAAAAAAAAAPUGF5ZXJBZ3JlZW1lbnRzAAAAAAEAAAATAAAAAQAAAAAAAAAOUGF5bWVudEhpc3RvcnkAAAAAAAEAAAAT",
        "AAAABQAAAAAAAAAAAAAACFVwZ3JhZGVkAAAAAQAAAAh1cGdyYWRlZAAAAAEAAAAAAAAADW5ld193YXNtX2hhc2gAAAAAAAPuAAAAIAAAAAAAAAAC",
        "AAAAAQAAAAAAAAAAAAAACUFncmVlbWVudAAAAAAAAAsAAAAAAAAADWNvbnRyYWN0X3R5cGUAAAAAAAfQAAAADENvbnRyYWN0VHlwZQAAAAAAAAALZmxhdF9hbW91bnQAAAAACwAAAAAAAAACaWQAAAAAAAYAAAAAAAAAEGxhc3RfYW1vdW50X3BhaWQAAAALAAAAAAAAABJuZXh0X3BheW1lbnRfaW5kZXgAAAAAAAQAAAAAAAAABXBheWVyAAAAAAAAEwAAAAAAAAAScGF5bWVudF90aW1lc3RhbXBzAAAAAAPqAAAABgAAAAAAAAALcGVyY2VudF9icHMAAAAABAAAAAAAAAAIcmVjZWl2ZXIAAAATAAAAAAAAAAZzdGF0dXMAAAAAB9AAAAAGU3RhdHVzAAAAAAAAAAAABXRva2VuAAAAAAAAEw==",
        "AAAAAQAAAAAAAAAAAAAACkR1ZVBheW1lbnQAAAAAAAMAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAACaWQAAAAAAAYAAAAAAAAACXRpbWVzdGFtcAAAAAAAAAY=",
        "AAAAAQAAAAAAAAAAAAAAC05leHRQYXltZW50AAAAAAMAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAACaWQAAAAAAAYAAAAAAAAACXRpbWVzdGFtcAAAAAAAAAY=",
        "AAAAAgAAAAAAAAAAAAAADENvbnRyYWN0VHlwZQAAAAMAAAAAAAAAAAAAAARGbGF0AAAAAAAAAAAAAAAJUm95YWx0aWVzAAAAAAAAAAAAAAAAAAADTWl4AA==",
        "AAAABAAAAAAAAAAAAAAADUNvbnRyYWN0RXJyb3IAAAAAAAAIAAAAAAAAABFBZ3JlZW1lbnROb3RGb3VuZAAAAAAAAAEAAAAAAAAADVBheW1lbnROb3REdWUAAAAAAAACAAAAAAAAAAhBZnRlckVuZAAAAAMAAAAAAAAADUludmFsaWRXaW5kb3cAAAAAAAAEAAAAAAAAAA1JbnZhbGlkQW1vdW50AAAAAAAABQAAAAAAAAAKSW52YWxpZEJwcwAAAAAABgAAAAAAAAATSW5zdWZmaWNpZW50QmFsYW5jZQAAAAAHAAAAAAAAAAtXcm9uZ1N0YXR1cwAAAAAI",
        "AAAAAQAAAAAAAAAAAAAADVBheW1lbnRSZWNvcmQAAAAAAAAGAAAAAAAAAAxhZ3JlZW1lbnRfaWQAAAAGAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAABXBheWVyAAAAAAAAEwAAAAAAAAAIcmVjZWl2ZXIAAAATAAAAAAAAAAl0aW1lc3RhbXAAAAAAAAAGAAAAAAAAAAV0b2tlbgAAAAAAABM=",
        "AAAABQAAAAAAAAAAAAAADkFncmVlbWVudEVuZGVkAAAAAAABAAAAD2FncmVlbWVudF9lbmRlZAAAAAABAAAAAAAAAAJpZAAAAAAABgAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAAD0FncmVlbWVudEVkaXRlZAAAAAABAAAAEGFncmVlbWVudF9lZGl0ZWQAAAABAAAAAAAAAAJpZAAAAAAABgAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAAD0FncmVlbWVudFBhdXNlZAAAAAABAAAAEGFncmVlbWVudF9wYXVzZWQAAAABAAAAAAAAAAJpZAAAAAAABgAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAAD1BheW1lbnRFeGVjdXRlZAAAAAABAAAAEHBheW1lbnRfZXhlY3V0ZWQAAAAFAAAAAAAAAAJpZAAAAAAABgAAAAAAAAAAAAAABXBheWVyAAAAAAAAEwAAAAEAAAAAAAAACHJlY2VpdmVyAAAAEwAAAAEAAAAAAAAABXRva2VuAAAAAAAAEwAAAAEAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAAEEFncmVlbWVudENyZWF0ZWQAAAABAAAAEWFncmVlbWVudF9jcmVhdGVkAAAAAAAABAAAAAAAAAACaWQAAAAAAAYAAAAAAAAAAAAAAAVwYXllcgAAAAAAABMAAAABAAAAAAAAAAhyZWNlaXZlcgAAABMAAAABAAAAAAAAAAV0b2tlbgAAAAAAABMAAAABAAAAAg==",
        "AAAABQAAAAAAAAAAAAAAEEFncmVlbWVudFJlc3VtZWQAAAABAAAAEWFncmVlbWVudF9yZXN1bWVkAAAAAAAAAQAAAAAAAAACaWQAAAAAAAYAAAAAAAAAAg==",
        "AAAAAAAAAAAAAAAHdXBncmFkZQAAAAABAAAAAAAAAA1uZXdfd2FzbV9oYXNoAAAAAAAD7gAAACAAAAAA",
        "AAAAAAAAAAAAAAAHdmVyc2lvbgAAAAAAAAAAAQAAABA=",
        "AAAAAAAAAAAAAAAJZ2V0X2FkbWluAAAAAAAAAAAAAAEAAAAT",
        "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAANZW5kX2FncmVlbWVudAAAAAAAAAEAAAAAAAAAAmlkAAAAAAAGAAAAAA==",
        "AAAAAAAAAAAAAAANZ2V0X2FncmVlbWVudAAAAAAAAAEAAAAAAAAAAmlkAAAAAAAGAAAAAQAAB9AAAAAJQWdyZWVtZW50AAAA",
        "AAAAAAAAAAAAAAAOZWRpdF9hZ3JlZW1lbnQAAAAAAAUAAAAAAAAAAmlkAAAAAAAGAAAAAAAAAA1jb250cmFjdF90eXBlAAAAAAAH0AAAAAxDb250cmFjdFR5cGUAAAAAAAAAC2ZsYXRfYW1vdW50AAAAAAsAAAAAAAAAC3BlcmNlbnRfYnBzAAAAAAQAAAAAAAAAEnBheW1lbnRfdGltZXN0YW1wcwAAAAAD6gAAAAYAAAAA",
        "AAAAAAAAAOVCYXRjaC1leGVjdXRlIGV2ZXJ5IGR1ZSBwYXltZW50IGZvciBgcGF5ZXJgLiBgcmVmZXJlbmNlc2AgbWFwcyBhbgphZ3JlZW1lbnQgaWQgdG8gaXRzIHBlci1leGVjdXRpb24gcm95YWx0eSBiYXNlOyBhZ3JlZW1lbnRzIGFic2VudCBmcm9tIHRoZQptYXAgdXNlIGAwYCAoc28gYFJveWFsdGllc2Agd2l0aCBubyBlbnRyeSBpcyBza2lwcGVkLCBgTWl4YCBwYXlzIGl0cyBmbGF0CnBvcnRpb24gb25seSkuAAAAAAAAD2V4ZWN1dGVfYWxsX2R1ZQAAAAACAAAAAAAAAAVwYXllcgAAAAAAABMAAAAAAAAACnJlZmVyZW5jZXMAAAAAA+wAAAAGAAAACwAAAAEAAAAL",
        "AAAAAAAAAAAAAAAPcGF1c2VfYWdyZWVtZW50AAAAAAEAAAAAAAAAAmlkAAAAAAAGAAAAAA==",
        "AAAAAAAAAAAAAAAQY3JlYXRlX2FncmVlbWVudAAAAAcAAAAAAAAABXBheWVyAAAAAAAAEwAAAAAAAAAIcmVjZWl2ZXIAAAATAAAAAAAAAAV0b2tlbgAAAAAAABMAAAAAAAAADWNvbnRyYWN0X3R5cGUAAAAAAAfQAAAADENvbnRyYWN0VHlwZQAAAAAAAAALZmxhdF9hbW91bnQAAAAACwAAAAAAAAALcGVyY2VudF9icHMAAAAABAAAAAAAAAAScGF5bWVudF90aW1lc3RhbXBzAAAAAAPqAAAABgAAAAEAAAAG",
        "AAAAAAAAAAAAAAAQZ2V0X2R1ZV9wYXltZW50cwAAAAEAAAAAAAAABXBheWVyAAAAAAAAEwAAAAEAAAPqAAAH0AAAAApEdWVQYXltZW50AAA=",
        "AAAAAAAAAAAAAAAQcmVzdW1lX2FncmVlbWVudAAAAAEAAAAAAAAAAmlkAAAAAAAGAAAAAA==",
        "AAAAAAAAANBUaGUgdXBjb21pbmcgcGF5bWVudCBmb3IgZWFjaCBBY3RpdmUgYWdyZWVtZW50OiB0aGUgdGltZXN0YW1wIGF0CmBuZXh0X3BheW1lbnRfaW5kZXhgICh3aGV0aGVyIG9yIG5vdCBpdCBpcyBkdWUgeWV0KSwgd2l0aCBpdHMgYW1vdW50LgpBZ3JlZW1lbnRzIHRoYXQgYXJlIG5vdCBBY3RpdmUgb3Igd2hvc2Ugc2NoZWR1bGUgaXMgY29tcGxldGUgYXJlIHNraXBwZWQuAAAAEWdldF9uZXh0X3BheW1lbnRzAAAAAAAAAQAAAAAAAAAFcGF5ZXIAAAAAAAATAAAAAQAAA+oAAAfQAAAAC05leHRQYXltZW50AA==",
        "AAAAAAAAAPVFeGVjdXRlIHRoZSBkdWUgcGF5bWVudCBmb3Igb25lIGFncmVlbWVudC4gYHJlZmVyZW5jZV9hbW91bnRgIGlzIHRoZQp2b2xhdGlsZSByb3lhbHR5IGJhc2UgZm9yIHRoaXMgcGF5bWVudCAodXNlZCBieSBgUm95YWx0aWVzYC9gTWl4YDsgaWdub3JlZApieSBgRmxhdGApLiBGb3IgYFJveWFsdGllc2AgYSBub24tcG9zaXRpdmUgcmVmZXJlbmNlIHlpZWxkcyBhIHplcm8gYW1vdW50CmFuZCBwYW5pY3MgYEludmFsaWRBbW91bnRgLgAAAAAAABNleGVjdXRlX2R1ZV9wYXltZW50AAAAAAIAAAAAAAAAAmlkAAAAAAAGAAAAAAAAABByZWZlcmVuY2VfYW1vdW50AAAACwAAAAEAAAAL",
        "AAAAAAAAAAAAAAATZ2V0X3BheW1lbnRfaGlzdG9yeQAAAAABAAAAAAAAAAVwYXllcgAAAAAAABMAAAABAAAD6gAAB9AAAAANUGF5bWVudFJlY29yZAAAAA==",
        "AAAAAAAAAAAAAAAUZ2V0X3BheWVyX2FncmVlbWVudHMAAAABAAAAAAAAAAVwYXllcgAAAAAAABMAAAABAAAD6gAAAAY=" ]),
      options
    )
  }
  public readonly fromJSON = {
    upgrade: this.txFromJSON<null>,
        version: this.txFromJSON<string>,
        get_admin: this.txFromJSON<string>,
        end_agreement: this.txFromJSON<null>,
        get_agreement: this.txFromJSON<Agreement>,
        edit_agreement: this.txFromJSON<null>,
        execute_all_due: this.txFromJSON<i128>,
        pause_agreement: this.txFromJSON<null>,
        create_agreement: this.txFromJSON<u64>,
        get_due_payments: this.txFromJSON<Array<DuePayment>>,
        resume_agreement: this.txFromJSON<null>,
        get_next_payments: this.txFromJSON<Array<NextPayment>>,
        execute_due_payment: this.txFromJSON<i128>,
        get_payment_history: this.txFromJSON<Array<PaymentRecord>>,
        get_payer_agreements: this.txFromJSON<Array<u64>>
  }
}