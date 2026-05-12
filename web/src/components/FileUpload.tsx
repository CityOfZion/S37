import { type ChangeEvent, type DragEvent, type FormEvent, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { match } from 'ts-pattern'

import type { TPayment, TToken } from 'fractapay-shared'
import { ALLOWED_INPUT_ACCEPT } from 'fractapay-shared'

import eurcIconUrl from '../assets/icons/eurc-icon.png'
import usdcIconUrl from '../assets/icons/usdc-icon.png'
import xlmIconUrl from '../assets/icons/xlm-icon.png'
import { StyleHelper } from '../helpers/StyleHelper'
import { useUpload } from '../hooks/useUpload'
import { Button } from './Button'
import { Input } from './Input'
import { Select } from './Select'

import LoadingSpinnerIcon from '../assets/icons/loading-spinner-icon.svg?react'
import UploadIcon from '../assets/icons/upload-icon.svg?react'

const TOKEN_OPTIONS = [
  {
    value: 'XLM',
    label: 'XLM',
    icon: <img src={xlmIconUrl} alt="XLM" className="size-5 rounded-full" />,
  },
  {
    value: 'USDC',
    label: 'USDC',
    icon: <img src={usdcIconUrl} alt="USDC" className="size-5 rounded-full" />,
  },
  {
    value: 'EURC',
    label: 'EURC',
    icon: <img src={eurcIconUrl} alt="EURC" className="size-5 rounded-full" />,
  },
]

type TFileUploadProps = {
  onPaymentsExtracted: (payments: TPayment[]) => void
}

export const FileUpload = ({ onPaymentsExtracted }: TFileUploadProps) => {
  const { t } = useTranslation()
  const { mutate, isPending, data } = useUpload()
  const [isDragActive, setIsDragActive] = useState(false)
  const [token, setToken] = useState<TToken>('XLM')
  const [destinationAddress, setDestinationAddress] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const errorCode = data && !data.success ? (data.error ?? 'UNKNOWN') : null

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (!file) return

      mutate(
        {
          file,
          token,
          destinationAddress,
        },
        {
          onSuccess: result => {
            if (result.success) {
              onPaymentsExtracted(result.payments)
            }
          },
        }
      )
    },
    [mutate, onPaymentsExtracted, token, destinationAddress, file]
  )

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()

    setIsDragActive(false)

    const newFile = event.dataTransfer.files[0]

    if (newFile) setFile(newFile)
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newFile = event.target.files?.[0]

    if (newFile) setFile(newFile)
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Select
          name="token"
          label={t('form.token.label')}
          placeholder={t('form.token.placeholder')}
          hint={t('form.token.hint')}
          required
          options={TOKEN_OPTIONS}
          value={token}
          onValueChange={value => setToken(value as TToken)}
        />

        <Input
          name="destinationAddress"
          label={t('form.address.label')}
          placeholder={t('form.address.placeholder')}
          hint={t('form.address.hint')}
          value={destinationAddress}
          onChange={event => setDestinationAddress(event.target.value.trim())}
        />
      </div>

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
            'border-white/10 bg-white/5 hover:border-primary/50 hover:bg-primary/5':
              !isDragActive && !file,
            'border-green-400/50 bg-green-400/5': !isDragActive && !!file,
            'pointer-events-none opacity-70': isPending,
          }
        )}
      >
        <input
          aria-label={t('upload.button')}
          name="file"
          type="file"
          accept={ALLOWED_INPUT_ACCEPT}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isPending}
          onChange={handleChange}
        />

        <div className="flex flex-col items-center gap-4">
          <div
            className={StyleHelper.merge(
              'size-16 rounded-2xl flex items-center justify-center transition-colors',
              {
                'bg-primary/20': isDragActive,
                'bg-green-400/10': !isDragActive && !!file,
                'bg-white/5 group-hover:bg-primary/10': !isDragActive && !file,
              }
            )}
          >
            {isPending ? (
              <LoadingSpinnerIcon className="animate-spin size-8 text-primary" aria-hidden="true" />
            ) : (
              <UploadIcon
                className={StyleHelper.merge('size-8 transition-colors', {
                  'text-primary': isDragActive,
                  'text-green-400': !isDragActive && !!file,
                  'text-gray-400 group-hover:text-primary': !isDragActive && !file,
                })}
                aria-hidden="true"
              />
            )}
          </div>

          <div>
            <p className="text-white font-semibold text-lg mb-1">
              {match({ isDragActive, isPending, hasFile: !!file })
                .with({ isDragActive: true }, () => t('upload.dragActive'))
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

      <Button type="submit" className="w-full" disabled={!file || isPending}>
        {isPending ? t('upload.analyzing') : t('upload.submit')}
      </Button>
    </form>
  )
}
