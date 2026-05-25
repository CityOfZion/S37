import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import * as Dialog from '@radix-ui/react-dialog'

import { StyleHelper } from '../helpers/StyleHelper'
import { Button } from './Button'
import { Tooltip } from './Tooltip'

import CloseIcon from '../assets/icons/close-icon.svg?react'

type TProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  className?: string
  closeLabel?: string
  preventClose?: boolean
  children: ReactNode
}

export const Modal = ({
  open,
  onOpenChange,
  title,
  description,
  className,
  closeLabel,
  preventClose,
  children,
}: TProps) => {
  const { t } = useTranslation('common', { keyPrefix: 'actions' })
  const resolvedCloseLabel = closeLabel ?? t('close')

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />

        <Dialog.Content
          onInteractOutside={preventClose ? event => event.preventDefault() : undefined}
          onEscapeKeyDown={preventClose ? event => event.preventDefault() : undefined}
          className={StyleHelper.merge(
            'modal-content fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-[min(94vw,640px)] max-h-[92vh] overflow-y-auto',
            'rounded-2xl border border-neutral-200 bg-white text-neutral-900 shadow-lg',
            'p-6 space-y-4',
            className
          )}
        >
          <header className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Dialog.Title className="text-lg font-semibold text-neutral-900">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="text-sm text-neutral-500">
                  {description}
                </Dialog.Description>
              )}
            </div>

            <Tooltip content={resolvedCloseLabel}>
              <Dialog.Close asChild>
                <Button aria-label={resolvedCloseLabel} variant="ghost">
                  <CloseIcon className="size-5" aria-hidden="true" />
                </Button>
              </Dialog.Close>
            </Tooltip>
          </header>

          <div>{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
