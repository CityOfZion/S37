import { type HTMLAttributes, type LabelHTMLAttributes, type ReactNode } from 'react'

import { StyleHelper } from '../helpers/StyleHelper'

type TProps = HTMLAttributes<HTMLDivElement>

type TLabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  required?: boolean
  children: ReactNode
}

type TSubProps = HTMLAttributes<HTMLParagraphElement>

export const Field = ({ className, children, ...props }: TProps) => (
  <div className={StyleHelper.merge('flex flex-col gap-1.5', className)} {...props}>
    {children}
  </div>
)

Field.Label = ({ required, className, children, ...props }: TLabelProps) => (
  <label
    className={StyleHelper.merge(
      'text-sm font-semibold text-neutral-700 flex items-center gap-1',
      { "after:content-['*'] after:-ml-0.5 after:text-danger-500": !!required },
      className
    )}
    {...props}
  >
    {children}
  </label>
)

Field.Hint = ({ className, children, ...props }: TSubProps) => (
  <p className={StyleHelper.merge('text-xs text-neutral-400', className)} {...props}>
    {children}
  </p>
)

Field.Error = ({ className, children, ...props }: TSubProps) => (
  <p className={StyleHelper.merge('text-xs text-danger-500', className)} {...props}>
    {children}
  </p>
)
