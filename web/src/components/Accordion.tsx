import { type ReactNode } from 'react'

import * as RadixAccordion from '@radix-ui/react-accordion'

import { StyleHelper } from '../helpers/StyleHelper'

import ChevronDownIcon from '../assets/icons/chevron-down-icon.svg?react'

type TProps = {
  value: string
  trigger: ReactNode
  className?: string
  defaultOpen?: boolean
  children: ReactNode
}

export const Accordion = ({ value, trigger, className, defaultOpen, children }: TProps) => (
  <RadixAccordion.Root
    type="single"
    collapsible
    defaultValue={defaultOpen ? value : undefined}
    className={StyleHelper.merge('rounded-xl border border-white/10 bg-white/5', className)}
  >
    <RadixAccordion.Item value={value} className="overflow-hidden">
      <RadixAccordion.Header className="flex">
        <RadixAccordion.Trigger className="group flex flex-1 items-center justify-between gap-2 px-4 py-3 text-left text-sm text-white outline-none transition-colors hover:bg-white/5 focus:bg-white/5">
          <span className="flex items-center gap-2">{trigger}</span>

          <ChevronDownIcon
            className="size-4 text-gray-400 transition-transform group-data-[state=open]:rotate-180"
            aria-hidden="true"
          />
        </RadixAccordion.Trigger>
      </RadixAccordion.Header>

      <RadixAccordion.Content className="overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0">
        <div className="px-4 py-3 border-t border-white/10 text-sm text-gray-300">{children}</div>
      </RadixAccordion.Content>
    </RadixAccordion.Item>
  </RadixAccordion.Root>
)
