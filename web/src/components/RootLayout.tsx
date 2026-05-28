import { useEffect, useRef } from 'react'

import { Outlet } from '@tanstack/react-router'

import { useSidebarStore } from '../hooks/use-sidebar-store'
import { MobileHeader } from './MobileHeader'
import { Sidebar } from './Sidebar'

export const RootLayout = () => {
  const { mobileOpen, chatSidebarOpen } = useSidebarStore()
  const nonSidebarRef = useRef<HTMLDivElement>(null)
  const mobileHeaderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = nonSidebarRef.current
    if (!element) return

    if (mobileOpen) {
      element.setAttribute('inert', '')
    } else {
      element.removeAttribute('inert')
    }
  }, [mobileOpen])

  useEffect(() => {
    const element = mobileHeaderRef.current
    if (!element) return

    if (chatSidebarOpen) {
      element.setAttribute('inert', '')
    } else {
      element.removeAttribute('inert')
    }
  }, [chatSidebarOpen])

  return (
    <div className="bg-neutral-50 text-neutral-900 min-h-screen lg:flex">
      <Sidebar />
      <div ref={nonSidebarRef} className="flex-1 min-w-0 flex flex-col">
        <div ref={mobileHeaderRef} data-mobile-header>
          <MobileHeader />
        </div>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
