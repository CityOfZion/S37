import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'

import { HomePage } from '../pages/HomePage'
import { PaymentPage } from '../pages/PaymentPage'

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
})

const paymentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/payment/$orderId',
  component: PaymentPage,
})

const routeTree = rootRoute.addChildren([homeRoute, paymentRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
