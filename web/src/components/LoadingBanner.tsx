import { ReactNode } from 'react'

import { StyleHelper } from '../helpers/StyleHelper'
import { Spinner } from './Spinner'

type TVariant = 'primary' | 'neutral'

type TProps = {
  variant?: TVariant
  children: ReactNode
}

export const LoadingBanner = ({ variant = 'primary', children }: TProps) => (
  <div
    className={StyleHelper.merge('border flex items-center gap-2 px-4 py-3 rounded-xl text-sm', {
      'border-primary-200 bg-primary-50 text-primary-700': variant === 'primary',
      'border-neutral-200 bg-neutral-50 text-neutral-700': variant === 'neutral',
    })}
  >
    <Spinner />
    {children}
  </div>
)
