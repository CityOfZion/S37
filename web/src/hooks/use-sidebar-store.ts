import { create } from 'zustand'

type TSidebarStore = {
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
}

export const useSidebarStore = create<TSidebarStore>(set => ({
  mobileOpen: false,
  setMobileOpen: open => set({ mobileOpen: open }),
}))
