import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'

import { HomePage } from '../pages/HomePage'
import { KycPage } from '../pages/KycPage'
import { PaymentPage } from '../pages/PaymentPage'

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
})

const kycRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/kyc',
  validateSearch: (search: Record<string, unknown>) => ({
    customerId: String(search.customerId || ''),
    publicKey: String(search.publicKey || ''),
    presignedUrl: String(search.presignedUrl || ''),
  }),
  beforeLoad: ({ search }) => {
    if (!search.customerId || !search.publicKey || !search.presignedUrl) {
      throw redirect({ to: '/' })
    }
  },
  component: KycPage,
})

const paymentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/payment/$orderId',
  component: PaymentPage,
})

const routeTree = rootRoute.addChildren([homeRoute, kycRoute, paymentRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
