import { type InputHTMLAttributes, type ReactNode, useId } from 'react'
import { useTranslation } from 'react-i18next'

import { ClipboardHelper } from '../helpers/ClipboardHelper'
import { StyleHelper } from '../helpers/StyleHelper'
import { Button } from './Button'
import { Field } from './Field'
import { Tooltip } from './Tooltip'

import ClipboardIcon from '../assets/icons/clipboard-icon.svg?react'

type TProps = {
  label?: ReactNode
  hint?: string
  error?: string
  onPaste?: (value: string) => void
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'onPaste'>

export const Input = ({ label, hint, error, className, id, onPaste, ...props }: TProps) => {
  const { t } = useTranslation('components', { keyPrefix: 'input' })
  const generatedId = useId()
  const inputId = id || generatedId

  const handlePaste = async () => {
    const value = await ClipboardHelper.paste()

    if (value) onPaste?.(value)
  }

  return (
    <Field>
      {label && (
        <Field.Label htmlFor={inputId} required={props.required}>
          {label}
        </Field.Label>
      )}

      <div className="relative">
        <input
          id={inputId}
          className={StyleHelper.merge(
            'w-full rounded-xl border bg-white/5 px-4 py-3 text-white outline-none transition-colors',
            'placeholder:text-gray-500',
            'focus:border-primary focus:ring-2 focus:ring-primary/20',
            'disabled:opacity-50',
            { 'border-red-400': !!error, 'border-white/10': !error, 'pr-12': !!onPaste },
            className
          )}
          {...props}
        />

        {onPaste && (
          <Tooltip content={t('paste')}>
            <Button
              aria-label={t('paste')}
              variant="ghost"
              className="absolute right-4 top-1/2 -translate-y-1/2"
              onClick={handlePaste}
            >
              <ClipboardIcon className="size-4" aria-hidden="true" />
            </Button>
          </Tooltip>
        )}
      </div>

      {hint && !error && <Field.Hint>{hint}</Field.Hint>}

      {error && <Field.Error>{error}</Field.Error>}
    </Field>
  )
}
