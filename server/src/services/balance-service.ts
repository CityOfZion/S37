import {
  Account,
  Address,
  Asset,
  BASE_FEE,
  Contract,
  Horizon,
  rpc,
  scValToNative,
  TransactionBuilder,
} from '@stellar/stellar-sdk'
import BigNumber from 'bignumber.js'

import type { TBalanceResult } from 'fractapay-shared'
import { EErrorCode, STELLAR_DECIMALS, StringHelper, TOKEN } from 'fractapay-shared'

import { isMainnet, NETWORK_PASSPHRASE, SOROBAN_RPC_URL } from '../constants'

type TAwesomeApiResponse = {
  USDBRL?: { bid?: string }
}

const HORIZON_URL = 'https://horizon.stellar.org'
const USD_BRL_URL = 'https://economia.awesomeapi.com.br/json/last/USD-BRL'

const USDC_MAINNET_ASSET = new Asset(
  'USDC',
  'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
)

const TESOURO_MAINNET_ASSET = new Asset(
  TOKEN.TESOURO,
  'GCRYUGD5NVARGXT56XEZI5CIFCQETYHAPQQTHO2O3IQZTHDH4LATMYWC'
)

const horizonServer = new Horizon.Server(HORIZON_URL)

const TESOURO_ISSUER = isMainnet
  ? 'GCRYUGD5NVARGXT56XEZI5CIFCQETYHAPQQTHO2O3IQZTHDH4LATMYWC'
  : 'GC3CW7EDYRTWQ635VDIGY6S4ZUF5L6TQ7AA4MWS7LEQDBLUSZXV7UPS4'

const TESOURO_ASSET = new Asset(TOKEN.TESOURO, TESOURO_ISSUER)
const TESOURO_CONTRACT_ID = TESOURO_ASSET.contractId(NETWORK_PASSPHRASE)

const sorobanServer = new rpc.Server(SOROBAN_RPC_URL)
const STROOP = new BigNumber(10).pow(STELLAR_DECIMALS)

const fetchUsdPerBrlPrice = async (): Promise<BigNumber> => {
  let response: Response

  try {
    response = await fetch(USD_BRL_URL)
  } catch {
    throw new Error(EErrorCode.RATE_FETCH_FAILED)
  }

  if (!response.ok) {
    throw new Error(EErrorCode.RATE_FETCH_FAILED)
  }

  const body = (await response.json()) as TAwesomeApiResponse
  const bid = new BigNumber(body.USDBRL?.bid || '0')

  if (bid.isNaN() || bid.isLessThanOrEqualTo(0)) {
    throw new Error(EErrorCode.RATE_FETCH_FAILED)
  }

  return bid
}

const fetchTesouroPerUsdcPrice = async (): Promise<BigNumber> => {
  let orderbook: Awaited<ReturnType<ReturnType<typeof horizonServer.orderbook>['call']>>

  try {
    orderbook = await horizonServer.orderbook(TESOURO_MAINNET_ASSET, USDC_MAINNET_ASSET).call()
  } catch {
    throw new Error(EErrorCode.ORDERBOOK_FETCH_FAILED)
  }

  const rawPrice = orderbook.bids[0]?.price
  const price = new BigNumber(rawPrice || '0')

  if (price.isNaN() || price.isLessThanOrEqualTo(0)) {
    throw new Error(EErrorCode.ORDERBOOK_FETCH_FAILED)
  }

  return price
}

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
    throw new Error(EErrorCode.BALANCE_FETCH_FAILED)
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

export const getTesouroBalanceInBrl = async (address: string): Promise<TBalanceResult> => {
  const [balance, tesouroPerUsdc, usdPerBrl] = await Promise.all([
    getTesouroBalance(address),
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
