import React from 'react'
import ReactDOM from 'react-dom/client'

import { QueryClientProvider } from '@tanstack/react-query'

import { App } from './components/App'
import { exchangeCodeFromQuery } from './helpers/auth-token'
import { USER_QUERY_KEY } from './hooks/use-user-query'
import { queryClient } from './services/query-client'

import './i18next'
import './assets/css/styles.css'

const bootstrap = async () => {
  const tokenStored = await exchangeCodeFromQuery()

  if (tokenStored) {
    queryClient.removeQueries({ queryKey: USER_QUERY_KEY })
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  )
}

bootstrap()
