import { ReactNode } from 'react'

import { StyleHelper } from '../helpers/StyleHelper'
import { Tooltip } from './Tooltip'

import ExternalLinkIcon from '../assets/icons/external-link-icon.svg?react'

type TProps = {
  href: string
  label: string
  className?: string
  children: ReactNode
}

export const ExternalLink = ({ href, label, className, children }: TProps) => (
  <Tooltip content={label}>
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={StyleHelper.merge(
        'font-mono transition-colors underline text-xs wrap-break-word flex flex-row gap-1 items-center text-primary hover:text-primary/80 focus:text-primary/80 active:text-primary/60',
        className
      )}
    >
      {children}
      <ExternalLinkIcon className="size-3.5 min-size-3.5 max-size-3.5" aria-hidden="true" />
    </a>
  </Tooltip>
)
