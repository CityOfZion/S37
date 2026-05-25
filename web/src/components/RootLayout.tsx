import { useEffect, useRef } from 'react'

import { Outlet } from '@tanstack/react-router'

import { useSidebarStore } from '../hooks/use-sidebar-store'
import { MobileHeader } from './MobileHeader'
import { Sidebar } from './Sidebar'

export const RootLayout = () => {
  const { mobileOpen } = useSidebarStore()
  const nonSidebarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = nonSidebarRef.current
    if (!element) return

    if (mobileOpen) {
      element.setAttribute('inert', '')
    } else {
      element.removeAttribute('inert')
    }
  }, [mobileOpen])

  return (
    <div className="bg-neutral-50 text-neutral-900 min-h-screen lg:flex">
      <Sidebar />
      <div ref={nonSidebarRef} className="flex-1 min-w-0 flex flex-col">
        <MobileHeader />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
