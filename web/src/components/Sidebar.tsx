import { type ComponentType, type SVGProps, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useNavigate, useParams, useRouterState } from '@tanstack/react-router'

import type { TLanguage, TUser } from 'fractapay-shared'
import { DEFAULT_LANGUAGE } from 'fractapay-shared'

import logoUrl from '../assets/logos/logo.svg'
import { APP_NAME, LANGUAGE_NAMES } from '../constants'
import { StyleHelper } from '../helpers/StyleHelper'
import { useChatStore } from '../hooks/use-chat-store'
import { useLanguageStore } from '../hooks/use-language-store'
import { useLogoutMutation } from '../hooks/use-logout-mutation'
import { useSidebarStore } from '../hooks/use-sidebar-store'
import { useUserQuery } from '../hooks/use-user-query'
import { ConversationWarningModal } from '../modals/ConversationWarningModal'
import { Button } from './Button'
import { NavLink } from './NavLink'
import { Tooltip } from './Tooltip'
import { UserAvatar } from './UserAvatar'

import BrazilFlagIcon from '../assets/icons/brazil-flag-icon.svg?react'
import ChatIcon from '../assets/icons/chat-icon.svg?react'
import CloseIcon from '../assets/icons/close-icon.svg?react'
import DestinationsIcon from '../assets/icons/destinations-icon.svg?react'
import LogoutIcon from '../assets/icons/logout-icon.svg?react'
import PaymentsIcon from '../assets/icons/payments-icon.svg?react'
import UsaFlagIcon from '../assets/icons/usa-flag-icon.svg?react'
import UserIcon from '../assets/icons/user-icon.svg?react'

type TNavItem = {
  path: string
  labelKey: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}

const BOTTOM_BUTTON_CLASS =
  'flex items-center gap-3 px-3 py-2.5 w-full justify-start text-sm font-medium'

const NAV_ITEMS: TNavItem[] = [
  { path: '/chat', labelKey: 'chat', Icon: ChatIcon },
  { path: '/payments', labelKey: 'payments', Icon: PaymentsIcon },
  { path: '/destinations', labelKey: 'destinations', Icon: DestinationsIcon },
]

type TNavContentProps = {
  onClose: () => void
  isActive: (path: string) => boolean
  toggleLanguage: () => void
  handleLogout: () => void
  user: TUser | null | undefined
  isLoggingOut: boolean
}

const NavContent = ({
  onClose,
  isActive,
  toggleLanguage,
  handleLogout,
  user,
  isLoggingOut,
}: TNavContentProps) => {
  const { t } = useTranslation('components', { keyPrefix: 'sidebar' })
  const { language } = useLanguageStore()

  return (
    <nav className="flex flex-col h-full" aria-label={t('label')}>
      <div className="flex items-center gap-2 px-4 py-5 border-b border-white/10">
        <img src={logoUrl} alt={APP_NAME} className="size-8 shrink-0" />
        <span className="font-extrabold text-white text-xl tracking-tight truncate select-none">
          {APP_NAME}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-neutral-500 px-3 mb-2 select-none">
            {t('menuSection')}
          </p>
          <ul className="space-y-1">
            {NAV_ITEMS.map(item => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={onClose}
                  className={StyleHelper.merge(
                    'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors w-full font-bold',
                    isActive(item.path)
                      ? 'bg-white/10 text-white'
                      : 'text-brand-200 hover:text-white hover:bg-white/5'
                  )}
                  aria-current={isActive(item.path) ? 'page' : undefined}
                >
                  <item.Icon
                    className={StyleHelper.merge(
                      'size-5 shrink-0 transition-colors',
                      isActive(item.path) ? 'text-white' : 'text-neutral-400 group-hover:text-white'
                    )}
                    aria-hidden="true"
                  />
                  <span>{t(item.labelKey as 'chat' | 'payments' | 'destinations')}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="px-2 py-4 border-t border-white/10 space-y-1">
        {user && (
          <NavLink
            to="/profile"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-white/5 transition-colors group"
          >
            <UserAvatar name={user.name ?? user.email} picture={user.picture} />
            <div className="min-w-0 flex-1">
              <p className="text-white font-bold truncate text-sm">{user.name ?? user.email}</p>
              <p className="text-neutral-500 text-xs truncate select-none">{t('viewProfile')}</p>
            </div>
            <UserIcon
              className="size-5 shrink-0 text-neutral-500 group-hover:text-white transition-colors"
              aria-hidden="true"
            />
          </NavLink>
        )}

        <Button
          variant="ghost"
          onClick={toggleLanguage}
          className={StyleHelper.merge(
            BOTTOM_BUTTON_CLASS,
            'text-neutral-400 hover:text-white hover:bg-white/5 active:bg-white/10'
          )}
          aria-label={t('switchLanguage')}
        >
          {language === DEFAULT_LANGUAGE ? (
            <UsaFlagIcon className="size-5 shrink-0 rounded-sm" aria-hidden="true" />
          ) : (
            <BrazilFlagIcon className="size-5 shrink-0 rounded-sm" aria-hidden="true" />
          )}
          <span>{LANGUAGE_NAMES[language]}</span>
        </Button>

        <Button
          variant="ghost"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={StyleHelper.merge(
            BOTTOM_BUTTON_CLASS,
            'text-neutral-400 hover:text-red-400 hover:bg-red-400/5 active:bg-red-400/10'
          )}
          aria-label={t('logout')}
        >
          <LogoutIcon className="size-5 shrink-0" aria-hidden="true" />
          <span>{t('logout')}</span>
        </Button>
      </div>
    </nav>
  )
}

export const Sidebar = () => {
  const { t } = useTranslation('components', { keyPrefix: 'sidebar' })
  const navigate = useNavigate()
  const currentPath = useRouterState({ select: state => state.location.pathname })
  const { language, setLanguage } = useLanguageStore()
  const { mobileOpen, setMobileOpen } = useSidebarStore()
  const { data: user } = useUserQuery()
  const logoutMutation = useLogoutMutation()
  const { conversationId } = useParams({ strict: false })
  const hasUserMessages = useChatStore(state => state.messages.some(message => message.role === 'user'))
  const [logoutWarningOpen, setLogoutWarningOpen] = useState(false)

  const asideRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const aside = asideRef.current
    if (!aside) return

    const update = () => {
      const isDesktop = window.matchMedia('(min-width: 1024px)').matches

      if (!isDesktop && !mobileOpen) {
        aside.setAttribute('inert', '')
      } else {
        aside.removeAttribute('inert')
      }
    }

    update()

    const media = window.matchMedia('(min-width: 1024px)')

    media.addEventListener('change', update)

    return () => media.removeEventListener('change', update)
  }, [mobileOpen])

  useEffect(() => {
    if (!mobileOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }

    document.addEventListener('keydown', handleEscape)

    return () => document.removeEventListener('keydown', handleEscape)
  }, [mobileOpen, setMobileOpen])

  const isActive = (path: string) => currentPath.startsWith(path)

  const toggleLanguage = () => {
    const next: TLanguage = language === 'en-US' ? 'pt-BR' : 'en-US'

    setLanguage(next)
  }

  const doLogout = async () => {
    setMobileOpen(false)

    try {
      await logoutMutation.mutateAsync()
    } finally {
      void navigate({ to: '/login' })
    }
  }

  const handleLogout = () => {
    if (!conversationId && hasUserMessages) {
      setLogoutWarningOpen(true)

      return
    }

    void doLogout()
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-neutral-900/60 backdrop-blur-xs"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        ref={asideRef}
        className={StyleHelper.merge(
          'fixed top-0 left-0 z-50 h-full w-60 bg-neutral-900 border-r border-white/20 transition-transform duration-300',
          'lg:sticky lg:top-0 lg:h-screen lg:z-auto lg:translate-x-0 lg:shrink-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        data-nav-sidebar
        aria-label={t('label')}
      >
        <div className="absolute top-4 right-4 lg:hidden">
          <Tooltip content={t('closeMenu')}>
            <Button
              variant="ghost"
              onClick={() => setMobileOpen(false)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white"
              aria-label={t('closeMenu')}
            >
              <CloseIcon className="size-5" aria-hidden="true" />
            </Button>
          </Tooltip>
        </div>
        <NavContent
          onClose={() => setMobileOpen(false)}
          isActive={isActive}
          toggleLanguage={toggleLanguage}
          handleLogout={handleLogout}
          user={user}
          isLoggingOut={logoutMutation.isPending}
        />
      </aside>

      <ConversationWarningModal
        open={logoutWarningOpen}
        variant="logout"
        onOpenChange={open => !open && setLogoutWarningOpen(false)}
        onConfirm={() => {
          setLogoutWarningOpen(false)
          void doLogout()
        }}
      />
    </>
  )
}
