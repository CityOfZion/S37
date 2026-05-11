import { type InputHTMLAttributes, useId } from 'react'

import { StyleHelper } from '../helpers/StyleHelper'
import { Field } from './Field'

type TProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
  error?: string
}

export const Input = ({ label, hint, error, className, id, ...props }: TProps) => {
  const generatedId = useId()
  const inputId = id || generatedId

  return (
    <Field>
      {label && (
        <Field.Label htmlFor={inputId} required={props.required}>
          {label}
        </Field.Label>
      )}

      <input
        id={inputId}
        className={StyleHelper.merge(
          'w-full rounded-xl border bg-white/5 px-4 py-3 text-white outline-none transition-colors',
          'placeholder:text-gray-500',
          'focus:border-primary focus:ring-2 focus:ring-primary/20',
          'disabled:opacity-50',
          { 'border-red-400': !!error, 'border-white/10': !error },
          className
        )}
        {...props}
      />

      {hint && !error && <Field.Hint>{hint}</Field.Hint>}

      {error && <Field.Error>{error}</Field.Error>}
    </Field>
  )
}
