import { type ComponentType, type SVGProps, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Link, useRouter } from '@tanstack/react-router'

import type { TLanguage } from 'fractapay-shared'

import { APP_NAME } from '../constants'
import { StyleHelper } from '../helpers/StyleHelper'
import { useChatStore } from '../hooks/use-chat-store'
import { useEtherfuseStore } from '../hooks/use-etherfuse-store'
import { useLanguageStore } from '../hooks/use-language-store'
import { usePaymentsStore } from '../hooks/use-payments-store'

import ChatIcon from '../assets/icons/chat-icon.svg?react'
import CloseIcon from '../assets/icons/close-icon.svg?react'
import DestinationsIcon from '../assets/icons/destinations-icon.svg?react'
import LogoutIcon from '../assets/icons/logout-icon.svg?react'
import MenuIcon from '../assets/icons/menu-icon.svg?react'
import Logo from '../assets/logos/logo.svg?react'

type TNavItem = {
  path: string
  labelKey: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}

const NAV_ITEMS: TNavItem[] = [
  { path: '/', labelKey: 'chat', Icon: ChatIcon },
  { path: '/destinations', labelKey: 'destinations', Icon: DestinationsIcon },
]

export const Sidebar = () => {
  const { t } = useTranslation('components', { keyPrefix: 'sidebar' })
  const router = useRouter()
  const { language, setLanguage } = useLanguageStore()
  const { reset: resetChat } = useChatStore()
  const { reset: resetEtherfuse } = useEtherfuseStore()
  const { setPayments, setAddress, setPrice } = usePaymentsStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  const currentPath = router.state.location.pathname

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/' || currentPath === ''

    return currentPath.startsWith(path)
  }

  const toggleLanguage = () => {
    const next: TLanguage = language === 'en-US' ? 'pt-BR' : 'en-US'

    setLanguage(next)
  }

  const handleLogout = () => {
    resetChat()
    resetEtherfuse()
    setPayments([])
    setAddress('')
    setPrice('0')
    setMobileOpen(false)
  }

  const navContent = (
    <nav className="flex flex-col h-full" aria-label={t('label')}>
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <Logo aria-hidden="true" className="size-8 shrink-0" />
        <span className="font-extrabold text-white text-base tracking-tight truncate">
          {APP_NAME}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <p className="text-[10px] font-bold tracking-widest uppercase text-neutral-500 px-3 mb-2">
          MENU PRINCIPAL
        </p>
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(item => (
            <li key={item.path}>
              <Link
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={StyleHelper.merge(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full',
                  isActive(item.path)
                    ? 'bg-primary text-white'
                    : 'text-brand-200 hover:text-white hover:bg-white/5'
                )}
                aria-current={isActive(item.path) ? 'page' : undefined}
              >
                <item.Icon className="size-5 shrink-0" aria-hidden="true" />
                <span>{t(item.labelKey as 'chat' | 'destinations')}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="px-2 py-4 border-t border-white/10 space-y-0.5">
        <button
          type="button"
          onClick={toggleLanguage}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-400 hover:text-white hover:bg-white/5 transition-colors w-full"
          aria-label={t('switchLanguage')}
        >
          <span
            className="size-5 flex items-center justify-center text-base shrink-0"
            aria-hidden="true"
          >
            {language === 'en-US' ? '🇺🇸' : '🇧🇷'}
          </span>
          <span>{language === 'en-US' ? 'English' : 'Português'}</span>
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-400 hover:text-red-400 hover:bg-red-400/5 transition-colors w-full"
        >
          <LogoutIcon className="size-5 shrink-0" aria-hidden="true" />
          <span>{t('logout')}</span>
        </button>
      </div>
    </nav>
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-neutral-900 border border-white/10 text-neutral-400 hover:text-white transition-colors"
        aria-label={t('openMenu')}
        aria-expanded={mobileOpen}
      >
        <MenuIcon className="size-5" aria-hidden="true" />
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-neutral-900/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={StyleHelper.merge(
          'lg:hidden fixed top-0 left-0 z-50 h-full w-64 bg-neutral-900 border-r border-white/10 transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label={t('label')}
      >
        <div className="absolute top-4 right-4">
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white transition-colors"
            aria-label={t('closeMenu')}
          >
            <CloseIcon className="size-5" aria-hidden="true" />
          </button>
        </div>
        {navContent}
      </aside>

      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-neutral-900 border-r border-white/10 h-screen sticky top-0">
        {navContent}
      </aside>
    </>
  )
}
