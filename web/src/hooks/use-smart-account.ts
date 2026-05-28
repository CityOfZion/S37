import { useMemo } from 'react'

import { IndexedDBStorage, SmartAccountKit } from 'smart-account-kit'

import { APP_NAME, SMART_ACCOUNT_CONFIG } from '../constants'

let kitSingleton: SmartAccountKit | null = null

const getKit = (): SmartAccountKit => {
  if (!kitSingleton) {
    kitSingleton = new SmartAccountKit({
      rpcUrl: SMART_ACCOUNT_CONFIG.rpcUrl,
      networkPassphrase: SMART_ACCOUNT_CONFIG.networkPassphrase,
      accountWasmHash: SMART_ACCOUNT_CONFIG.accountWasmHash,
      webauthnVerifierAddress: SMART_ACCOUNT_CONFIG.webauthnVerifierAddress,
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
        const nativeTokenContract = SMART_ACCOUNT_CONFIG.nativeTokenContract || undefined
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
