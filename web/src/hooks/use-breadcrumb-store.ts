import { useEffect } from 'react'

import { create } from 'zustand'

export type TBreadcrumbItem = {
  label: string
  to?: string
}

type TBreadcrumbStore = {
  items: TBreadcrumbItem[]
  setItems: (items: TBreadcrumbItem[]) => void
}

export const useBreadcrumbStore = create<TBreadcrumbStore>(set => ({
  items: [],
  setItems: items => set({ items }),
}))

export function useBreadcrumb(items: TBreadcrumbItem[]) {
  const setItems = useBreadcrumbStore(state => state.setItems)
  const serializedItems = JSON.stringify(items)

  useEffect(() => {
    setItems(JSON.parse(serializedItems) as TBreadcrumbItem[])

    return () => setItems([])
  }, [serializedItems, setItems])
}
