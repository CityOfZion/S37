import {
  Account,
  Address,
  Asset,
  BASE_FEE,
  Contract,
  Networks,
  rpc,
  scValToNative,
  TransactionBuilder,
} from '@stellar/stellar-sdk'
import BigNumber from 'bignumber.js'

import type { TBalanceResult } from 'fractapay-shared'
import { ErrorCode, STELLAR_DECIMALS, StringHelper, TOKEN } from 'fractapay-shared'

import { EnvHelper } from '../helpers/EnvHelper'
import { fetchTesouroPerUsdcPrice, fetchUsdPerBrlPrice } from './prices-service'

const SOROBAN_RPC_URL = EnvHelper.IS_ETHERFUSE_SANDBOX
  ? 'https://soroban-testnet.stellar.org'
  : 'https://mainnet.sorobanrpc.com'

const NETWORK_PASSPHRASE = EnvHelper.IS_ETHERFUSE_SANDBOX ? Networks.TESTNET : Networks.PUBLIC

const TESOURO_ISSUER = EnvHelper.IS_ETHERFUSE_SANDBOX
  ? 'GC3CW7EDYRTWQ635VDIGY6S4ZUF5L6TQ7AA4MWS7LEQDBLUSZXV7UPS4'
  : 'GCRYUGD5NVARGXT56XEZI5CIFCQETYHAPQQTHO2O3IQZTHDH4LATMYWC'

const TESOURO_ASSET = new Asset(TOKEN.TESOURO, TESOURO_ISSUER)
const TESOURO_CONTRACT_ID = TESOURO_ASSET.contractId(NETWORK_PASSPHRASE)

const sorobanServer = new rpc.Server(SOROBAN_RPC_URL)
const STROOP = new BigNumber(10).pow(STELLAR_DECIMALS)

// Reads the TESOURO Stellar Asset Contract `balance(addr)` via a read-only Soroban
// simulation — no transaction is submitted and the account need not be funded.
// `address` is either a classic ed25519 account (G…) or a smart-account contract (C…);
// `Address.fromString` accepts both. The simulation source is a throwaway valid G key
// (read-only simulations never check the source), so a C-address holder works too.
const getTesouroBalance = async (address: string): Promise<string> => {
  const contract = new Contract(TESOURO_CONTRACT_ID)
  const source = new Account(TESOURO_ISSUER, '0')

  const transaction = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('balance', Address.fromString(address).toScVal()))
    .setTimeout(30)
    .build()

  let simulation: Awaited<ReturnType<typeof sorobanServer.simulateTransaction>>

  try {
    simulation = await sorobanServer.simulateTransaction(transaction)
  } catch {
    throw new Error(ErrorCode.BALANCE_FETCH_FAILED)
  }

  // A missing trustline / unhosted address makes `balance` error — that is a zero
  // balance for our purposes, not a service failure.
  if (rpc.Api.isSimulationError(simulation)) {
    return '0'
  }

  const returnValue = simulation.result?.retval
  if (!returnValue) {
    return '0'
  }

  // SAC `balance` returns an i128 in stroops (STELLAR_DECIMALS precision).
  const stroops = new BigNumber((scValToNative(returnValue) as bigint).toString())

  return stroops.dividedBy(STROOP).toString()
}

export const getTesouroBalanceInBrl = async (publicKey: string): Promise<TBalanceResult> => {
  const [balance, tesouroPerUsdc, usdPerBrl] = await Promise.all([
    getTesouroBalance(publicKey),
    fetchTesouroPerUsdcPrice(),
    fetchUsdPerBrlPrice(),
  ])

  const price = tesouroPerUsdc.multipliedBy(usdPerBrl)
  const balanceInFiat = price.isZero()
    ? new BigNumber(0)
    : new BigNumber(balance).multipliedBy(price)

  return {
    token: TOKEN.TESOURO,
    balance: StringHelper.formatAmount(balance),
    balanceInFiat: StringHelper.formatAmount(balanceInFiat),
  }
}
