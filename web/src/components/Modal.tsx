import { type ReactNode } from 'react'

import * as Dialog from '@radix-ui/react-dialog'

import { StyleHelper } from '../helpers/StyleHelper'
import { Button } from './Button'

import CloseIcon from '../assets/icons/close-icon.svg?react'

type TProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  className?: string
  closeLabel?: string
  children: ReactNode
}

export const Modal = ({
  open,
  onOpenChange,
  title,
  description,
  className,
  closeLabel,
  children,
}: TProps) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />

      <Dialog.Content
        className={StyleHelper.merge(
          'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
          'w-[min(94vw,640px)] max-h-[92vh] overflow-y-auto',
          'rounded-2xl border border-neutral-200 bg-white text-neutral-900 shadow-lg',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'p-6 space-y-4',
          className
        )}
      >
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Dialog.Title className="text-lg font-semibold text-white">{title}</Dialog.Title>
            {description && (
              <Dialog.Description className="text-sm text-gray-400">
                {description}
              </Dialog.Description>
            )}
          </div>

          <Dialog.Close asChild>
            <Button aria-label={closeLabel || 'Close'} variant="ghost">
              <CloseIcon className="size-5" aria-hidden="true" />
            </Button>
          </Dialog.Close>
        </header>

        <div>{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
)
