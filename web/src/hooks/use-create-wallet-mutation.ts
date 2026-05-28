import { useMutation } from '@tanstack/react-query'

import { type TCreateWalletResult, useSmartAccount } from './use-smart-account'

export function useCreateWalletMutation() {
  const { createWallet } = useSmartAccount()

  return useMutation<TCreateWalletResult, Error, { userName: string }>({
    mutationFn: ({ userName }) => createWallet(userName),
  })
}
