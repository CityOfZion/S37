import { z } from 'zod'

const envSchema = z.object({
  VITE_API_URL: z.string().default('http://localhost:3000'),
  VITE_SOROBAN_RPC_URL: z.string().min(1, 'VITE_SOROBAN_RPC_URL is required'),
  VITE_STELLAR_NETWORK_PASSPHRASE: z.string().min(1, 'VITE_STELLAR_NETWORK_PASSPHRASE is required'),
  VITE_ACCOUNT_WASM_HASH: z.string().min(1, 'VITE_ACCOUNT_WASM_HASH is required'),
  VITE_WEBAUTHN_VERIFIER_ADDRESS: z.string().min(1, 'VITE_WEBAUTHN_VERIFIER_ADDRESS is required'),
  VITE_NATIVE_TOKEN_CONTRACT: z.string().min(1, 'VITE_NATIVE_TOKEN_CONTRACT is required'),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success || !parsed.data) {
  throw new Error(`Invalid environment variables: ${JSON.stringify(parsed.error.issues)}`)
}

const data = parsed.data

export class EnvHelper {
  static readonly API_URL = data.VITE_API_URL
  static readonly VITE_SOROBAN_RPC_URL = data.VITE_SOROBAN_RPC_URL
  static readonly VITE_STELLAR_NETWORK_PASSPHRASE = data.VITE_STELLAR_NETWORK_PASSPHRASE
  static readonly VITE_ACCOUNT_WASM_HASH = data.VITE_ACCOUNT_WASM_HASH
  static readonly VITE_WEBAUTHN_VERIFIER_ADDRESS = data.VITE_WEBAUTHN_VERIFIER_ADDRESS
  static readonly VITE_NATIVE_TOKEN_CONTRACT = data.VITE_NATIVE_TOKEN_CONTRACT
}
