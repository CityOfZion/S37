import { type ButtonHTMLAttributes, forwardRef } from 'react'

import { StyleHelper } from '../helpers/StyleHelper'

type TButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'tertiary'
  | 'success'
  | 'danger'
  | 'ghost'
type TButtonSize = 'xs' | 'sm' | 'md' | 'lg'

type TProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: TButtonVariant
  size?: TButtonSize
}

const VARIANT_CLASSES: Record<TButtonVariant, string> = {
  primary:
    'bg-primary hover:bg-primary-600 active:bg-primary-700 focus-visible:ring-2 focus-visible:ring-primary/50 text-white shadow-brand font-semibold rounded-xl transition-colors',
  secondary:
    'bg-white border border-primary-200 text-primary hover:bg-brand-50 active:bg-brand-100 focus-visible:ring-2 focus-visible:ring-primary/30 font-semibold rounded-xl transition-colors',
  outline:
    'bg-white border border-neutral-200 text-neutral-700 hover:text-neutral-900 hover:border-neutral-300 hover:bg-neutral-50 active:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-neutral-300 font-medium rounded-xl transition-colors',
  tertiary:
    'bg-transparent text-primary hover:text-primary-600 active:opacity-70 focus-visible:ring-2 focus-visible:ring-primary/30 font-medium rounded-xl transition-colors',
  success:
    'bg-accent-500 hover:bg-accent-600 active:bg-accent-700 focus-visible:ring-2 focus-visible:ring-accent-500/50 text-white font-semibold rounded-xl transition-colors',
  danger:
    'bg-danger-500 hover:bg-red-600 active:bg-red-700 focus-visible:ring-2 focus-visible:ring-danger-500/50 text-white font-semibold rounded-xl transition-colors',
  ghost:
    'bg-transparent text-neutral-700 hover:text-primary hover:bg-brand-50 active:bg-brand-100 focus-visible:ring-2 focus-visible:ring-primary/30 rounded-xl transition-colors',
}

const SIZE_CLASSES: Record<TButtonSize, string> = {
  xs: 'text-xs px-3 py-1.5 min-h-8',
  sm: 'text-sm px-5 py-2 min-h-[44px]',
  md: 'text-sm px-6 py-3 min-h-[44px]',
  lg: 'text-base px-8 py-3.5 min-h-[52px]',
}

export const Button = forwardRef<HTMLButtonElement, TProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => {
    const isGhostOrTertiary = variant === 'ghost' || variant === 'tertiary'

    return (
      <button
        ref={ref}
        className={StyleHelper.merge(
          'inline-flex items-center justify-center gap-2',
          'disabled:opacity-40 disabled:select-none disabled:pointer-events-none disabled:shadow-none',
          VARIANT_CLASSES[variant],
          !isGhostOrTertiary && SIZE_CLASSES[size],
          className
        )}
        type="button"
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
