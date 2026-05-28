import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'

import { RootLayout } from '../components/RootLayout'
import { userQueryOptions } from '../hooks/use-user-query'
import { ChatPage } from '../pages/ChatPage'
import { DestinationsPage } from '../pages/DestinationsPage'
import { LoginPage } from '../pages/LoginPage'
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

    if (user) {
      throw redirect({ to: '/chat' })
    }
  },
  component: LoginPage,
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
