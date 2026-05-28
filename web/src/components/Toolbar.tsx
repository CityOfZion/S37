import { useTranslation } from 'react-i18next'

import { useBreadcrumbStore } from '../hooks/use-breadcrumb-store'
import { useSidebarStore } from '../hooks/use-sidebar-store'
import { Breadcrumb } from './Breadcrumb'
import { Button } from './Button'
import { Tooltip } from './Tooltip'

import MenuIcon from '../assets/icons/menu-icon.svg?react'

export const Toolbar = () => {
  const { t } = useTranslation('components', { keyPrefix: 'sidebar' })
  const { setMobileOpen } = useSidebarStore()
  const { items } = useBreadcrumbStore()

  return (
    <header className="fixed top-0 left-0 right-0 lg:left-60 z-30 h-14 bg-white border-b border-neutral-200 flex items-center px-3 gap-3 min-w-0">
      <Tooltip content={t('openMenu')}>
        <Button
          variant="ghost"
          onClick={() => setMobileOpen(true)}
          className="lg:hidden shrink-0 p-2 text-neutral-700 hover:text-neutral-900"
          aria-label={t('openMenu')}
        >
          <MenuIcon className="size-5" aria-hidden="true" />
        </Button>
      </Tooltip>

      <div className="min-w-0 flex-1">
        <Breadcrumb items={items} />
      </div>
    </header>
  )
}
