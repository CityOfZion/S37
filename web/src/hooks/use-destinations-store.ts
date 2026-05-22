import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { TDestination } from 'fractapay-shared'

type TDestinationsStore = {
  destinations: TDestination[]
  addDestination: (destination: TDestination) => void
  updateDestination: (destination: TDestination) => void
  deleteDestination: (id: string) => void
}

export const useDestinationsStore = create<TDestinationsStore>()(
  persist(
    set => ({
      destinations: [],
      addDestination: destination =>
        set(state => ({ destinations: [...state.destinations, destination] })),
      updateDestination: destination =>
        set(state => ({
          destinations: state.destinations.map(existing =>
            existing.id === destination.id ? destination : existing
          ),
        })),
      deleteDestination: id =>
        set(state => ({
          destinations: state.destinations.filter(existing => existing.id !== id),
        })),
    }),
    { name: 'fractapay.destinations' }
  )
)
