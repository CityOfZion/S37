import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ClipboardHelper } from '../helpers/ClipboardHelper'
import { StyleHelper } from '../helpers/StyleHelper'
import { Button } from './Button'
import { Tooltip } from './Tooltip'

import ClipboardIcon from '../assets/icons/clipboard-icon.svg?react'

type TProps = {
  value: string
  className?: string
}

export const CopyButton = ({ value, className }: TProps) => {
  const { t } = useTranslation('common')
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    void ClipboardHelper.copy(value, {
      onSuccess: () => setCopied(true),
      onAfterSuccess: () => setCopied(false),
    })
  }

  return (
    <Tooltip
      open={copied ? true : undefined}
      content={copied ? t('actions.copied') : t('actions.copy')}
    >
      <Button
        aria-label={t('actions.copy')}
        variant="ghost"
        size="xs"
        className={StyleHelper.merge(
          'p-1 text-neutral-400 hover:text-neutral-700 focus:text-neutral-700 active:text-neutral-800',
          className
        )}
        onClick={handleCopy}
      >
        <ClipboardIcon className="size-3.5" aria-hidden="true" />
      </Button>
    </Tooltip>
  )
}
