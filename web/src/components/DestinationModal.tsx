import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { zodResolver } from '@hookform/resolvers/zod'
import * as uuid from 'uuid'

import type { TDestination, TPixKeyType } from 'fractapay-shared'

import { InputHelper } from '../helpers/InputHelper'
import { destinationSchema, type TDestinationFormValues } from '../schemas/destination-schema'
import { Button } from './Button'
import { Input } from './Input'
import { Modal } from './Modal'
import { Select } from './Select'

type TProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  destination?: TDestination
  onSave: (destination: TDestination) => void
}

const TOKEN_OPTIONS = [{ value: 'TESOURO', label: 'Real (TESOURO)' }]

const PIX_KEY_TYPE_LABELS: Record<TPixKeyType, string> = {
  evp: 'Chave aleatória (EVP)',
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  phone: 'Telefone',
}

const PIX_KEY_TYPE_OPTIONS = Object.entries(PIX_KEY_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export const DestinationModal = ({ open, onOpenChange, destination, onSave }: TProps) => {
  const { t } = useTranslation('components', { keyPrefix: 'destinationModal' })
  const isEditing = !!destination

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<TDestinationFormValues>({
    resolver: zodResolver(destinationSchema),
    defaultValues: {
      name: destination?.name ?? '',
      token: destination?.token ?? 'TESOURO',
      stellarAddress: destination?.stellarAddress ?? '',
      pixKey: destination?.pixKey ?? '',
      pixKeyType: destination?.pixKeyType ?? 'evp',
    },
    mode: 'onChange',
  })

  useEffect(() => {
    if (open) {
      reset({
        name: destination?.name ?? '',
        token: destination?.token ?? 'TESOURO',
        stellarAddress: destination?.stellarAddress ?? '',
        pixKey: destination?.pixKey ?? '',
        pixKeyType: destination?.pixKeyType ?? 'evp',
      })
    }
  }, [open, destination, reset])

  const onSubmit = (values: TDestinationFormValues) => {
    const saved: TDestination = {
      id: destination?.id ?? uuid.v4(),
      name: values.name,
      token: values.token,
      stellarAddress: values.stellarAddress,
      pixKey: values.pixKey,
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
              error={errors.name ? t('nameError') : undefined}
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
          name="stellarAddress"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              label={t('stellarAddressLabel')}
              placeholder={t('stellarAddressPlaceholder')}
              required
              error={errors.stellarAddress ? t('errors.invalidAddress') : undefined}
              onPaste={value => field.onChange(InputHelper.sanitizeAddress(value))}
              onChange={event => field.onChange(InputHelper.sanitizeAddressEvent(event))}
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
              onValueChange={field.onChange}
            />
          )}
        />

        <Controller
          name="pixKey"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              label={t('pixKeyLabel')}
              placeholder={t('pixKeyPlaceholder')}
              required
              error={errors.pixKey ? t('pixKeyError') : undefined}
              onPaste={value => field.onChange(value.trim())}
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
