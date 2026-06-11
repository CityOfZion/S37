import { useMutation } from '@tanstack/react-query'

import { useSmartAccount } from './use-smart-account'

export function useSignTransactionsMutation() {
  const { signTransaction } = useSmartAccount()

  return useMutation({
    mutationFn: async (transactionsData: string[]) => {
      await Promise.allSettled(transactionsData.map(signTransaction))
    },
  })
}
