import { useMemo } from 'react'

import { IndexedDBStorage, SmartAccountKit } from 'smart-account-kit'

import { APP_NAME } from 'fractapay-shared'

import { EnvHelper } from '../helpers/EnvHelper'

let kitSingleton: SmartAccountKit | null = null

const getKit = (): SmartAccountKit => {
  if (!kitSingleton) {
    kitSingleton = new SmartAccountKit({
      rpcUrl: EnvHelper.VITE_SOROBAN_RPC_URL,
      networkPassphrase: EnvHelper.VITE_STELLAR_NETWORK_PASSPHRASE,
      accountWasmHash: EnvHelper.VITE_ACCOUNT_WASM_HASH,
      webauthnVerifierAddress: EnvHelper.VITE_WEBAUTHN_VERIFIER_ADDRESS,
      storage: new IndexedDBStorage(),
    })
  }

  return kitSingleton
}

export type TCreateWalletResult = {
  contractId: string
  credentialId: string
}

export function useSmartAccount() {
  return useMemo(() => {
    const kit = getKit()

    return {
      kit,
      createWallet: async (userName: string): Promise<TCreateWalletResult> => {
        const nativeTokenContract = EnvHelper.VITE_NATIVE_TOKEN_CONTRACT || undefined
        const result = await kit.createWallet(APP_NAME, userName, {
          autoSubmit: true,
          autoFund: Boolean(nativeTokenContract),
          nativeTokenContract,
        })

        if (result.submitResult && !result.submitResult.success) {
          throw new Error(result.submitResult.error ?? 'Wallet deployment failed')
        }

        return { contractId: result.contractId, credentialId: result.credentialId }
      },
      connectWallet: (contractId?: string) =>
        contractId
          ? kit.connectWallet({ prompt: true, contractId })
          : kit.connectWallet({ prompt: true }),
      connectExistingWallet: async (): Promise<TCreateWalletResult> => {
        const { credentialId } = await kit.authenticatePasskey()
        const contracts = await kit.discoverContractsByCredential(credentialId)

        if (!contracts || contracts.length === 0) {
          throw new Error('NO_SMART_ACCOUNT')
        }

        const contractId = contracts[0].contract_id
        const result = await kit.connectWallet({ contractId, credentialId })

        if (!result) {
          throw new Error('CONNECT_FAILED')
        }

        return { contractId: result.contractId, credentialId: result.credentialId }
      },
      rehydrate: () => kit.connectWallet(),
    }
  }, [])
}
