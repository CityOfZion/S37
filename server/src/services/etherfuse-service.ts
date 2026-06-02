import axios, { type AxiosInstance, isAxiosError } from 'axios'
import BigNumber from 'bignumber.js'
import * as uuid from 'uuid'

import type {
  TKycStatus,
  TKycStatusResult,
  TOnboardingResult,
  TPaymentPix,
  TPaymentStatus,
  TQuotePayload,
  TQuoteResult,
  TToken,
} from 'fractapay-shared'
import { EErrorCode, FEE_PERCENTAGE, StringHelper, TOKEN } from 'fractapay-shared'

import { EnvHelper } from '../helpers/EnvHelper'

const BLOCKCHAIN = 'stellar'
const HORIZON_TESTNET_URL = 'https://horizon-testnet.stellar.org'
const FRIENDBOT_URL = 'https://friendbot.stellar.org'

const ensureAccountFunded = async (address: string): Promise<void> => {
  try {
    const response = await fetch(`${HORIZON_TESTNET_URL}/accounts/${address}`)

    if (response.ok) return
  } catch {
    return
  }

  try {
    await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(address)}`)
  } catch {
    return
  }
}

const TOKEN_ASSET: Record<TToken, string> = {
  [TOKEN.TESOURO]: `${TOKEN.TESOURO}:GC3CW7EDYRTWQ635VDIGY6S4ZUF5L6TQ7AA4MWS7LEQDBLUSZXV7UPS4`,
}

type TKycRawStatus =
  | 'not_started'
  | 'proposed'
  | 'approved'
  | 'approved_chain_deploying'
  | 'rejected'

type TCreateOrderPayload = {
  quoteId: string
  customerId: string
  bankAccountId: string
  address: string
}

type TOrderResult = {
  orderId: string
  status: TPaymentStatus
  pix?: TPaymentPix
  confirmedTxSignature?: string
  amountInFiat?: string
  amountInTokens?: string
  isRecovered?: boolean
}

type TOnboardingResponse = { presigned_url: string }

type TQuoteResponse = {
  quoteId: string
  sourceAmount: string
  destinationAmount: string
  exchangeRate: string
  feeAmount: string | null
  destinationAmountAfterFee: string | null
  createdAt: string
  expiresAt: string
}

type TCreateOrderResponse = {
  onramp: {
    orderId: string
    depositAmount: string
    depositPixKey?: string
    depositPixKeyType?: string
    depositPixCode?: string
    beneficiary?: string
  }
}

type TOrderResponse = {
  orderId: string
  status: TPaymentStatus
  amountInFiat?: string
  amountInTokens?: string
  confirmedTxSignature?: string
  depositPixKey?: string
  depositPixKeyType?: string
  depositPixCode?: string
}

type TKycRawResponse = {
  status: TKycRawStatus
}

const etherfuse: AxiosInstance = axios.create({
  baseURL: EnvHelper.ETHERFUSE_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Authorization: EnvHelper.ETHERFUSE_API_KEY,
  },
})

const request = async <T>(method: 'GET' | 'POST', endpoint: string, body?: unknown): Promise<T> => {
  try {
    const response = await etherfuse.request<T>({ method, url: endpoint, data: body })

    return response.data
  } catch (error) {
    if (isAxiosError(error)) {
      const status = error.response?.status

      if (status === 404 && endpoint.startsWith('/ramp/order/')) {
        throw new Error(EErrorCode.ORDER_NOT_FOUND)
      }

      if (status === 409 && endpoint === '/ramp/order') {
        throw new Error(EErrorCode.PENDING_ORDER_EXISTS)
      }

      if (status === 409 && endpoint === '/ramp/onboarding-url') {
        throw new Error(EErrorCode.CUSTOMER_ALREADY_EXISTS)
      }
    }

    throw new Error(EErrorCode.ETHERFUSE_REQUEST_FAILED)
  }
}

const KYC_STATUS_MAP: Record<TKycRawStatus, TKycStatus> = {
  not_started: 'NOT_STARTED',
  proposed: 'PENDING',
  approved: 'APPROVED',
  approved_chain_deploying: 'APPROVED',
  rejected: 'REJECTED',
}

const mapKycStatus = (status: TKycRawStatus): TKycStatus => KYC_STATUS_MAP[status] || 'NOT_STARTED'

const mapPix = (fields: {
  depositPixCode?: string
  depositPixKey?: string
  depositPixKeyType?: string
  beneficiary?: string
  amount: string
}): TPaymentPix | null => {
  // TODO: remove comment in Mainnet
  // if (!fields.depositPixCode && !fields.depositPixKey) return undefined

  return {
    pixCode:
      fields.depositPixCode ||
      fields.depositPixKey ||
      '00020126580014BR.GOV.BCB.PIX013656ff353d-3633-416a-87dc-7c81c272ec51520400005303986540585.305802BR5901N6001C62130509Etherfuse6304C20E',
    pixKey: fields.depositPixKey || '56ff353d-3633-416a-87dc-7c81c272ec51',
    pixKeyType: fields.depositPixKeyType || 'EVP',
    beneficiary: fields.beneficiary,
    amount: fields.amount,
    currency: 'BRL',
  }
}

type TWalletListItem = { publicKey: string; customerId: string }
type TWalletListResponse = {
  items: TWalletListItem[]
  totalPages: number
  pageNumber: number
}
type TBankAccountListResponse = { items: { bankAccountId: string }[] }

export const findCustomerByAddress = async (address: string): Promise<TOnboardingResult | null> => {
  try {
    const pageSize = 100
    let pageNumber = 0
    let totalPages = 1
    let customerId: string | null = null

    while (pageNumber < totalPages && !customerId) {
      const wallets = await request<TWalletListResponse>('POST', '/ramp/wallets', {
        pageSize,
        pageNumber,
      })

      totalPages = wallets.totalPages

      const match = wallets.items.find(wallet => wallet.publicKey === address)
      if (match) {
        customerId = match.customerId
      }

      pageNumber += 1
    }

    if (!customerId) {
      return null
    }

    const banks = await request<TBankAccountListResponse>(
      'GET',
      `/ramp/customer/${encodeURIComponent(customerId)}/bank-accounts`
    )

    const bankAccountId = banks.items[0]?.bankAccountId
    if (!bankAccountId) {
      return null
    }

    return { customerId, bankAccountId, presignedUrl: '' }
  } catch {
    return null
  }
}

export const createOnboarding = async (address: string): Promise<TOnboardingResult> => {
  const customerId = uuid.v4()
  const bankAccountId = uuid.v4()

  try {
    const response = await request<TOnboardingResponse>('POST', '/ramp/onboarding-url', {
      customerId,
      bankAccountId,
      publicKey: address,
      blockchain: BLOCKCHAIN,
    })

    return { customerId, bankAccountId, presignedUrl: response.presigned_url }
  } catch (error) {
    if ((error as Error).message !== EErrorCode.CUSTOMER_ALREADY_EXISTS) throw error

    const recovered = await findCustomerByAddress(address)
    if (recovered) return recovered

    throw error
  }
}

export const getKycStatus = async (
  customerId: string,
  address: string
): Promise<TKycStatusResult> => {
  const response = await request<TKycRawResponse>(
    'GET',
    `/ramp/customer/${encodeURIComponent(customerId)}/kyc/${encodeURIComponent(address)}`
  )

  return { status: mapKycStatus(response.status) }
}

export const createQuote = async (payload: TQuotePayload): Promise<TQuoteResult> => {
  const quoteId = uuid.v4()
  const targetAsset = TOKEN_ASSET[payload.token]

  const response = await request<TQuoteResponse>('POST', '/ramp/quote', {
    quoteId,
    customerId: payload.customerId,
    blockchain: BLOCKCHAIN,
    quoteAssets: { type: 'onramp', sourceAsset: 'BRL', targetAsset },
    sourceAmount: payload.sourceAmount,
    walletAddress: payload.address,
  })

  const etherfuseFee = new BigNumber(response.feeAmount || '0')
  const fractapayFee = new BigNumber(response.sourceAmount).times(FEE_PERCENTAGE)
  const totalFee = etherfuseFee.plus(fractapayFee)

  return {
    quoteId: response.quoteId,
    sourceAmount: response.sourceAmount,
    destinationAmount: response.destinationAmountAfterFee || response.destinationAmount,
    exchangeRate: response.exchangeRate,
    feeAmount: StringHelper.formatAmount(totalFee),
    etherfuseFeeAmount: StringHelper.formatAmount(etherfuseFee),
    fractapayFeeAmount: StringHelper.formatAmount(fractapayFee),
    createdAt: response.createdAt,
    expiresAt: response.expiresAt,
  }
}

type TOrderListItem = {
  orderId: string
  status: TPaymentStatus
  bankAccountId?: string
  customerId?: string
}

type TOrderListResponse = {
  items: TOrderListItem[]
}

const findPendingOrder = async (
  customerId: string,
  bankAccountId: string
): Promise<TOrderResult | null> => {
  try {
    const response = await request<TOrderListResponse>(
      'GET',
      `/ramp/orders?customerId=${encodeURIComponent(customerId)}&pageSize=50`
    )

    const match = response.items.find(
      item =>
        item.status === 'CREATED' && (!item.bankAccountId || item.bankAccountId === bankAccountId)
    )

    if (!match) return null

    return await getOrder(match.orderId)
  } catch {
    return null
  }
}

export const createOrder = async (payload: TCreateOrderPayload): Promise<TOrderResult> => {
  const orderId = uuid.v4()

  await ensureAccountFunded(payload.address)

  try {
    const response = await request<TCreateOrderResponse>('POST', '/ramp/order', {
      orderId,
      bankAccountId: payload.bankAccountId,
      publicKey: payload.address,
      quoteId: payload.quoteId,
    })

    const { onramp } = response

    return {
      orderId: onramp.orderId,
      status: 'CREATED',
      pix:
        mapPix({
          depositPixCode: onramp.depositPixCode,
          depositPixKey: onramp.depositPixKey,
          depositPixKeyType: onramp.depositPixKeyType,
          beneficiary: onramp.beneficiary,
          amount: onramp.depositAmount,
        }) ?? undefined,
    }
  } catch (error) {
    if ((error as Error).message !== EErrorCode.PENDING_ORDER_EXISTS) throw error

    const existing = await findPendingOrder(payload.customerId, payload.bankAccountId)
    if (existing) return { ...existing, isRecovered: true }

    throw error
  }
}

export const getOrder = async (orderId: string): Promise<TOrderResult> => {
  const response = await request<TOrderResponse>(
    'GET',
    `/ramp/order/${encodeURIComponent(orderId)}`
  )

  return {
    orderId: response.orderId,
    status: response.status,
    amountInFiat: response.amountInFiat,
    amountInTokens: response.amountInTokens,
    confirmedTxSignature: response.confirmedTxSignature,
    pix:
      mapPix({
        depositPixCode: response.depositPixCode,
        depositPixKey: response.depositPixKey,
        depositPixKeyType: response.depositPixKeyType,
        amount: response.amountInFiat || '',
      }) ?? undefined,
  }
}

export const simulateFiatReceived = async (orderId: string): Promise<void> => {
  await request<unknown>('POST', '/ramp/order/fiat_received', { orderId })
}
