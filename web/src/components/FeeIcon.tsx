import { useState } from 'react'

import { StyleHelper } from '../helpers/StyleHelper'
import { Tooltip } from './Tooltip'

import InfoIcon from '../assets/icons/info-icon.svg?react'

type TProps = {
  label: string
  className?: string
}

export const FeeIcon = ({ label, className }: TProps) => {
  const [open, setOpen] = useState(false)

  const handleOpen = () => {
    setOpen(previous => !previous)
  }

  return (
    <Tooltip content={label} open={open} onOpenChange={setOpen}>
      <span
        tabIndex={0}
        className="inline-flex cursor-pointer rounded"
        aria-label={label}
        onClick={handleOpen}
        onKeyDown={event => event.key === 'Enter' && handleOpen()}
      >
        <InfoIcon
          className={StyleHelper.merge('size-3 text-neutral-400', className)}
          aria-hidden="true"
        />
      </span>
    </Tooltip>
  )
}
