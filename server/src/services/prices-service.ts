import { Asset, Horizon } from '@stellar/stellar-sdk'
import BigNumber from 'bignumber.js'

import { ErrorCode } from 'fractapay-shared'

const HORIZON_URL = 'https://horizon.stellar.org'
const USD_BRL_URL = 'https://economia.awesomeapi.com.br/json/last/USD-BRL'

const USDC_MAINNET_ASSET = new Asset(
  'USDC',
  'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
)

const TESOURO_MAINNET_ASSET = new Asset(
  'TESOURO',
  'GCRYUGD5NVARGXT56XEZI5CIFCQETYHAPQQTHO2O3IQZTHDH4LATMYWC'
)

const horizonServer = new Horizon.Server(HORIZON_URL)

type TAwesomeApiResponse = {
  USDBRL?: { bid?: string }
}

export const fetchUsdPerBrlPrice = async (): Promise<BigNumber> => {
  let response: Response

  try {
    response = await fetch(USD_BRL_URL)
  } catch {
    throw new Error(ErrorCode.RATE_FETCH_FAILED)
  }

  if (!response.ok) {
    throw new Error(ErrorCode.RATE_FETCH_FAILED)
  }

  const body = (await response.json()) as TAwesomeApiResponse
  const bid = new BigNumber(body.USDBRL?.bid || '0')

  if (bid.isNaN() || bid.isLessThanOrEqualTo(0)) {
    throw new Error(ErrorCode.RATE_FETCH_FAILED)
  }

  return bid
}

export const fetchTesouroPerUsdcPrice = async (): Promise<BigNumber> => {
  let orderbook: Awaited<ReturnType<ReturnType<typeof horizonServer.orderbook>['call']>>

  try {
    orderbook = await horizonServer.orderbook(TESOURO_MAINNET_ASSET, USDC_MAINNET_ASSET).call()
  } catch {
    throw new Error(ErrorCode.ORDERBOOK_FETCH_FAILED)
  }

  const rawPrice = orderbook.bids[0]?.price
  const price = new BigNumber(rawPrice || '0')

  if (price.isNaN() || price.isLessThanOrEqualTo(0)) {
    throw new Error(ErrorCode.ORDERBOOK_FETCH_FAILED)
  }

  return price
}
