import { Provider as TooltipProvider } from '@radix-ui/react-tooltip'
import { RouterProvider } from '@tanstack/react-router'
import { Toaster } from 'sonner'

import { router } from '../router'
import { Footer } from './Footer'
import { Header } from './Header'

export const App = () => (
  <TooltipProvider delayDuration={0} skipDelayDuration={0}>
    <Toaster theme="dark" richColors position="top-right" />

    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Header />

      <div className="flex-1">
        <RouterProvider router={router} />
      </div>

      <Footer />
    </div>
  </TooltipProvider>
)
