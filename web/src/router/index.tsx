import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'

import type { TAuthMeResult, TUser } from 'fractapay-shared'

import { RootLayout } from '../components/RootLayout'
import { EnvHelper } from '../helpers/EnvHelper'
import { ChatPage } from '../pages/ChatPage'
import { DestinationsPage } from '../pages/DestinationsPage'
import { LoginPage } from '../pages/LoginPage'
import { PaymentPage } from '../pages/PaymentPage'

const fetchCurrentUser = async (): Promise<TUser | null> => {
  try {
    const response = await fetch(`${EnvHelper.API_URL}/auth/me`, {
      credentials: 'include',
    })

    if (!response.ok) return null

    const data = (await response.json()) as TAuthMeResult

    return data.success ? data.user : null
  } catch {
    return null
  }
}

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'auth',
  component: RootLayout,
  beforeLoad: async () => {
    const user = await fetchCurrentUser()

    if (!user) {
      throw redirect({ to: '/login' })
    }
  },
})

const indexRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/payments' })
  },
})

const chatRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/payments',
  component: ChatPage,
})

const destinationsRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/destinations',
  component: DestinationsPage,
})

const paymentRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/payment/$orderId',
  component: PaymentPage,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: async () => {
    const user = await fetchCurrentUser()

    if (user) {
      throw redirect({ to: '/payments' })
    }
  },
  component: LoginPage,
})

const catchAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$',
  beforeLoad: () => {
    throw redirect({ to: '/payments' })
  },
})

const routeTree = rootRoute.addChildren([
  authRoute.addChildren([indexRoute, chatRoute, destinationsRoute, paymentRoute]),
  loginRoute,
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
