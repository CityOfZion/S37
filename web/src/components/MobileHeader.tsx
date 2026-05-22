import { useTranslation } from 'react-i18next'

import logoUrl from '../assets/logos/logo.svg'
import { APP_NAME } from '../constants'
import { useSidebarStore } from '../hooks/use-sidebar-store'
import { Button } from './Button'
import { Tooltip } from './Tooltip'

import MenuIcon from '../assets/icons/menu-icon.svg?react'

export const MobileHeader = () => {
  const { t } = useTranslation('components', { keyPrefix: 'sidebar' })
  const { setMobileOpen } = useSidebarStore()

  return (
    <header className="lg:hidden sticky top-0 z-30 h-14 bg-white border-b border-neutral-200 flex items-center px-3 gap-3">
      <Tooltip content={t('openMenu')}>
        <Button
          variant="ghost"
          onClick={() => setMobileOpen(true)}
          className="p-2 text-neutral-700 hover:text-neutral-900"
          aria-label={t('openMenu')}
        >
          <MenuIcon className="size-5" aria-hidden="true" />
        </Button>
      </Tooltip>

      <div className="flex items-center gap-2">
        <img src={logoUrl} alt={APP_NAME} className="size-6 shrink-0" />
        <span className="font-extrabold text-neutral-900 text-sm tracking-tight">{APP_NAME}</span>
      </div>
    </header>
  )
}
