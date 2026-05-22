import { useTranslation } from 'react-i18next'

import { EnvHelper } from '../helpers/EnvHelper'
import { StyleHelper } from '../helpers/StyleHelper'
import { Button } from './Button'

import GoogleIcon from '../assets/icons/google-icon.svg?react'

type TVariant = 'outline' | 'solid-white'

type TProps = {
  variant?: TVariant
  className?: string
}

const SOLID_WHITE_CLASSES =
  'bg-white text-neutral-900 hover:bg-neutral-100 active:bg-neutral-200 focus-visible:ring-2 focus-visible:ring-white/50 font-semibold rounded-xl shadow-lg shadow-neutral-900/10 transition-colors'

export const SignInButton = ({ variant = 'outline', className }: TProps) => {
  const { t } = useTranslation('components', { keyPrefix: 'auth' })

  const handleClick = () => {
    window.location.href = `${EnvHelper.API_URL}/auth/google`
  }

  if (variant === 'solid-white') {
    return (
      <Button
        size="lg"
        onClick={handleClick}
        className={StyleHelper.merge(SOLID_WHITE_CLASSES, 'w-full', className)}
      >
        <GoogleIcon className="size-5 shrink-0" aria-hidden="true" />
        <span>{t('signInWithGoogle')}</span>
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="lg"
      onClick={handleClick}
      className={StyleHelper.merge('w-full', className)}
    >
      <GoogleIcon className="size-5 shrink-0" aria-hidden="true" />
      <span>{t('signInWithGoogle')}</span>
    </Button>
  )
}
