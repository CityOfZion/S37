import { create } from 'zustand'

import type { TDestination } from 'fractapay-shared'

type TDestinationsStore = {
  destinations: TDestination[]
  setDestinations: (destinations: TDestination[]) => void
  addDestination: (destination: TDestination) => void
  updateDestination: (destination: TDestination) => void
  deleteDestination: (id: string) => void
}

export const useDestinationsStore = create<TDestinationsStore>(set => ({
  destinations: [],
  setDestinations: destinations => set({ destinations }),
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
}))
