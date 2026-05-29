import { useMutation } from '@tanstack/react-query'

import { type TCreateWalletResult, useSmartAccount } from './use-smart-account'

export function useConnectExistingWalletMutation() {
  const { connectExistingWallet } = useSmartAccount()

  return useMutation<TCreateWalletResult, Error>({
    mutationFn: () => connectExistingWallet(),
  })
}
