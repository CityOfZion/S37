import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router'

import { RootLayout } from '../components/RootLayout'
import { ChatPage } from '../pages/ChatPage'
import { DestinationsPage } from '../pages/DestinationsPage'
import { PaymentPage } from '../pages/PaymentPage'

const rootRoute = createRootRoute({ component: RootLayout })

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
  basepath: import.meta.env.PROD ? '/S37' : undefined,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
