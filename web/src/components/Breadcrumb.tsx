import { useTranslation } from 'react-i18next'

import { Link } from '@tanstack/react-router'

import type { TBreadcrumbItem } from '../hooks/use-breadcrumb-store'

type TProps = {
  items: TBreadcrumbItem[]
}

export const Breadcrumb = ({ items }: TProps) => {
  const { t } = useTranslation('common')

  return (
    <nav aria-label={t('actions.breadcrumb')}>
      <ol className="flex items-center gap-1.5 text-sm md:text-base min-w-0">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1.5 min-w-0">
            {index > 0 && (
              <span aria-hidden="true" className="text-neutral-300 select-none shrink-0">
                /
              </span>
            )}
            {item.to ? (
              <Link
                to={item.to as never}
                className="font-semibold text-neutral-400 hover:text-neutral-700 transition-colors truncate"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-semibold text-neutral-900 truncate" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
