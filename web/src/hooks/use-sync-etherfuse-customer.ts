import { useEffect, useRef } from 'react'

import type { TOnboardingResult } from 'fractapay-shared'
import { StellarHelper } from 'fractapay-shared'

import { server } from '../services/server'
import { useKycStore } from './use-kyc-store'
import { useUserQuery } from './use-user-query'

export function useSyncEtherfuseCustomer() {
  const { data: user } = useUserQuery()
  const setAccount = useKycStore(state => state.setAccount)
  const accounts = useKycStore(state => state.accounts)
  const syncedAddresses = useRef<Set<string>>(new Set())

  useEffect(() => {
    const address = user?.address

    if (!address || !StellarHelper.isValidStellarDestination(address)) {
      return
    }

    if (accounts[address]) {
      return
    }

    if (syncedAddresses.current.has(address)) {
      return
    }

    syncedAddresses.current.add(address)

    void server
      .post<TOnboardingResult>(`/customer/${encodeURIComponent(address)}`)
      .then(({ data }) => {
        setAccount(address, data)
      })
      .catch(() => {})
  }, [user?.address, setAccount, accounts])
}
