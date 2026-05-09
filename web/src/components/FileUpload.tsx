import { type ChangeEvent, type DragEvent, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { match } from 'ts-pattern'

import type { TPayment } from 'fractapay-shared'
import { ALLOWED_INPUT_ACCEPT } from 'fractapay-shared'

import { StyleHelper } from '../helpers/StyleHelper'
import { useUpload } from '../hooks/useUpload'
import { Button } from './Button'

import LoadingSpinnerIcon from '../assets/icons/loading-spinner-icon.svg?react'
import UploadIcon from '../assets/icons/upload-icon.svg?react'

type TFileUploadProps = {
  onPaymentsExtracted: (payments: TPayment[]) => void
}

export const FileUpload = ({ onPaymentsExtracted }: TFileUploadProps) => {
  const { t } = useTranslation()
  const [isDragActive, setIsDragActive] = useState(false)
  const { mutate, isPending, data } = useUpload()
  const errorCode = data && !data.success ? (data.error ?? 'UNKNOWN') : null

  const processFile = useCallback(
    (file: File) => {
      mutate(file, {
        onSuccess: result => {
          if (result.success) {
            onPaymentsExtracted(result.payments)
          }
        },
      })
    },
    [mutate, onPaymentsExtracted]
  )

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()

      setIsDragActive(false)

      const file = event.dataTransfer.files[0]

      if (file) processFile(file)
    },
    [processFile]
  )

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]

      if (file) processFile(file)
    },
    [processFile]
  )

  return (
    <div
      onDragOver={event => {
        event.preventDefault()

        setIsDragActive(true)
      }}
      onDragLeave={() => setIsDragActive(false)}
      onDrop={handleDrop}
      className={StyleHelper.merge(
        'relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200',
        'cursor-pointer group',
        {
          'border-primary bg-primary/10 scale-[1.01]': isDragActive,
          'border-white/10 bg-white/5 hover:border-primary/50 hover:bg-primary/5': !isDragActive,
          'pointer-events-none opacity-70': isPending,
        }
      )}
    >
      <input
        type="file"
        accept={ALLOWED_INPUT_ACCEPT}
        onChange={handleChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isPending}
      />

      <div className="flex flex-col items-center gap-4">
        <div
          className={StyleHelper.merge(
            'size-16 rounded-2xl flex items-center justify-center transition-colors',
            {
              'bg-primary/20': isDragActive,
              'bg-white/5 group-hover:bg-primary/10': !isDragActive,
            }
          )}
        >
          {isPending ? (
            <LoadingSpinnerIcon className="animate-spin size-8 text-primary" aria-hidden="true" />
          ) : (
            <UploadIcon
              className={StyleHelper.merge('size-8 transition-colors', {
                'text-primary': isDragActive,
                'text-gray-400 group-hover:text-primary': !isDragActive,
              })}
              aria-hidden="true"
            />
          )}
        </div>

        <div>
          <p className="text-white font-semibold text-lg mb-1">
            {match({ isDragActive, isPending })
              .with({ isDragActive: true }, () => t('upload.dragActive'))
              .with({ isPending: true }, () => t('upload.analyzing'))
              .otherwise(() => t('upload.description'))}
          </p>
          <p className="text-gray-500 text-sm">{t('upload.formats')}</p>
        </div>

        {!isPending && <Button size="sm">{t('upload.button')}</Button>}

        {errorCode && (
          <p className="text-red-400 text-sm font-medium">{t(`errors.${errorCode}`)}</p>
        )}
      </div>
    </div>
  )
}
