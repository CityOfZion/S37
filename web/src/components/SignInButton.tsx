import { useTranslation } from 'react-i18next'

import { PKCE_VERIFIER_STORAGE_KEY } from '../constants'
import { EnvHelper } from '../helpers/EnvHelper'
import { PkceHelper } from '../helpers/PkceHelper'
import { StyleHelper } from '../helpers/StyleHelper'
import { Button } from './Button'

import GoogleIcon from '../assets/icons/google-icon.svg?react'

type TProps = {
  className?: string
  disabled?: boolean
  isPending?: boolean
  onSignInStart?: () => void
}

export const SignInButton = ({
  className,
  disabled = false,
  isPending = false,
  onSignInStart,
}: TProps) => {
  const { t } = useTranslation('pages', { keyPrefix: 'auth' })

  const handleClick = async () => {
    onSignInStart?.()

    const verifier = PkceHelper.generateVerifier()

    sessionStorage.setItem(PKCE_VERIFIER_STORAGE_KEY, verifier)

    const challenge = await PkceHelper.computeChallenge(verifier)

    window.location.href = `${EnvHelper.API_URL}/auth/google?cc=${encodeURIComponent(challenge)}`
  }

  return (
    <Button
      variant="outline"
      size="lg"
      onClick={handleClick}
      disabled={disabled || isPending}
      className={StyleHelper.merge('w-full', className)}
    >
      <GoogleIcon className="size-5 shrink-0" aria-hidden="true" />
      <span>{isPending ? t('signingIn') : t('continueWithGoogle')}</span>
    </Button>
  )
}
