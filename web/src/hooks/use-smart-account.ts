import { useMemo } from 'react'

import { rpc, Transaction } from '@stellar/stellar-sdk'
import { IndexedDBStorage, SmartAccountKit } from 'smart-account-kit'

import { APP_NAME } from 'fractapay-shared'

import { EnvHelper } from '../helpers/EnvHelper'
import { server } from '../services/server'

type TTransactionSubmitResponse = { hash: string }

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
          throw new Error()
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
      signTransaction: async (transactionData: string): Promise<string> => {
        await kit.connectWallet()

        const sorobanServer = new rpc.Server(EnvHelper.VITE_SOROBAN_RPC_URL)
        const transaction = new Transaction(
          transactionData,
          EnvHelper.VITE_STELLAR_NETWORK_PASSPHRASE
        )

        const simulateResult = await sorobanServer.simulateTransaction(transaction)

        if (rpc.Api.isSimulationError(simulateResult)) {
          throw new Error()
        }

        const assembled = rpc.assembleTransaction(transaction, simulateResult).build()
        const envelope = assembled.toEnvelope()

        for (const operation of envelope.v1().tx().operations()) {
          if (operation.body().switch().name === 'invokeHostFunction') {
            const invokeOperation = operation.body().invokeHostFunctionOp()
            const authEntries = invokeOperation.auth()

            if (authEntries.length > 0) {
              const signedEntries = await Promise.all(
                authEntries.map(async entry => await kit.signAuthEntry(entry))
              )

              invokeOperation.auth(signedEntries)
            }
          }
        }

        const { data } = await server.post<TTransactionSubmitResponse>('/transactions/submit', {
          transactionData: envelope.toXDR('base64'),
        })

        return data.hash
      },
    }
  }, [])
}
