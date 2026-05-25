import { type ReactNode, useId } from 'react'

import * as RadixSelect from '@radix-ui/react-select'

import { StyleHelper } from '../helpers/StyleHelper'
import { Field } from './Field'

import ChevronDownIcon from '../assets/icons/chevron-down-icon.svg?react'

export type TSelectOption = {
  label: string
  value: string
  icon?: ReactNode
}

type TProps = {
  label?: string
  placeholder?: string
  className?: string
  hint?: string
  required?: boolean
  name?: string
  options: TSelectOption[]
  value?: string
  disabled?: boolean
  onValueChange: (value: string) => void
}

export const Select = ({
  label,
  placeholder,
  className,
  hint,
  required,
  name,
  options,
  value,
  disabled,
  onValueChange,
}: TProps) => {
  const generatedId = useId()

  return (
    <Field>
      {label && (
        <Field.Label htmlFor={generatedId} required={required}>
          {label}
        </Field.Label>
      )}

      <RadixSelect.Root name={name} value={value} disabled={disabled} onValueChange={onValueChange}>
        <RadixSelect.Trigger
          id={generatedId}
          aria-label={label}
          disabled={disabled}
          className={StyleHelper.merge(
            'flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 text-neutral-900 transition-colors min-h-[44px]',
            'placeholder:text-neutral-400',
            'focus:border-primary focus:ring-2 focus:ring-primary/20',
            'data-placeholder:text-neutral-400',
            'disabled:opacity-50',
            className
          )}
        >
          <RadixSelect.Value placeholder={placeholder} />

          <RadixSelect.Icon>
            <ChevronDownIcon className="size-4 text-neutral-400" aria-hidden="true" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            className="z-50 w-(--radix-select-trigger-width) overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-md"
            position="popper"
            sideOffset={4}
          >
            <RadixSelect.Viewport className="p-1">
              {options.map(option => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  className={StyleHelper.merge(
                    'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-neutral-900 transition-colors',
                    'data-highlighted:bg-brand-50 data-highlighted:text-primary',
                    'data-[state=checked]:text-primary'
                  )}
                >
                  {option.icon && (
                    <span className="shrink-0" aria-hidden="true">
                      {option.icon}
                    </span>
                  )}

                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>

      {hint && <Field.Hint>{hint}</Field.Hint>}
    </Field>
  )
}
