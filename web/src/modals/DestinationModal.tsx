import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { zodResolver } from '@hookform/resolvers/zod'

import type { TDestination } from 'fractapay-shared'
import { TOKEN } from 'fractapay-shared'

import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Modal } from '../components/Modal'
import { Select } from '../components/Select'
import { InputHelper } from '../helpers/InputHelper'
import { destinationsSchema, type TDestinationFormValues } from '../schemas/destinations-schema'

import BrazilFlagIcon from '../assets/icons/brazil-flag-icon.svg?react'

type TProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  destination?: TDestination
  onSave: (data: Omit<TDestination, 'id'>) => void
  isSaving?: boolean
}

export const DestinationModal = ({ open, onOpenChange, destination, onSave, isSaving }: TProps) => {
  const { t } = useTranslation('modals', { keyPrefix: 'destination' })
  const { t: tCommon } = useTranslation('common')

  const TOKEN_OPTIONS = [
    {
      value: TOKEN.TESOURO,
      label: tCommon(`fiatByToken.${TOKEN.TESOURO}`),
      icon: <BrazilFlagIcon className="size-5 rounded-sm" aria-hidden="true" />,
    },
  ]

  const PIX_KEY_TYPE_OPTIONS = [
    { value: 'EVP', label: t('pixKeyTypeEvp') },
    { value: 'CPF', label: t('pixKeyTypeCpf') },
    { value: 'CNPJ', label: t('pixKeyTypeCnpj') },
    { value: 'EMAIL', label: t('pixKeyTypeEmail') },
    { value: 'PHONE', label: t('pixKeyTypePhone') },
  ]
  const isEditing = !!destination

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    clearErrors,
    formState: { errors, isValid },
  } = useForm<TDestinationFormValues>({
    resolver: zodResolver(destinationsSchema),
    defaultValues: {
      name: destination?.name || '',
      token: destination?.token || TOKEN.TESOURO,
      pixKey: InputHelper.applyPixKeyMask(
        destination?.pixKey || '',
        destination?.pixKeyType || 'EVP'
      ),
      pixKeyType: destination?.pixKeyType || 'EVP',
    },
    mode: 'onChange',
  })

  useEffect(() => {
    if (open) {
      const pixKeyType = destination?.pixKeyType || 'EVP'

      reset({
        name: destination?.name || '',
        token: destination?.token || TOKEN.TESOURO,
        pixKey: InputHelper.applyPixKeyMask(destination?.pixKey || '', pixKeyType),
        pixKeyType,
      })
    }
  }, [open, destination, reset])

  const pixKeyType = watch('pixKeyType')

  const onSubmit = (values: TDestinationFormValues) => {
    onSave({
      name: values.name.trim(),
      token: values.token,
      pixKey: InputHelper.normalizePixKeyForStorage(values.pixKey, values.pixKeyType),
      pixKeyType: values.pixKeyType,
    })
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
                errors.name ? t((errors.name.message ?? 'nameError') as 'nameError') : undefined
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
              type={pixKeyType === 'EMAIL' ? 'email' : 'text'}
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
          <Button type="submit" disabled={!isValid || isSaving}>
            {isSaving ? t('saving') : t('save')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
