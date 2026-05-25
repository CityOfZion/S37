import { forwardRef, type InputHTMLAttributes, type ReactNode, useId } from 'react'
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
  error?: string | boolean
  pasteClassName?: string
  onPaste?: (value: string) => void
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'onPaste'>

export const Input = forwardRef<HTMLInputElement, TProps>(
  ({ label, hint, error, className, id, disabled, pasteClassName, onPaste, ...props }, ref) => {
    const { t } = useTranslation('components', { keyPrefix: 'input' })
    const generatedId = useId()

    const inputId = id || generatedId
    const hasError = !!error
    const isErrorString = hasError && typeof error === 'string'

    const handlePaste = async () => {
      if (disabled) return

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
            ref={ref}
            id={inputId}
            className={StyleHelper.merge(
              'w-full rounded-xl border bg-white px-4 py-3 text-neutral-900 transition-colors min-h-[44px]',
              'placeholder:text-neutral-400',
              'focus:border-primary focus:ring-2 focus:ring-primary/20',
              'disabled:opacity-50',
              {
                'border-danger-500': hasError,
                'border-neutral-200': !hasError,
                'pr-12': !!onPaste,
              },
              className
            )}
            disabled={disabled}
            {...props}
          />

          {onPaste && (
            <Tooltip content={t('paste')}>
              <Button
                aria-label={t('paste')}
                variant="ghost"
                disabled={disabled}
                className={StyleHelper.merge(
                  'absolute right-4 top-1/2 -translate-y-1/2',
                  pasteClassName
                )}
                onClick={handlePaste}
              >
                <ClipboardIcon className="size-4" aria-hidden="true" />
              </Button>
            </Tooltip>
          )}
        </div>

        {hint && !isErrorString && <Field.Hint>{hint}</Field.Hint>}

        {isErrorString && <Field.Error>{error}</Field.Error>}
      </Field>
    )
  }
)

Input.displayName = 'Input'
