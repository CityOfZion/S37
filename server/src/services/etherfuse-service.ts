import { Customer } from '@prisma/client'
import { Keypair, rpc, Transaction } from '@stellar/stellar-sdk'
import axios, { type AxiosInstance, isAxiosError } from 'axios'
import BigNumber from 'bignumber.js'
import * as uuid from 'uuid'

import {
  EErrorCode,
  FEE_PERCENTAGE,
  FIAT_CURRENCY_BY_TOKEN,
  StringHelper,
  TKycStatus,
  TKycStatusResponse,
  TOKEN,
  TOnboardingResult,
  TPaymentPix,
  TPaymentStatus,
  TQuotePayload,
  TQuoteResult,
  TToken,
} from 'fractapay-shared'

import { isMainnet, NETWORK_PASSPHRASE, SOROBAN_RPC_URL } from '../constants'
import { EnvHelper } from '../helpers/EnvHelper'
import { StellarExpertsHelper } from '../helpers/StellarExpertsHelper'
import { prisma } from './prisma-service'

const FEE_PAYER_KEYPAIR = Keypair.fromSecret(EnvHelper.FEE_PAYER_SECRET_KEY)
const BLOCKCHAIN = 'stellar'
const FRIENDBOT_URL = 'https://friendbot.stellar.org'

const ensureAccountFunded = async (address: string): Promise<void> => {
  if (isMainnet) return

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

type TCreateOnrampOrderPayload = {
  externalQuoteId: string
  externalCustomerId: string
  externalBankAccountId: string
  address: string
}

type TOnrampOrderResponse = {
  externalId: string
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

type TCreateOnrampOrderResponse = {
  onramp: {
    orderId: string
    depositAmount: string
    depositPixKey?: string
    depositPixKeyType?: string
    depositPixCode?: string
    beneficiary?: string
  }
}

type TOnrampOrderResult = {
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

export const getCustomerExternalBankAccountId = async (
  externalCustomerId: string
): Promise<string | null> => {
  const banks = await request<TBankAccountListResponse>(
    'GET',
    `/ramp/customer/${encodeURIComponent(externalCustomerId)}/bank-accounts`
  )

  return banks.items[0]?.bankAccountId || null
}

export const findCustomerByAddress = async (address: string): Promise<TOnboardingResult | null> => {
  try {
    const pageSize = 100
    let pageNumber = 0
    let totalPages = 1
    let externalCustomerId: string | null = null

    while (pageNumber < totalPages && !externalCustomerId) {
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
          externalCustomerId = customer.customerId
          break
        }
      }

      pageNumber += 1
    }

    if (!externalCustomerId) {
      return null
    }

    const externalBankAccountId = await getCustomerExternalBankAccountId(externalCustomerId)

    if (!externalBankAccountId) {
      return null
    }

    return { externalCustomerId, externalBankAccountId, presignedUrl: '' }
  } catch {
    return null
  }
}

export const createOnboarding = async (
  address: string,
  externalCustomerId: string = uuid.v4()
): Promise<TOnboardingResult> => {
  const externalBankAccountId = uuid.v4()

  try {
    const response = await request<TOnboardingResponse>('POST', '/ramp/onboarding-url', {
      customerId: externalCustomerId,
      bankAccountId: externalBankAccountId,
      publicKey: address,
      blockchain: BLOCKCHAIN,
    })

    // TODO: remove this when Etherfuse solves the KYC
    if (!isMainnet) {
      try {
        await submitKyc(externalCustomerId, {
          address,
          identity: { ...SANDBOX_KYC_IDENTITY, id: address },
        })
      } catch {
        // Ignore - if this fails, the customer just won't be auto-approved in the sandbox.
      }
    }

    return { externalCustomerId, externalBankAccountId, presignedUrl: response.presigned_url }
  } catch (error) {
    if ((error as Error).message !== EErrorCode.CUSTOMER_ALREADY_EXISTS) throw error

    // The address already belongs to an org/customer — retry the onboarding-url with
    // that existing id as the customerId so Etherfuse returns its presigned URL.
    const externalCustomerId = (error as { organizationId?: string }).organizationId
    if (externalCustomerId) {
      const retry = await createOnboarding(address, externalCustomerId)

      // Retry succeeded — sync the database row so its customerId matches the real one.
      try {
        await saveCustomer({ address, externalCustomerId, externalBankAccountId })
      } catch {
        // Ignore any errors here — the onboarding succeeded, so the user can proceed even if our database is out of sync.
      }

      return {
        externalCustomerId,
        externalBankAccountId,
        presignedUrl: retry.presignedUrl,
      }
    }

    const recovered = await findCustomerByAddress(address)

    if (recovered) return recovered

    throw error
  }
}

export const submitKyc = async (
  externalCustomerId: string,
  payload: TSubmitKycPayload
): Promise<TSubmitKycResponse> => {
  const response = await request<TSubmitKycResponse>(
    'POST',
    `/ramp/customer/${encodeURIComponent(externalCustomerId)}/kyc`,
    {
      pubkey: payload.address,
      identity: payload.identity,
    }
  )

  return { status: response.status, message: response.message }
}

export const getKycStatus = async (
  externalCustomerId: string,
  address: string
): Promise<TKycStatusResponse> => {
  const response = await request<TKycRawResponse>(
    'GET',
    `/ramp/customer/${encodeURIComponent(externalCustomerId)}/kyc/${encodeURIComponent(address)}`
  )

  return { status: mapKycStatus(response.status) }
}

export const createQuote = async (payload: TQuotePayload): Promise<TQuoteResult> => {
  const { address, token } = payload
  const externalQuoteId = uuid.v4()
  const targetAsset = TOKEN_ASSET[token]

  const response = await request<TQuoteResponse>('POST', '/ramp/quote', {
    quoteId: externalQuoteId,
    customerId: payload.externalCustomerId,
    blockchain: BLOCKCHAIN,
    quoteAssets: { type: 'onramp', sourceAsset: FIAT_CURRENCY_BY_TOKEN[token], targetAsset },
    sourceAmount: payload.sourceAmount,
    walletAddress: address,
  })

  const providerFee = new BigNumber(response.feeAmount || '0')
  const fee = new BigNumber(response.sourceAmount).times(FEE_PERCENTAGE)
  const feeAmount = StringHelper.formatAmount(providerFee.plus(fee))

  return {
    externalQuoteId: response.quoteId,
    sourceAmount: response.sourceAmount,
    destinationAmount: response.destinationAmountAfterFee || response.destinationAmount,
    exchangeRate: response.exchangeRate,
    feeAmount,
    address,
    addressUrl: StellarExpertsHelper.getContractUrl(address),
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
  externalCustomerId: string,
  externalBankAccountId: string
): Promise<TOnrampOrderResponse | null> => {
  try {
    const response = await request<TOrderListResponse>(
      'GET',
      `/ramp/orders?customerId=${encodeURIComponent(externalCustomerId)}&pageSize=50`
    )

    const match = response.items.find(
      item =>
        item.status === 'CREATED' &&
        (!item.bankAccountId || item.bankAccountId === externalBankAccountId)
    )

    if (!match) return null

    return await getOrder(match.orderId)
  } catch {
    return null
  }
}

export const createOnrampOrder = async (
  payload: TCreateOnrampOrderPayload
): Promise<TOnrampOrderResponse> => {
  const externalId = uuid.v4()

  await ensureAccountFunded(payload.address)

  try {
    const response = await request<TCreateOnrampOrderResponse>('POST', '/ramp/order', {
      orderId: externalId,
      quoteId: payload.externalQuoteId,
      bankAccountId: payload.externalBankAccountId,
      publicKey: payload.address,
    })

    const { onramp } = response

    return {
      externalId: onramp.orderId,
      status: 'CREATED',
      pix:
        mapPix({
          depositPixCode: onramp.depositPixCode,
          depositPixKey: onramp.depositPixKey,
          depositPixKeyType: onramp.depositPixKeyType,
          beneficiary: onramp.beneficiary,
          amount: onramp.depositAmount,
        }) || undefined,
    }
  } catch (error) {
    if ((error as Error).message !== EErrorCode.PENDING_ORDER_EXISTS) throw error

    const existing = await findPendingOrder(
      payload.externalCustomerId,
      payload.externalBankAccountId
    )
    if (existing) return { ...existing, isRecovered: true }

    throw error
  }
}

export const getOrder = async (externalId: string): Promise<TOnrampOrderResponse> => {
  const response = await request<TOnrampOrderResult>(
    'GET',
    `/ramp/order/${encodeURIComponent(externalId)}`
  )

  return {
    externalId: response.orderId,
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

export const simulateFiatReceived = async (externalId: string): Promise<void> => {
  await request<unknown>('POST', '/ramp/order/fiat_received', { orderId: externalId })
}

type TCreateOfframpOrderPayload = {
  externalCustomerId: string
  externalBankAccountId: string
  address: string
  tokenAmount: string
  token: TToken
}

type TOfframpOrderResult = {
  externalId: string
  transactionData: string | null
}

type TOfframpCreateOrderRawResponse = {
  orderId?: string
  burnTransaction?: string
  offramp?: {
    orderId?: string
    burnTransaction?: string
  }
}

export const createOfframpOrder = async (
  payload: TCreateOfframpOrderPayload
): Promise<TOfframpOrderResult> => {
  await ensureAccountFunded(FEE_PAYER_KEYPAIR.publicKey())

  const externalQuoteId = uuid.v4()
  const { token } = payload
  const sourceAsset = TOKEN_ASSET[token]

  const quote = await request<TQuoteResponse>('POST', '/ramp/quote', {
    quoteId: externalQuoteId,
    customerId: payload.externalCustomerId,
    blockchain: BLOCKCHAIN,
    quoteAssets: {
      type: 'offramp',
      sourceAsset,
      targetAsset: FIAT_CURRENCY_BY_TOKEN[token],
    },
    sourceAmount: payload.tokenAmount,
    walletAddress: payload.address,
  })

  const externalOrderId = uuid.v4()

  const response = await request<TOfframpCreateOrderRawResponse>('POST', '/ramp/order', {
    orderId: externalOrderId,
    quoteId: quote.quoteId,
    bankAccountId: payload.externalBankAccountId,
    publicKey: payload.address,
    feePayer: FEE_PAYER_KEYPAIR.publicKey(),
  })

  const data = response.offramp || response
  const externalId = data.orderId || externalOrderId
  const transactionData = data.burnTransaction || null

  return { externalId, transactionData }
}

export const signAndSubmitTransaction = async (transactionData: string): Promise<string> => {
  await ensureAccountFunded(FEE_PAYER_KEYPAIR.publicKey())

  const server = new rpc.Server(SOROBAN_RPC_URL)

  const transaction = await server.prepareTransaction(
    new Transaction(transactionData, NETWORK_PASSPHRASE)
  )

  transaction.sign(FEE_PAYER_KEYPAIR)

  const result = await server.sendTransaction(transaction)

  if (result.status === 'ERROR') {
    throw new Error()
  }

  return result.hash
}

type TOfframpOrderResponse = { burnTransaction?: string }

export const getOfframpTransactionData = async (id: string): Promise<string | null> => {
  try {
    const response = await request<TOfframpOrderResponse>(
      'GET',
      `/ramp/order/${encodeURIComponent(id)}`
    )

    return response.burnTransaction || null
  } catch {
    return null
  }
}

export const findCustomerByAddressFromDatabase = async (
  address: string
): Promise<Customer | null> => {
  return prisma.customer.findUnique({ where: { address } })
}

type TSaveCustomerParams = {
  address: string
  externalCustomerId: string
  externalBankAccountId?: string
}

export const saveCustomer = async ({
  address,
  externalCustomerId,
  externalBankAccountId,
}: TSaveCustomerParams): Promise<void> => {
  await prisma.customer.upsert({
    where: { address },
    update: { externalCustomerId, externalBankAccountId },
    create: { externalCustomerId, externalBankAccountId, address },
  })
}
