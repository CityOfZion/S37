import { Provider as TooltipProvider } from '@radix-ui/react-tooltip'
import { RouterProvider } from '@tanstack/react-router'
import { Toaster } from 'sonner'

import { router } from '../router'

export const App = () => (
  <TooltipProvider delayDuration={0} skipDelayDuration={0}>
    <Toaster theme="dark" richColors position="top-right" />
    <RouterProvider router={router} />
  </TooltipProvider>
)
