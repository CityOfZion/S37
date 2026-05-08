import { type ButtonHTMLAttributes } from 'react'

import { StyleHelper } from '../helpers/StyleHelper'

type TButtonVariant = 'primary' | 'outline' | 'ghost'
type TButtonSize = 'xs' | 'sm' | 'md'

type TButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: TButtonVariant
  size?: TButtonSize
}

const VARIANT_CLASSES: Record<TButtonVariant, string> = {
  primary:
    'bg-primary hover:bg-primary-600 active:bg-primary-700 focus:ring-2 focus:ring-primary/50 text-white shadow-lg shadow-primary/20 font-semibold rounded-xl transition-colors',
  outline:
    'border border-white/10 text-gray-400 hover:text-white hover:border-white/20 active:border-white/30 active:text-white focus:ring-2 focus:ring-white/20 font-medium rounded-lg transition-colors',
  ghost:
    'text-gray-500 hover:text-primary active:text-primary/70 focus:ring-2 focus:ring-primary/30 rounded transition-colors',
}

const SIZE_CLASSES: Record<TButtonSize, string> = {
  xs: 'text-xs px-3 py-1.5',
  sm: 'text-sm px-6 py-2.5',
  md: 'text-base px-6 py-3',
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: TButtonProps) => {
  return (
    <button
      className={StyleHelper.merge(
        'flex items-center justify-center gap-2',
        VARIANT_CLASSES[variant],
        variant !== 'ghost' && SIZE_CLASSES[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
