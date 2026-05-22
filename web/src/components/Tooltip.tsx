import { type ReactNode } from 'react'

import * as RadixTooltip from '@radix-ui/react-tooltip'

import { StyleHelper } from '../helpers/StyleHelper'

type TProps = {
  content: string
  className?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}

export const Tooltip = ({ content, className, open, onOpenChange, children }: TProps) => (
  <RadixTooltip.Root open={open} onOpenChange={onOpenChange}>
    <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>

    <RadixTooltip.Portal>
      <RadixTooltip.Content
        sideOffset={6}
        className={StyleHelper.merge(
          'z-50 rounded-lg w-fit text-center wrap-break-word bg-neutral-900 px-2.5 py-1.5 text-xs text-white shadow-md border border-neutral-700 animate-in fade-in-0 zoom-in-95',
          className
        )}
      >
        <span className="block">{content}</span>
        <RadixTooltip.Arrow className="fill-neutral-900" />
      </RadixTooltip.Content>
    </RadixTooltip.Portal>
  </RadixTooltip.Root>
)
