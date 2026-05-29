import axios, { type AxiosInstance, isAxiosError } from 'axios'
import BigNumber from 'bignumber.js'
import * as uuid from 'uuid'

import type {
  TBankAccountPayload,
  TBankAccountResult,
  TKycIdentity,
  TKycStatus,
  TKycStatusResult,
  TOnboardingResult,
  TOrderPayload,
  TOrderResult,
  TOrderStatus,
  TOrganizationPayload,
  TOrganizationResult,
  TPixInstructions,
  TQuotePayload,
  TQuoteResult,
  TSubmitKycPayload,
  TSubmitKycResult,
  TToken,
} from 'fractapay-shared'
import { ErrorCode, FEE_PERCENTAGE, StringHelper, TOKEN } from 'fractapay-shared'

import { EnvHelper } from '../helpers/EnvHelper'
import { upsertEtherfuseCustomer } from './etherfuse-customer-service'

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

const SANDBOX_KYC_IDENTITY: TKycIdentity = {
  id: 'PUBLIC KEY',
  email: 'test.user@example.com',
  phoneNumber: '+5511999999999',
  occupation: 'Software Engineer',
  name: { givenName: 'Test', familyName: 'User' },
  dateOfBirth: '1990-01-01',
  address: {
    street: 'Avenida Paulista 1000',
    city: 'São Paulo',
    region: 'SP',
    postalCode: '01310-100',
    country: 'BR',
  },
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

type TOrganizationResponse = {
  organizationId: string
  displayName: string
  accountType: string
  wallets: { id: string; publicKey: string; blockchain: string }[]
  bankAccount: unknown
}

type TBankAccountResponse = {
  bankAccountId: string
  pixKey?: string
  status: string
}

type TSubmitKycResponse = { status: string; message: string }

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
        // 409 body carries the existing org/customer id, e.g.
        // "…already added user with this address, see org: <uuid>".
        const raw =
          typeof error.response?.data === 'string'
            ? error.response.data
            : JSON.stringify(error.response?.data ?? '')
        const match = raw.match(/see org:\s*([0-9a-fA-F-]{36})/)
        const conflict = new Error(ErrorCode.CUSTOMER_ALREADY_EXISTS) as Error & {
          organizationId?: string
        }
        if (match) conflict.organizationId = match[1]

        throw conflict
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
    pixKeyType: fields.depositPixKeyType || 'evp',
    beneficiary: fields.beneficiary || 'Etherfuse',
    amount: fields.amount,
    currency: 'BRL',
  }
}

type TCustomersListResponse = {
  items: { customerId: string }[]
  totalPages: number
  pageNumber: number
}
type TWalletsResponse = { items: { publicKey: string }[] }
type TBankAccountListResponse = { items: { bankAccountId: string }[] }

export const getCustomerBankAccountId = async (customerId: string): Promise<string | null> => {
  const banks = await request<TBankAccountListResponse>(
    'GET',
    `/ramp/customer/${encodeURIComponent(customerId)}/bank-accounts`
  )

  return banks.items[0]?.bankAccountId ?? null
}

export const findCustomerByPublicKey = async (
  publicKey: string
): Promise<TOnboardingResult | null> => {
  try {
    const pageSize = 100
    let pageNumber = 0
    let totalPages = 1
    let matchedCustomerId: string | null = null

    while (pageNumber < totalPages && !matchedCustomerId) {
      const customers = await request<TCustomersListResponse>('POST', '/ramp/customers', {
        pageSize,
        pageNumber,
      })
      totalPages = customers.totalPages

      for (const customer of customers.items) {
        const wallets = await request<TWalletsResponse>(
          'GET',
          `/ramp/customer/${encodeURIComponent(customer.customerId)}/wallets`
        )

        if (wallets.items.some(wallet => wallet.publicKey === publicKey)) {
          matchedCustomerId = customer.customerId
          break
        }
      }

      pageNumber += 1
    }

    if (!matchedCustomerId) {
      console.warn('[Etherfuse] recovery: publicKey not found in any customer wallet', publicKey)
      return null
    }

    const bankAccountId = await getCustomerBankAccountId(matchedCustomerId)
    if (!bankAccountId) {
      return null
    }

    return { customerId: matchedCustomerId, bankAccountId, presignedUrl: '' }
  } catch {
    return null
  }
}

export const createOnboarding = async (
  publicKey: string,
  customerId: string = uuid.v4()
): Promise<TOnboardingResult> => {
  const bankAccountId = uuid.v4()

  try {
    const response = await request<TOnboardingResponse>('POST', '/ramp/onboarding-url', {
      customerId,
      bankAccountId,
      publicKey,
      blockchain: BLOCKCHAIN,
    })

    // TODO: Remove this when Etherfuse resolves correctly.
    if (EnvHelper.IS_ETHERFUSE_SANDBOX) {
      try {
        console.info('[Etherfuse] sandbox auto-KYC submitting mock identity', { customerId })
        await submitKyc(customerId, {
          publicKey,
          identity: { ...SANDBOX_KYC_IDENTITY, id: publicKey },
        })
      } catch (error) {
        console.error('[Etherfuse] sandbox auto-KYC failed', error)
      }
    }

    return { customerId, bankAccountId, presignedUrl: response.presigned_url }
  } catch (error) {
    if ((error as Error).message !== ErrorCode.CUSTOMER_ALREADY_EXISTS) throw error

    // The address already belongs to an org/customer — retry the onboarding-url with
    // that existing id as the customerId so Etherfuse returns its presigned URL.
    const existingCustomerId = (error as { organizationId?: string }).organizationId
    if (existingCustomerId) {
      const retry = await createOnboarding(publicKey, existingCustomerId)

      // Retry succeeded — sync the database row so its customerId matches the real one.
      try {
        await upsertEtherfuseCustomer({ publicKey, customerId: existingCustomerId })
      } catch (persistError) {
        console.error('[Etherfuse] failed to update customerId in database', persistError)
      }

      return { customerId: existingCustomerId, bankAccountId, presignedUrl: retry.presignedUrl }
    }

    const recovered = await findCustomerByPublicKey(publicKey)
    if (recovered) return recovered

    throw error
  }
}

export const createOrganization = async (
  payload: TOrganizationPayload
): Promise<TOrganizationResult> => {
  const organizationId = uuid.v4()
  const walletId = uuid.v4()

  const response = await request<TOrganizationResponse>('POST', '/ramp/organization', {
    id: organizationId,
    displayName: payload.displayName,
    accountType: payload.accountType,
    userInfo: {
      email: payload.email,
      displayName: payload.userDisplayName,
    },
    wallets: [{ id: walletId, publicKey: payload.publicKey, blockchain: BLOCKCHAIN }],
  })

  return {
    organizationId: response.organizationId,
    displayName: response.displayName,
    accountType: response.accountType,
    wallets: response.wallets,
  }
}

export const submitKyc = async (
  customerId: string,
  payload: TSubmitKycPayload
): Promise<TSubmitKycResult> => {
  const response = await request<TSubmitKycResponse>(
    'POST',
    `/ramp/customer/${encodeURIComponent(customerId)}/kyc`,
    {
      pubkey: payload.publicKey,
      identity: payload.identity,
    }
  )

  return { status: response.status, message: response.message }
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
