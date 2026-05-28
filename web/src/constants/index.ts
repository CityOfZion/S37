import type { TLanguage } from 'fractapay-shared'

export const APP_NAME = 'FractaPay'

export const AUTH_TOKEN_STORAGE_KEY = 'fractapay.token'

export const PKCE_VERIFIER_STORAGE_KEY = 'fractapay.pkce_verifier'

export const PROD_BASE_PATH = '/S37'

export const BASE_PATH = import.meta.env.PROD ? PROD_BASE_PATH : undefined

export const LANGUAGE_NAMES: Record<TLanguage, string> = {
  'en-US': 'English',
  'pt-BR': 'Português',
}

const requireEnv = (name: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }

  return value
}

export const SMART_ACCOUNT_CONFIG = {
  rpcUrl: requireEnv('VITE_SOROBAN_RPC_URL', import.meta.env.VITE_SOROBAN_RPC_URL),
  networkPassphrase: requireEnv(
    'VITE_STELLAR_NETWORK_PASSPHRASE',
    import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE
  ),
  accountWasmHash: requireEnv('VITE_ACCOUNT_WASM_HASH', import.meta.env.VITE_ACCOUNT_WASM_HASH),
  webauthnVerifierAddress: requireEnv(
    'VITE_WEBAUTHN_VERIFIER_ADDRESS',
    import.meta.env.VITE_WEBAUTHN_VERIFIER_ADDRESS
  ),
  nativeTokenContract: import.meta.env.VITE_NATIVE_TOKEN_CONTRACT ?? '',
}
