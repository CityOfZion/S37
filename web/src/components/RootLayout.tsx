import { useEffect, useRef } from 'react'

import { Outlet, useRouterState } from '@tanstack/react-router'

import { useDestinationsQuery } from '../hooks/use-destinations-query'
import { useDestinationsStore } from '../hooks/use-destinations-store'
import { useSidebarStore } from '../hooks/use-sidebar-store'
import { Sidebar } from './Sidebar'
import { Toolbar } from './Toolbar'

export const RootLayout = () => {
  const { mobileOpen, chatSidebarOpen } = useSidebarStore()
  const { data: destinationsData } = useDestinationsQuery()
  const setDestinations = useDestinationsStore(state => state.setDestinations)
  const nonSidebarRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const currentPath = useRouterState({ select: state => state.location.pathname })
  const isChat = currentPath.startsWith('/chat')

  useEffect(() => {
    if (destinationsData) {
      setDestinations(destinationsData)
    }
  }, [destinationsData, setDestinations])

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
    const element = toolbarRef.current
    if (!element) return

    if (chatSidebarOpen) {
      element.setAttribute('inert', '')
    } else {
      element.removeAttribute('inert')
    }
  }, [chatSidebarOpen])

  return (
    <div className="bg-neutral-50 text-neutral-900 h-full lg:flex overflow-hidden">
      <Sidebar />
      <div ref={nonSidebarRef} className="flex-1 min-w-0 flex flex-col overflow-hidden h-full">
        <div ref={toolbarRef} data-toolbar className="h-14 shrink-0">
          <Toolbar />
        </div>
        <main
          id="main-scroll"
          className={isChat ? 'flex-1 overflow-hidden flex flex-col' : 'flex-1 overflow-y-auto'}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
