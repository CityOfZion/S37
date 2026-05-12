import { type ReactNode } from 'react'

import * as RadixTooltip from '@radix-ui/react-tooltip'

type TProps = {
  content: string
  children: ReactNode
}

export const Tooltip = ({ content, children }: TProps) => (
  <RadixTooltip.Root>
    <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>

    <RadixTooltip.Portal>
      <RadixTooltip.Content
        sideOffset={6}
        className="z-50 rounded-lg max-w-48 text-center break-all bg-gray-800 px-2.5 py-1.5 text-xs text-white shadow-lg border border-white/10 animate-in fade-in-0 zoom-in-95"
      >
        <span className="block">{content}</span>
        <RadixTooltip.Arrow className="fill-gray-800" />
      </RadixTooltip.Content>
    </RadixTooltip.Portal>
  </RadixTooltip.Root>
)
