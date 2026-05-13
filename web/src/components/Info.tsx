import { cloneElement, JSX, MouseEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { StyleHelper } from '../helpers/StyleHelper'
import { Tooltip } from './Tooltip'

type TProps = {
  content: string
  icon: JSX.Element
}

export const Info = ({ content, icon }: TProps) => {
  const { t } = useTranslation('components', { keyPrefix: 'info' })

  const [open, setOpen] = useState(false)

  return (
    <Tooltip content={content} open={open} onOpenChange={setOpen}>
      <span
        tabIndex={0}
        aria-label={t('label')}
        className="text-gray-500 hover:text-gray-300 focus:text-gray-300 transition-colors cursor-default"
        onClick={(event: MouseEvent) => {
          event.preventDefault()
          event.stopPropagation()

          setOpen(true)
        }}
      >
        {cloneElement(icon, { className: StyleHelper.merge('size-3.5', icon.props.className) })}
      </span>
    </Tooltip>
  )
}
