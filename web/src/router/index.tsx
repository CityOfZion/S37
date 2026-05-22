import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'

import { MobileHeader } from '../components/MobileHeader'
import { Sidebar } from '../components/Sidebar'
import { ChatPage } from '../pages/ChatPage'
import { DestinationsPage } from '../pages/DestinationsPage'
import { PaymentPage } from '../pages/PaymentPage'

const rootRoute = createRootRoute({
  component: () => (
    <div className="bg-neutral-50 text-neutral-900 min-h-screen">
      <MobileHeader />
      <div className="lg:flex">
        <Sidebar />
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  ),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/payments' })
  },
})

const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/payments',
  component: ChatPage,
})

const destinationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/destinations',
  component: DestinationsPage,
})

const paymentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/payment/$orderId',
  component: PaymentPage,
})

const catchAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$',
  beforeLoad: () => {
    throw redirect({ to: '/payments' })
  },
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  chatRoute,
  destinationsRoute,
  paymentRoute,
  catchAllRoute,
])

export const router = createRouter({
  routeTree,
  basepath: import.meta.env.PROD ? '/S37' : '/',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
