import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'

import type { TAuthMeResult, TUser } from 'fractapay-shared'

import { RootLayout } from '../components/RootLayout'
import { BASE_PATH } from '../constants'
import { ChatPage } from '../pages/ChatPage'
import { DestinationsPage } from '../pages/DestinationsPage'
import { LoginPage } from '../pages/LoginPage'
import { OnboardingPage } from '../pages/OnboardingPage'
import { PaymentPage } from '../pages/PaymentPage'
import { server } from '../services/server'

const fetchCurrentUser = async (): Promise<TUser | null> => {
  try {
    const { data } = await server.get<TAuthMeResult>('/auth/me')

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

    if (!user.onboardingCompletedAt) {
      throw redirect({ to: '/onboarding' })
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

    if (user?.onboardingCompletedAt) {
      throw redirect({ to: '/payments' })
    }
  },
  component: LoginPage,
})

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  beforeLoad: async () => {
    const user = await fetchCurrentUser()

    if (!user) {
      throw redirect({ to: '/login' })
    }

    if (user.onboardingCompletedAt) {
      throw redirect({ to: '/payments' })
    }
  },
  component: OnboardingPage,
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
  onboardingRoute,
  catchAllRoute,
])

export const router = createRouter({
  routeTree,
  basepath: BASE_PATH,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
