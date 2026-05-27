import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { zodResolver } from '@hookform/resolvers/zod'
import * as uuid from 'uuid'

import type { TDestination } from 'fractapay-shared'

import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Modal } from '../components/Modal'
import { Select } from '../components/Select'
import { InputHelper } from '../helpers/InputHelper'
import { useDestinationsStore } from '../hooks/use-destinations-store'
import { destinationSchema, type TDestinationFormValues } from '../schemas/destination-schema'

import BrazilFlagIcon from '../assets/icons/brazil-flag-icon.svg?react'

type TProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  destination?: TDestination
  onSave: (destination: TDestination) => void
}

const TOKEN_OPTIONS = [
  {
    value: 'TESOURO',
    label: 'Real',
    icon: <BrazilFlagIcon className="size-5 rounded-sm" aria-hidden="true" />,
  },
]

export const DestinationModal = ({ open, onOpenChange, destination, onSave }: TProps) => {
  const { t } = useTranslation('modals', { keyPrefix: 'destination' })

  const PIX_KEY_TYPE_OPTIONS = [
    { value: 'evp', label: t('pixKeyTypeEvp') },
    { value: 'cpf', label: t('pixKeyTypeCpf') },
    { value: 'cnpj', label: t('pixKeyTypeCnpj') },
    { value: 'email', label: t('pixKeyTypeEmail') },
    { value: 'phone', label: t('pixKeyTypePhone') },
  ]
  const isEditing = !!destination

  const { destinations } = useDestinationsStore()

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isValid },
  } = useForm<TDestinationFormValues>({
    resolver: zodResolver(destinationSchema),
    defaultValues: {
      name: destination?.name ?? '',
      token: destination?.token ?? 'TESOURO',
      pixKey: InputHelper.applyPixKeyMask(
        destination?.pixKey ?? '',
        destination?.pixKeyType ?? 'evp'
      ),
      pixKeyType: destination?.pixKeyType ?? 'evp',
    },
    mode: 'onChange',
  })

  useEffect(() => {
    if (open) {
      const pixKeyType = destination?.pixKeyType ?? 'evp'

      reset({
        name: destination?.name ?? '',
        token: destination?.token ?? 'TESOURO',
        pixKey: InputHelper.applyPixKeyMask(destination?.pixKey ?? '', pixKeyType),
        pixKeyType,
      })
    }
  }, [open, destination, reset])

  const pixKeyType = watch('pixKeyType')

  const onSubmit = (values: TDestinationFormValues) => {
    const currentId = destination?.id
    const name = values.name.trim()
    const nameLowercase = name.toLowerCase()
    const others = destinations.filter(existing => existing.id !== currentId)
    const nameTaken = others.some(existing => existing.name.trim().toLowerCase() === nameLowercase)
    const normalizedPixKey = InputHelper.normalizePixKeyForStorage(values.pixKey, values.pixKeyType)
    const pixKeyTaken = others.some(existing => existing.pixKey === normalizedPixKey)

    if (nameTaken) {
      setError('name', { message: t('nameAlreadyExists') })

      return
    }

    if (pixKeyTaken) {
      setError('pixKey', { message: 'pixKeyAlreadyExists' })

      return
    }

    const saved: TDestination = {
      id: currentId ?? uuid.v4(),
      name,
      token: values.token,
      pixKey: normalizedPixKey,
      pixKeyType: values.pixKeyType,
    }

    onSave(saved)
    onOpenChange(false)
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? t('editTitle') : t('addTitle')}
      description={t('description')}
      closeLabel={t('close')}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              label={t('nameLabel')}
              placeholder={t('namePlaceholder')}
              required
              maxLength={200}
              error={
                errors.name
                  ? errors.name.message
                    ? errors.name.message
                    : t('nameError')
                  : undefined
              }
            />
          )}
        />

        <Controller
          name="token"
          control={control}
          render={({ field }) => (
            <Select
              label={t('coinLabel')}
              required
              options={TOKEN_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />

        <Controller
          name="pixKeyType"
          control={control}
          render={({ field }) => (
            <Select
              label={t('pixKeyTypeLabel')}
              required
              options={PIX_KEY_TYPE_OPTIONS}
              value={field.value}
              onValueChange={value => {
                field.onChange(value)
                setValue('pixKey', '', { shouldValidate: false })
                clearErrors('pixKey')
              }}
            />
          )}
        />

        <Controller
          name="pixKey"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              type={pixKeyType === 'email' ? 'email' : 'text'}
              label={t('pixKeyLabel')}
              placeholder={t('pixKeyPlaceholder')}
              required
              maxLength={200}
              error={
                errors.pixKey
                  ? errors.pixKey.message
                    ? t(errors.pixKey.message as 'pixKeyError')
                    : t('pixKeyError')
                  : undefined
              }
              onChange={event =>
                field.onChange(InputHelper.applyPixKeyMask(event.target.value, pixKeyType))
              }
              onPaste={value =>
                field.onChange(InputHelper.applyPixKeyMask(value.trim(), pixKeyType))
              }
            />
          )}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={!isValid}>
            {t('save')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
