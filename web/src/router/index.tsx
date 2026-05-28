import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'

import { RootLayout } from '../components/RootLayout'
import { userQueryOptions } from '../hooks/use-user-query'
import { BASE_PATH } from '../constants'
import { ChatPage } from '../pages/ChatPage'
import { DestinationsPage } from '../pages/DestinationsPage'
import { LoginPage } from '../pages/LoginPage'
import { OnboardingPage } from '../pages/OnboardingPage'
import { PaymentPage } from '../pages/PaymentPage'
import { PaymentsPage } from '../pages/PaymentsPage'
import { ProfilePage } from '../pages/ProfilePage'
import { queryClient } from '../services/query-client'

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'auth',
  component: RootLayout,
  beforeLoad: async () => {
    const user = await queryClient.ensureQueryData(userQueryOptions)

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
    throw redirect({ to: '/chat' })
  },
})

const chatRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/chat',
  component: ChatPage,
})

const chatConversationRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/chat/$conversationId',
  component: ChatPage,
})

const paymentsRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/payments',
  component: PaymentsPage,
})

const destinationsRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/destinations',
  component: DestinationsPage,
})

const profileRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/profile',
  component: ProfilePage,
})

const paymentRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/payments/$orderId',
  component: PaymentPage,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: async () => {
    const user = await queryClient.ensureQueryData(userQueryOptions)

    if (user?.onboardingCompletedAt) {
      throw redirect({ to: '/chat' })
    }
  },
  component: LoginPage,
})

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  beforeLoad: async () => {
    const user = await queryClient.ensureQueryData(userQueryOptions)

    if (!user) {
      throw redirect({ to: '/login' })
    }

    if (user.onboardingCompletedAt) {
      throw redirect({ to: '/chat' })
    }
  },
  component: OnboardingPage,
})

const catchAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$',
  beforeLoad: () => {
    throw redirect({ to: '/chat' })
  },
})

const routeTree = rootRoute.addChildren([
  authRoute.addChildren([
    indexRoute,
    chatRoute,
    chatConversationRoute,
    paymentsRoute,
    destinationsRoute,
    profileRoute,
    paymentRoute,
  ]),
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
