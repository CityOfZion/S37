import { Networks } from '@stellar/stellar-sdk'

import { EnvHelper } from '../helpers/EnvHelper'

export const isProduction = process.env.NODE_ENV === 'production'
export const isMainnet = !EnvHelper.ETHERFUSE_BASE_URL.includes('sand')
export const SERVICE_NAME = 'fractapay-server'
export const PKCE_COOKIE_NAME = 'fractapay.pkce'

export const SOROBAN_RPC_URL = isMainnet
  ? 'https://mainnet.sorobanrpc.com'
  : 'https://soroban-testnet.stellar.org'

export const NETWORK_PASSPHRASE = isMainnet ? Networks.PUBLIC : Networks.TESTNET
