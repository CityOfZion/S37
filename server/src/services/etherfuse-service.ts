import { Customer } from '@prisma/client'
import axios, { type AxiosInstance, isAxiosError } from 'axios'
import BigNumber from 'bignumber.js'
import * as uuid from 'uuid'

import {
  TKycStatus,
  TKycStatusResponse,
  TOnboardingResult,
  TPaymentPix,
  TPaymentStatus,
  TQuotePayload,
  TQuoteResult,
  TToken,
} from 'fractapay-shared'
import { EErrorCode, FEE_PERCENTAGE, StringHelper, TOKEN } from 'fractapay-shared'

import { isMainnet } from '../constants'
import { EnvHelper } from '../helpers/EnvHelper'
import { StellarExpertsHelper } from '../helpers/StellarExpertsHelper'
import { prisma } from './prisma-service'

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

const SANDBOX_KYC_IDENTITY: TKycIdentity = {
  id: 'PUBLIC_KEY',
  email: 'test@coz.io',
  phoneNumber: '+5511999999999',
  occupation: 'Software Engineer',
  name: { givenName: 'Test', familyName: 'COZ' },
  dateOfBirth: '1990-01-01',
  address: {
    street: 'Avenida Paulista, 1000',
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

type TCreateOrderPayload = {
  quoteId: string
  customerId: string
  bankAccountId: string
  address: string
}

type TOrderResponse = {
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

type TOrderResult = {
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

type TKycAddress = {
  street: string
  city: string
  region: string
  postalCode: string
  country: string
}

type TKycName = { givenName: string; familyName: string }

type TKycIdNumber = { value: string; type: string }

type TKycIdentity = {
  id: string
  email: string
  phoneNumber: string
  occupation: string
  name: TKycName
  dateOfBirth: string
  address: TKycAddress
  idNumbers?: TKycIdNumber[]
}

type TSubmitKycPayload = {
  address: string
  identity: TKycIdentity
}

type TSubmitKycResponse = {
  status: string
  message: string
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
        const raw =
          typeof error.response?.data === 'string'
            ? error.response.data
            : JSON.stringify(error.response?.data || '')

        const match = raw.match(/see org:\s*([0-9a-fA-F-]{36})/)

        const conflict = new Error(EErrorCode.CUSTOMER_ALREADY_EXISTS) as Error & {
          organizationId?: string
        }

        if (match) conflict.organizationId = match[1]

        throw conflict
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

export const findCustomerByAddress = async (address: string): Promise<TOnboardingResult | null> => {
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

        if (wallets.items.some(wallet => wallet.publicKey === address)) {
          matchedCustomerId = customer.customerId
          break
        }
      }

      pageNumber += 1
    }

    if (!matchedCustomerId) {
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
  address: string,
  customerId: string = uuid.v4()
): Promise<TOnboardingResult> => {
  const bankAccountId = uuid.v4()

  try {
    const response = await request<TOnboardingResponse>('POST', '/ramp/onboarding-url', {
      customerId,
      bankAccountId,
      publicKey: address,
      blockchain: BLOCKCHAIN,
    })

    // TODO: remove this when Etherfuse resolves correctly
    if (!isMainnet) {
      try {
        await submitKyc(customerId, {
          address,
          identity: { ...SANDBOX_KYC_IDENTITY, id: address },
        })
      } catch {
        // Ignore - if this fails, the customer just won't be auto-approved in the sandbox.
      }
    }

    return { customerId, bankAccountId, presignedUrl: response.presigned_url }
  } catch (error) {
    if ((error as Error).message !== EErrorCode.CUSTOMER_ALREADY_EXISTS) throw error

    // The address already belongs to an org/customer — retry the onboarding-url with
    // that existing id as the customerId so Etherfuse returns its presigned URL.
    const existingCustomerId = (error as { organizationId?: string }).organizationId
    if (existingCustomerId) {
      const retry = await createOnboarding(address, existingCustomerId)

      // Retry succeeded — sync the database row so its customerId matches the real one.
      try {
        await upsertCustomer({ address, customerId: existingCustomerId })
      } catch {
        // Ignore any errors here — the onboarding succeeded, so the user can proceed even if our database is out of sync.
        // We'll have another chance to fix it on their next onboarding attempt, or we can do it manually if needed.
      }

      return { customerId: existingCustomerId, bankAccountId, presignedUrl: retry.presignedUrl }
    }

    const recovered = await findCustomerByAddress(address)
    if (recovered) return recovered

    throw error
  }
}

export const submitKyc = async (
  customerId: string,
  payload: TSubmitKycPayload
): Promise<TSubmitKycResponse> => {
  const response = await request<TSubmitKycResponse>(
    'POST',
    `/ramp/customer/${encodeURIComponent(customerId)}/kyc`,
    {
      pubkey: payload.address,
      identity: payload.identity,
    }
  )

  return { status: response.status, message: response.message }
}

export const getKycStatus = async (
  customerId: string,
  address: string
): Promise<TKycStatusResponse> => {
  const response = await request<TKycRawResponse>(
    'GET',
    `/ramp/customer/${encodeURIComponent(customerId)}/kyc/${encodeURIComponent(address)}`
  )

  return { status: mapKycStatus(response.status) }
}

export const createQuote = async (payload: TQuotePayload): Promise<TQuoteResult> => {
  const quoteId = uuid.v4()
  const targetAsset = TOKEN_ASSET[payload.token]
  const { address } = payload

  const response = await request<TQuoteResponse>('POST', '/ramp/quote', {
    quoteId,
    customerId: payload.customerId,
    blockchain: BLOCKCHAIN,
    quoteAssets: { type: 'onramp', sourceAsset: 'BRL', targetAsset },
    sourceAmount: payload.sourceAmount,
    walletAddress: address,
  })

  const providerFee = new BigNumber(response.feeAmount || '0')
  const fee = new BigNumber(response.sourceAmount).times(FEE_PERCENTAGE)
  const feeAmount = StringHelper.formatAmount(providerFee.plus(fee))

  return {
    quoteId: response.quoteId,
    sourceAmount: response.sourceAmount,
    destinationAmount: response.destinationAmountAfterFee || response.destinationAmount,
    exchangeRate: response.exchangeRate,
    feeAmount,
    address,
    addressUrl: StellarExpertsHelper.getAddressUrl(address),
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
): Promise<TOrderResponse | null> => {
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

export const createOrder = async (payload: TCreateOrderPayload): Promise<TOrderResponse> => {
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

export const getOrder = async (orderId: string): Promise<TOrderResponse> => {
  const response = await request<TOrderResult>('GET', `/ramp/order/${encodeURIComponent(orderId)}`)

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
      }) || undefined,
  }
}

export const simulateFiatReceived = async (orderId: string): Promise<void> => {
  await request<unknown>('POST', '/ramp/order/fiat_received', { orderId })
}

export const findCustomerByAddressFromDatabase = async (
  address: string
): Promise<Customer | null> => {
  return prisma.customer.findUnique({ where: { address } })
}

type TUpsertCustomerParams = {
  address: string
  customerId: string
  bankAccountId?: string
  userId?: string
}

export const upsertCustomer = async ({
  userId,
  customerId,
  bankAccountId,
  address,
}: TUpsertCustomerParams): Promise<Customer> => {
  const [customer] = await prisma.$transaction([
    prisma.customer.upsert({
      where: { address },
      update: { customerId, bankAccountId },
      create: { customerId, bankAccountId, address },
    }),
    ...(userId ? [prisma.user.update({ where: { id: userId }, data: { address } })] : []),
  ])

  return customer
}
