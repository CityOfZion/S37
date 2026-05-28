import { type ReactNode, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { StyleHelper } from '../helpers/StyleHelper'
import { Button } from './Button'
import { Tooltip } from './Tooltip'

import CloseIcon from '../assets/icons/close-icon.svg?react'

const FOCUSABLE_SELECTORS =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

type TProps = {
  open: boolean
  onClose: () => void
  ariaLabel: string
  side?: 'left' | 'right'
  staticOnDesktop?: boolean
  panelClassName?: string
  header: ReactNode
  children: ReactNode
  footer?: ReactNode
}

export const SidebarPanel = ({
  open,
  onClose,
  ariaLabel,
  side = 'right',
  staticOnDesktop = false,
  panelClassName,
  header,
  children,
  footer,
}: TProps) => {
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!staticOnDesktop) return
    const aside = panelRef.current
    if (!aside) return

    const update = () => {
      const isDesktop = window.matchMedia('(min-width: 1024px)').matches
      if (!isDesktop && !open) aside.setAttribute('inert', '')
      else aside.removeAttribute('inert')
    }

    update()
    const media = window.matchMedia('(min-width: 1024px)')
    media.addEventListener('change', update)

    return () => media.removeEventListener('change', update)
  }, [open, staticOnDesktop])

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    const isDesktop = window.matchMedia('(min-width: 1024px)').matches
    const isOverlay = open && (!staticOnDesktop || !isDesktop)

    if (!isOverlay) return

    const siblings = Array.from(panel.parentElement?.children ?? []).filter(
      child => child !== panel && !child.hasAttribute('data-backdrop')
    ) as HTMLElement[]

    const mobileHeader = document.querySelector<HTMLElement>('[data-mobile-header]')
    const navSidebar = document.querySelector<HTMLElement>('[data-nav-sidebar]')

    siblings.forEach(sibling => sibling.setAttribute('inert', ''))
    mobileHeader?.setAttribute('inert', '')
    navSidebar?.setAttribute('inert', '')

    requestAnimationFrame(() => {
      panel.querySelector<HTMLElement>(FOCUSABLE_SELECTORS)?.focus()
    })

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEscape)

    return () => {
      siblings.forEach(sibling => sibling.removeAttribute('inert'))
      mobileHeader?.removeAttribute('inert')
      if (window.matchMedia('(min-width: 1024px)').matches) {
        navSidebar?.removeAttribute('inert')
      }
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, onClose, staticOnDesktop])

  const isLeft = side === 'left'
  const positionClass = isLeft ? 'left-0 border-r' : 'right-0 border-l'
  const closedTranslate = isLeft ? '-translate-x-full' : 'translate-x-full'
  const backdropClass = staticOnDesktop ? 'lg:hidden fixed inset-0 z-30' : 'fixed inset-0 z-40'

  return (
    <>
      {open && (
        <div
          data-backdrop
          className={StyleHelper.merge(backdropClass, 'bg-neutral-900/40 backdrop-blur-[1px]')}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        ref={panelRef}
        className={StyleHelper.merge(
          'fixed top-0 z-50 h-full bg-white border-neutral-200 flex flex-col transition-all duration-300 ease-in-out',
          positionClass,
          staticOnDesktop &&
            'lg:sticky lg:top-0 lg:h-screen lg:z-auto lg:translate-x-0 lg:shrink-0',
          open ? 'translate-x-0 opacity-100' : closedTranslate,
          !staticOnDesktop && !open && 'opacity-0 pointer-events-none',
          panelClassName
        )}
        aria-label={ariaLabel}
        aria-hidden={staticOnDesktop ? undefined : !open}
        {...(!staticOnDesktop && !open ? { inert: '' } : {})}
      >
        {header}
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer}
      </aside>
    </>
  )
}

type TPanelHeaderProps = {
  title: string
  onClose: () => void
  extra?: ReactNode
}

export const SidebarPanelHeader = ({ title, onClose, extra }: TPanelHeaderProps) => {
  const { t } = useTranslation('modals', { keyPrefix: 'panel' })

  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 shrink-0">
      <h2 className="font-bold text-neutral-900">{title}</h2>
      <div className="flex items-center gap-1">
        {extra}
        <Tooltip content={t('close')}>
          <Button
            variant="ghost"
            size="xs"
            className="p-1.5"
            onClick={onClose}
            aria-label={t('close')}
          >
            <CloseIcon className="size-5" aria-hidden="true" />
          </Button>
        </Tooltip>
      </div>
    </div>
  )
}
