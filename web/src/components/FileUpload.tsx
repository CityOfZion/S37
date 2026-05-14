import { type ChangeEvent, type DragEvent, Fragment, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { zodResolver } from '@hookform/resolvers/zod'
import { match } from 'ts-pattern'

import { ErrorCode } from 'fractapay-shared'
import { ALLOWED_INPUT_ACCEPT } from 'fractapay-shared'

import { InputHelper } from '../helpers/InputHelper'
import { StyleHelper } from '../helpers/StyleHelper'
import { ToastHelper } from '../helpers/ToastHelper'
import { usePaymentsStore } from '../hooks/use-payments-store'
import { useUploadMutation } from '../hooks/use-upload-mutation'
import { fileUploadSchema, type TFileUploadFormValues } from '../schemas/file-upload-schema'
import { Button } from './Button'
import { Info } from './Info'
import { Input } from './Input'
import { Select } from './Select'

import EurcIcon from '../assets/icons/eurc-icon.svg?react'
import InfoIcon from '../assets/icons/info-icon.svg?react'
import LoadingSpinnerIcon from '../assets/icons/loading-spinner-icon.svg?react'
import UploadIcon from '../assets/icons/upload-icon.svg?react'
import UsdcIcon from '../assets/icons/usdc-icon.svg?react'
import XlmIcon from '../assets/icons/xlm-icon.svg?react'

export const FileUpload = () => {
  const { t } = useTranslation('components', { keyPrefix: 'fileUpload' })
  const { setPayments } = usePaymentsStore()
  const { mutate, isPending, data } = useUploadMutation()
  const [file, setFile] = useState<File | null>(null)
  const [isFileDragActive, setIsFileDragActive] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<TFileUploadFormValues>({
    resolver: zodResolver(fileUploadSchema),
    defaultValues: { token: 'XLM', destinationAddress: '' },
    mode: 'onChange',
  })

  const errorCode = data && !data.success ? data.error || ErrorCode.UNKNOWN : null
  const isSubmitInvalid = !file || isPending || !isValid

  const tokenOptions = useMemo(
    () => [
      {
        value: 'XLM',
        label: t('form.token.options.XLM'),
        icon: <XlmIcon aria-hidden="true" className="size-5" />,
      },
      {
        value: 'USDC',
        label: t('form.token.options.USDC'),
        icon: <UsdcIcon aria-hidden="true" className="size-5" />,
      },
      {
        value: 'EURC',
        label: t('form.token.options.EURC'),
        icon: <EurcIcon aria-hidden="true" className="size-5" />,
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

  const onSubmit = (values: TFileUploadFormValues) => {
    if (isSubmitInvalid) return

    mutate(
      { ...values, file },
      {
        onSuccess: result => {
          if (result.success) {
            setPayments(result.payments)
            ToastHelper.success(
              t('uploadSuccess'),
              t('paymentsCount', { count: result.payments.length })
            )
          }
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
          render={({ field }) => (
            <Select
              name={field.name}
              label={t('form.token.label')}
              placeholder={t('form.token.placeholder')}
              hint={t('form.token.hint')}
              required
              options={tokenOptions}
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />

        <Controller
          name="destinationAddress"
          control={control}
          render={({ field }) => (
            <Input
              name={field.name}
              label={
                <Fragment>
                  {t('form.address.label')}
                  <Info content={t('form.address.info')} icon={<InfoIcon aria-hidden="true" />} />
                </Fragment>
              }
              placeholder={t('form.address.placeholder')}
              value={field.value}
              error={
                errors.destinationAddress
                  ? t(`form.address.${errors.destinationAddress.message}`, 'form.address.error')
                  : undefined
              }
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
          aria-label={t('upload.button')}
          name="file"
          type="file"
          required
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
              <LoadingSpinnerIcon className="animate-spin size-8 text-primary" aria-hidden="true" />
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

          {!isPending && !file && <Button size="sm">{t('upload.button')}</Button>}

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
