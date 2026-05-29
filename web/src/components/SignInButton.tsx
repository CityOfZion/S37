import { useTranslation } from 'react-i18next'

import { PKCE_VERIFIER_STORAGE_KEY } from '../constants'
import { EnvHelper } from '../helpers/EnvHelper'
import { computeChallenge, generateVerifier } from '../helpers/pkce'
import { StyleHelper } from '../helpers/StyleHelper'
import { Button } from './Button'

import GoogleIcon from '../assets/icons/google-icon.svg?react'

type TProps = {
  className?: string
}

export const SignInButton = ({ className }: TProps) => {
  const { t } = useTranslation('pages', { keyPrefix: 'auth' })

  const handleClick = async () => {
    const verifier = generateVerifier()
    sessionStorage.setItem(PKCE_VERIFIER_STORAGE_KEY, verifier)

    const challenge = await computeChallenge(verifier)

    window.location.href = `${EnvHelper.API_URL}/auth/google?cc=${encodeURIComponent(challenge)}`
  }

  return (
    <Button
      variant="outline"
      size="lg"
      onClick={handleClick}
      className={StyleHelper.merge('w-full', className)}
    >
      <GoogleIcon className="size-5 shrink-0" aria-hidden="true" />
      <span>{t('continueWithGoogle')}</span>
    </Button>
  )
}
