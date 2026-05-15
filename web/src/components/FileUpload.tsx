import { type ChangeEvent, type DragEvent, useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { zodResolver } from '@hookform/resolvers/zod'
import { match } from 'ts-pattern'

import type { TToken } from 'fractapay-shared'
import { ErrorCode } from 'fractapay-shared'
import { ALLOWED_INPUT_ACCEPT } from 'fractapay-shared'

import brazilFlagUrl from '../assets/flags/brazil-flag.svg'
import { InputHelper } from '../helpers/InputHelper'
import { StyleHelper } from '../helpers/StyleHelper'
import { ToastHelper } from '../helpers/ToastHelper'
import { usePaymentsStore } from '../hooks/use-payments-store'
import { useUploadMutation } from '../hooks/use-upload-mutation'
import { fileUploadSchema, type TFileUploadFormValues } from '../schemas/file-upload-schema'
import { Button } from './Button'
import { Input } from './Input'
import { Select } from './Select'

import LoadingSpinnerIcon from '../assets/icons/loading-spinner-icon.svg?react'
import UploadIcon from '../assets/icons/upload-icon.svg?react'

export const FileUpload = () => {
  const { t } = useTranslation('components', { keyPrefix: 'fileUpload' })
  const { hasPayments, mergePayments, setToken, setPrice, setAddress, address } = usePaymentsStore()
  const { mutate, isPending, data } = useUploadMutation()
  const [file, setFile] = useState<File | null>(null)
  const [isFileDragActive, setIsFileDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors, isValid },
  } = useForm<TFileUploadFormValues>({
    resolver: zodResolver(fileUploadSchema),
    defaultValues: { token: 'TESOURO', address },
    mode: 'onChange',
  })

  const errorCode = data && !data.success ? data.error || ErrorCode.UNKNOWN : null
  const isSubmitInvalid = !file || isPending || !isValid
  const isFieldDisabled = hasPayments || isPending

  const tokenOptions = useMemo(
    () => [
      {
        value: 'TESOURO',
        label: t('form.token.options.TESOURO'),
        icon: (
          <img
            aria-hidden="true"
            src={brazilFlagUrl}
            alt=""
            className="size-5 pointer-events-none rounded-full object-cover"
          />
        ),
      },
    ],
    [t]
  )

  const handleFileDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()

    setIsFileDragActive(false)

    const newFile = event.dataTransfer.files[0]

    if (newFile) {
      setFile(newFile)
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newFile = event.target.files?.[0]

    if (newFile) {
      setFile(newFile)
    }
  }

  const onSubmit = () => {
    if (isSubmitInvalid) return

    const values = getValues()

    mutate(
      { ...values, file },
      {
        onSuccess: ({ success, payments, price }) => {
          if (!success) return

          if (payments.length === 0) {
            ToastHelper.error(t('noPaymentsFound'), t('verifyYourFile'))

            return
          }

          mergePayments(payments)
          setPrice(price)
          setAddress(values.address)
          ToastHelper.success(t('uploadSuccess'), t('paymentsCount', { count: payments.length }))
        },
      }
    )
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Controller
          name="token"
          control={control}
          disabled={isFieldDisabled}
          render={({ field }) => (
            <Select
              name={field.name}
              label={t('form.token.label')}
              placeholder={t('form.token.placeholder')}
              hint={t('form.token.hint')}
              required
              options={tokenOptions}
              value={field.value}
              disabled={field.disabled}
              onValueChange={value => {
                field.onChange(value)
                setToken(value as TToken)
              }}
            />
          )}
        />

        <Controller
          name="address"
          control={control}
          disabled={isFieldDisabled}
          render={({ field }) => (
            <Input
              name={field.name}
              label={t('form.address.label')}
              placeholder={t('form.address.placeholder')}
              value={field.value}
              error={
                errors.address
                  ? t(`form.address.${errors.address.message}`, 'form.address.error')
                  : undefined
              }
              disabled={field.disabled}
              onPaste={value => field.onChange(InputHelper.sanitizeAddress(value))}
              onChange={event => field.onChange(InputHelper.sanitizeAddressEvent(event))}
            />
          )}
        />
      </div>

      <div
        onDragOver={event => {
          event.preventDefault()
          setIsFileDragActive(true)
        }}
        onDragLeave={() => setIsFileDragActive(false)}
        onDrop={handleFileDrop}
        className={StyleHelper.merge(
          'relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200',
          'cursor-pointer group',
          {
            'border-primary bg-primary/10 scale-[1.01]': isFileDragActive,
            'border-white/10 bg-white/5 hover:border-primary/50 hover:bg-primary/5':
              !isFileDragActive && !file,
            'border-green-400/50 bg-green-400/5': !isFileDragActive && !!file,
            'pointer-events-none opacity-70': isPending,
          }
        )}
      >
        <input
          ref={fileInputRef}
          aria-label={t('upload.button')}
          name="file"
          type="file"
          aria-required="true"
          accept={ALLOWED_INPUT_ACCEPT}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isPending}
          onChange={handleFileChange}
        />

        <div className="flex flex-col items-center gap-4">
          <div
            className={StyleHelper.merge(
              'size-16 rounded-2xl flex items-center justify-center transition-colors',
              {
                'bg-primary/20': isFileDragActive,
                'bg-green-400/10': !isFileDragActive && !!file,
                'bg-white/5 group-hover:bg-primary/10 group-focus:bg-primary/10':
                  !isFileDragActive && !file,
              }
            )}
          >
            {isPending ? (
              <LoadingSpinnerIcon
                className="animate-spin size-8 text-green-400"
                aria-hidden="true"
              />
            ) : (
              <UploadIcon
                className={StyleHelper.merge('size-8 transition-colors', {
                  'text-primary': isFileDragActive,
                  'text-green-400': !isFileDragActive && !!file,
                  'text-gray-400 group-hover:text-primary group-focus:text-primary':
                    !isFileDragActive && !file,
                })}
                aria-hidden="true"
              />
            )}
          </div>

          <div>
            <p className="text-white font-semibold text-lg mb-1">
              {match({ isFileDragActive, isPending, hasFile: !!file })
                .with({ isFileDragActive: true }, () => t('upload.dragActive'))
                .with({ isPending: true }, () => t('upload.analyzing'))
                .with({ hasFile: true }, () => file!.name)
                .otherwise(() => t('upload.description'))}
            </p>
            <p className="text-gray-500 text-sm">{t('upload.formats')}</p>
          </div>

          {!isPending && !file && (
            <Button
              type="button"
              size="sm"
              onClick={event => {
                event.preventDefault()
                event.stopPropagation()

                fileInputRef.current?.click()
              }}
            >
              {t('upload.button')}
            </Button>
          )}

          {errorCode && (
            <p className="text-red-400 text-sm font-medium">{t(`errors.${errorCode}`)}</p>
          )}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitInvalid}>
        {isPending ? t('upload.analyzing') : t('upload.submit')}
      </Button>
    </form>
  )
}
