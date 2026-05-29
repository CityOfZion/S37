import axios, { type AxiosInstance, isAxiosError } from 'axios'
import BigNumber from 'bignumber.js'
import * as uuid from 'uuid'

import type {
  TBankAccountPayload,
  TBankAccountResult,
  TKycStatus,
  TKycStatusResult,
  TOnboardingResult,
  TOrderPayload,
  TOrderResult,
  TOrderStatus,
  TPixInstructions,
  TQuotePayload,
  TQuoteResult,
  TToken,
} from 'fractapay-shared'
import { ErrorCode, FEE_PERCENTAGE, StringHelper, TOKEN } from 'fractapay-shared'

import { EnvHelper } from '../helpers/EnvHelper'

const BLOCKCHAIN = 'stellar'
const HORIZON_TESTNET_URL = 'https://horizon-testnet.stellar.org'
const FRIENDBOT_URL = 'https://friendbot.stellar.org'

const ensureAccountFunded = async (publicKey: string): Promise<void> => {
  try {
    const accountResponse = await fetch(`${HORIZON_TESTNET_URL}/accounts/${publicKey}`)
    if (accountResponse.ok) return
  } catch {
    // ignore — proceed to fund
  }

  try {
    const friendbotResponse = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(publicKey)}`)
    if (!friendbotResponse.ok) {
      console.error('[Stellar] friendbot fund failed', await friendbotResponse.text())
    }
  } catch (error) {
    console.error('[Stellar] friendbot request error', error)
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

type TEtherfuseError = { error?: { code?: string; message?: string } }

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
  status: TOrderStatus
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

type TBankAccountResponse = {
  bankAccountId: string
  pixKey?: string
  status: string
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
      const data = error.response?.data as TEtherfuseError | undefined

      if (status === 404 && endpoint.startsWith('/ramp/order/')) {
        throw new Error(ErrorCode.ORDER_NOT_FOUND)
      }

      if (status === 409 && endpoint === '/ramp/order') {
        throw new Error(ErrorCode.PENDING_ORDER_EXISTS)
      }

      if (status === 409 && endpoint === '/ramp/onboarding-url') {
        throw new Error(ErrorCode.CUSTOMER_ALREADY_EXISTS)
      }

      console.error(
        `[Etherfuse] ${status ?? 'NETWORK'} ${method} ${endpoint}`,
        JSON.stringify({
          request: body,
          response: error.response?.data,
          message: data?.error?.message || error.message,
        })
      )
    } else {
      console.error('[Etherfuse] unexpected error', error)
    }

    throw new Error(ErrorCode.ETHERFUSE_REQUEST_FAILED)
  }
}

const mapKycStatus = (status: TKycRawStatus): TKycStatus => {
  if (status === 'proposed') return 'pending'
  if (status === 'approved_chain_deploying') return 'approved'

  return status
}

const mapPixInstructions = (fields: {
  depositPixCode?: string
  depositPixKey?: string
  depositPixKeyType?: string
  beneficiary?: string
  amount: string
}): TPixInstructions | undefined => {
  // TODO: remove comment in Mainnet
  // if (!fields.depositPixCode && !fields.depositPixKey) return undefined

  return {
    pixCode:
      fields.depositPixCode ||
      fields.depositPixKey ||
      '00020126580014BR.GOV.BCB.PIX013656ff353d-3633-416a-87dc-7c81c272ec51520400005303986540585.305802BR5901N6001C62130509Etherfuse6304C20E',
    pixKey: fields.depositPixKey || '56ff353d-3633-416a-87dc-7c81c272ec51',
    pixKeyType: fields.depositPixKeyType || 'EVP',
    beneficiary: fields.beneficiary || 'Etherfuse',
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

export const findCustomerByPublicKey = async (
  publicKey: string
): Promise<TOnboardingResult | null> => {
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

      const match = wallets.items.find(wallet => wallet.publicKey === publicKey)
      if (match) {
        customerId = match.customerId
      }

      pageNumber += 1
    }

    if (!customerId) {
      console.warn('[Etherfuse] recovery: publicKey not found in any wallet page', publicKey)
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

export const createOnboarding = async (publicKey: string): Promise<TOnboardingResult> => {
  const customerId = uuid.v4()
  const bankAccountId = uuid.v4()

  try {
    const response = await request<TOnboardingResponse>('POST', '/ramp/onboarding-url', {
      customerId,
      bankAccountId,
      publicKey,
      blockchain: BLOCKCHAIN,
    })

    return { customerId, bankAccountId, presignedUrl: response.presigned_url }
  } catch (error) {
    if ((error as Error).message !== ErrorCode.CUSTOMER_ALREADY_EXISTS) throw error

    const recovered = await findCustomerByPublicKey(publicKey)
    if (recovered) return recovered

    throw error
  }
}

export const getKycStatus = async (
  customerId: string,
  publicKey: string
): Promise<TKycStatusResult> => {
  const response = await request<TKycRawResponse>(
    'GET',
    `/ramp/customer/${encodeURIComponent(customerId)}/kyc/${encodeURIComponent(publicKey)}`
  )

  return { status: mapKycStatus(response.status) }
}

export const registerBankAccount = async (
  payload: TBankAccountPayload
): Promise<TBankAccountResult> => {
  const response = await request<TBankAccountResponse>('POST', '/ramp/bank-account', {
    presignedUrl: payload.presignedUrl,
    account: {
      pixKey: payload.pixKey,
      pixKeyType: payload.pixKeyType,
      firstName: payload.firstName,
      lastName: payload.lastName,
      cpf: payload.cpf,
    },
  })

  return {
    bankAccountId: response.bankAccountId,
    pixKey: response.pixKey,
    status: response.status,
  }
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
    walletAddress: payload.publicKey,
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
  status: TOrderStatus
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
        item.status === 'created' && (!item.bankAccountId || item.bankAccountId === bankAccountId)
    )

    if (!match) return null

    return await getOrder(match.orderId)
  } catch {
    return null
  }
}

export const createOrder = async (payload: TOrderPayload): Promise<TOrderResult> => {
  const orderId = uuid.v4()

  await ensureAccountFunded(payload.publicKey)

  try {
    const response = await request<TCreateOrderResponse>('POST', '/ramp/order', {
      orderId,
      bankAccountId: payload.bankAccountId,
      publicKey: payload.publicKey,
      quoteId: payload.quoteId,
      memo: payload.memo || undefined,
    })

    const { onramp } = response

    return {
      orderId: onramp.orderId,
      status: 'created',
      pix: mapPixInstructions({
        depositPixCode: onramp.depositPixCode,
        depositPixKey: onramp.depositPixKey,
        depositPixKeyType: onramp.depositPixKeyType,
        beneficiary: onramp.beneficiary,
        amount: onramp.depositAmount,
      }),
    }
  } catch (error) {
    if ((error as Error).message !== ErrorCode.PENDING_ORDER_EXISTS) throw error

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
    pix: mapPixInstructions({
      depositPixCode: response.depositPixCode,
      depositPixKey: response.depositPixKey,
      depositPixKeyType: response.depositPixKeyType,
      amount: response.amountInFiat || '',
    }),
  }
}

export const simulateFiatReceived = async (orderId: string): Promise<void> => {
  await request<unknown>('POST', '/ramp/order/fiat_received', { orderId })
}
