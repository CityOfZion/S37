import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'

import { match } from 'ts-pattern'

import { ErrorCode, TPayment, TToken } from 'fractapay-shared'
import { ALLOWED_INPUT_ACCEPT } from 'fractapay-shared'

import { InputHelper } from '../helpers/InputHelper'
import { StyleHelper } from '../helpers/StyleHelper'
import { useUpload } from '../hooks/useUpload'
import { Button } from './Button'
import { Info } from './Info'
import { Input } from './Input'
import { Select } from './Select'

import EurcIcon from '../assets/icons/eurc-icon.svg?react'
import InfoIcon from '../assets/icons/info-icon.svg?react'
import LoadingSpinnerIcon from '../assets/icons/loading-spinner-icon.svg?react'
import UploadIcon from '../assets/icons/upload-icon.svg?react'
import UsdcIcon from '../assets/icons/usdc-logo.svg?react'
import XlmIcon from '../assets/icons/xlm-icon.svg?react'

type TProps = {
  onPaymentsExtracted: (payments: TPayment[]) => void
}

export const FileUpload = ({ onPaymentsExtracted }: TProps) => {
  const { t } = useTranslation('components', { keyPrefix: 'fileUpload' })
  const { mutate, isPending, data } = useUpload()
  const [isDragActive, setIsDragActive] = useState(false)
  const [token, setToken] = useState<TToken>('XLM')
  const [destinationAddress, setDestinationAddress] = useState('')
  const [destinationAddressError, setDestinationAddressError] = useState<string | undefined>()
  const [file, setFile] = useState<File | null>(null)

  const errorCode = data && !data.success ? (data.error ?? ErrorCode.UNKNOWN) : null
  const isInvalid = !token || !file || !!destinationAddressError || isPending

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

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (isInvalid) return

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
    [isInvalid, mutate, file, token, destinationAddress, onPaymentsExtracted]
  )

  const handleDestinationAddressPaste = (value: string) => {
    setDestinationAddress(InputHelper.sanitizeAddress(value))
  }

  const handleDestinationAddressChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDestinationAddress(InputHelper.sanitizeAddressEvent(event))
  }

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

  useEffect(() => {
    setDestinationAddressError(
      destinationAddress && !InputHelper.isValidAddress(destinationAddress)
        ? t('form.address.error')
        : undefined
    )

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationAddress])

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Select
          name="token"
          label={t('form.token.label')}
          placeholder={t('form.token.placeholder')}
          hint={t('form.token.hint')}
          required
          options={tokenOptions}
          value={token}
          onValueChange={value => setToken(value as TToken)}
        />

        <Input
          name="destinationAddress"
          label={
            <Fragment>
              {t('form.address.label')}
              <Info content={t('form.address.info')} icon={<InfoIcon aria-hidden="true" />} />
            </Fragment>
          }
          placeholder={t('form.address.placeholder')}
          value={destinationAddress}
          error={destinationAddressError}
          onChange={handleDestinationAddressChange}
          onPaste={handleDestinationAddressPaste}
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
          required
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

      <Button type="submit" className="w-full" disabled={isInvalid}>
        {isPending ? t('upload.analyzing') : t('upload.submit')}
      </Button>
    </form>
  )
}
