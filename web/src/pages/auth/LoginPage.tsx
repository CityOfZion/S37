import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useNavigate } from '@tanstack/react-router'
import { isAxiosError } from 'axios'

import { APP_NAME, EErrorCode } from 'fractapay-shared'

import logoUrl from '../../assets/logos/logo.svg'
import { Button } from '../../components/Button'
import { SignInButton } from '../../components/SignInButton'
import { ToastHelper } from '../../helpers/ToastHelper'
import { usePageTitle } from '../../hooks/use-page-title'
import { usePasskeyLoginMutation } from '../../hooks/use-passkey-login-mutation'

import ArrowRightIcon from '../../assets/icons/arrow-right-icon.svg?react'

type TFeatureKey = 'ai' | 'pix' | 'audit'

const FEATURE_KEYS: TFeatureKey[] = ['ai', 'pix', 'audit']

type TPendingAction = 'google' | 'biometric' | 'signup'

type TProps = {
  onBiometric: () => void
  onSignup: () => void
  onGoogleSignInStart: () => void
  pendingAction: TPendingAction | null
}

const HeroPanel = ({ onBiometric, onSignup, onGoogleSignInStart, pendingAction }: TProps) => {
  const { t } = useTranslation('pages', { keyPrefix: 'auth' })
  const { t: tCommon } = useTranslation('common')

  const isPendingSignUp = pendingAction === 'signup'
  const isPendingSignIn = pendingAction === 'google'
  const isPendingBiometric = pendingAction === 'biometric'
  const isDisabled = isPendingSignUp || isPendingSignIn || isPendingBiometric

  return (
    <section
      className="relative flex flex-col px-6 py-10 sm:px-10 lg:px-16 lg:py-14 bg-linear-to-br from-primary to-accent-500 text-white min-h-screen lg:min-h-0 lg:h-screen lg:w-1/2 overflow-hidden"
      aria-labelledby="hero-headline"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-24 size-96 rounded-full bg-white/6 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 -right-20 size-80 rounded-full bg-white/6 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 left-1/4 size-72 rounded-full bg-white/5 blur-3xl"
      />

      <header className="relative flex items-center gap-3">
        <div className="size-12 sm:size-14 rounded-2xl bg-white flex items-center justify-center backdrop-blur-sm">
          <img
            src={logoUrl}
            alt={tCommon('logoAlt')}
            aria-hidden="true"
            className="size-8 sm:size-9"
          />
        </div>
        <span className="text-lg sm:text-xl font-extrabold tracking-tight">{APP_NAME}</span>
      </header>

      <div className="relative flex-1 flex flex-col justify-center gap-6 py-8 lg:py-12">
        <h1
          id="hero-headline"
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.03em] leading-[1.05] max-w-xl"
        >
          {t('headline')}
        </h1>
        <p className="text-base sm:text-lg text-white/90 max-w-prose leading-relaxed">
          {t('subtitle')}
        </p>

        <ul className="flex flex-col gap-3 mt-2">
          {FEATURE_KEYS.map(key => (
            <li
              key={key}
              className="inline-flex items-center gap-3 bg-white/12 rounded-2xl px-4 py-2.5 text-sm sm:text-[15px] font-semibold w-fit max-w-full"
            >
              <span className="truncate">{t(`features.${key}`)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="lg:hidden relative flex flex-col gap-3 mt-4">
        <SignInButton
          disabled={!!pendingAction}
          isPending={pendingAction === 'google'}
          onSignInStart={onGoogleSignInStart}
        />

        <Button
          size="lg"
          onClick={onBiometric}
          disabled={isDisabled}
          loading={isPendingBiometric}
          className="w-full bg-linear-to-r from-primary to-primary-300 text-white font-semibold rounded-xl shadow-lg shadow-primary/20 transition-[filter] hover:brightness-110 active:brightness-95"
        >
          <span aria-hidden="true">🔒</span>
          <span>{isPendingBiometric ? t('signingIn') : t('signInWithBiometrics')}</span>
        </Button>

        <Button
          variant="ghost"
          onClick={onSignup}
          disabled={isDisabled}
          loading={isPendingSignUp}
          icon={<ArrowRightIcon className="size-4 shrink-0" aria-hidden="true" />}
          className="text-white/90 hover:text-white hover:bg-transparent font-medium text-sm"
        >
          {isPendingSignUp ? t('signingUp') : t('signUpPrompt')}
        </Button>
      </div>
    </section>
  )
}

const SignInCard = ({ onBiometric, onSignup, onGoogleSignInStart, pendingAction }: TProps) => {
  const { t } = useTranslation('pages', { keyPrefix: 'auth' })

  const isPendingSignUp = pendingAction === 'signup'
  const isPendingSignIn = pendingAction === 'google'
  const isPendingBiometric = pendingAction === 'biometric'
  const isDisabled = isPendingSignUp || isPendingSignIn || isPendingBiometric

  return (
    <section
      className="hidden lg:flex lg:w-1/2 items-center justify-center bg-neutral-50 px-10 py-12 min-h-screen"
      aria-labelledby="signin-card-title"
    >
      <div className="bg-white rounded-3xl shadow-[0_16px_40px_rgba(26,24,50,0.12)] p-10 w-full max-w-md flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h2
            id="signin-card-title"
            className="text-3xl font-extrabold text-neutral-900 tracking-tight"
          >
            {t('signInTitle')}
          </h2>
          <p className="text-sm text-neutral-500">{t('signInSubtitle')}</p>
        </header>

        <SignInButton
          disabled={isDisabled}
          isPending={isPendingSignIn}
          onSignInStart={onGoogleSignInStart}
        />

        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="h-px flex-1 bg-neutral-200" />
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            {t('or')}
          </span>
          <span aria-hidden="true" className="h-px flex-1 bg-neutral-200" />
        </div>

        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            onClick={onBiometric}
            disabled={isDisabled}
            loading={isPendingBiometric}
            className="w-full bg-linear-to-r from-primary to-accent-500 text-white font-semibold rounded-xl shadow-lg shadow-primary/20 transition-[filter] hover:brightness-110 active:brightness-95"
          >
            <span aria-hidden="true">🔒</span>
            <span>{isPendingBiometric ? t('signingIn') : t('signInWithBiometrics')}</span>
          </Button>
          <p className="text-sm text-neutral-500 text-center leading-relaxed">
            {t('biometricsHint')}
          </p>
        </div>

        <Button
          variant="ghost"
          onClick={onSignup}
          disabled={isDisabled}
          loading={isPendingSignUp}
          icon={<ArrowRightIcon className="size-4 shrink-0" aria-hidden="true" />}
          className="w-full bg-brand-50 text-brand-700 hover:bg-brand-100 hover:text-brand-800 font-semibold text-sm py-3"
        >
          {isPendingSignUp ? t('signingUp') : t('signUpPrompt')}
        </Button>
      </div>
    </section>
  )
}

export const LoginPage = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'auth' })
  const navigate = useNavigate()
  const passkeyLoginMutation = usePasskeyLoginMutation()
  const [pendingAction, setPendingAction] = useState<TPendingAction | null>(null)

  usePageTitle(t('signInTitle'))

  const handleGoogleSignInStart = () => {
    setPendingAction('google')
  }

  const handleSignup = () => {
    setPendingAction('signup')

    void navigate({ to: '/onboarding', search: { source: 'signup' } })
  }

  const handleBiometric = () => {
    setPendingAction('biometric')

    passkeyLoginMutation.mutate(undefined, {
      onSuccess: () => {
        void navigate({ to: '/dashboard' })
      },
      onError: error => {
        setPendingAction(null)

        if (error instanceof DOMException && error.name === 'NotAllowedError') return

        const axiosCode: EErrorCode | undefined = isAxiosError(error)
          ? error.response?.data?.error
          : undefined
        const runtimeCode = error instanceof Error ? error.message : ''
        const isNoAccount =
          axiosCode === EErrorCode.WALLET_NOT_REGISTERED || runtimeCode === 'NO_SMART_ACCOUNT'

        ToastHelper.error(isNoAccount ? t('biometricNoAccount') : t('biometricFailed'))
      },
    })
  }

  return (
    <main className="min-h-screen w-full lg:flex bg-neutral-50">
      <HeroPanel
        onBiometric={handleBiometric}
        onSignup={handleSignup}
        onGoogleSignInStart={handleGoogleSignInStart}
        pendingAction={pendingAction}
      />

      <SignInCard
        onBiometric={handleBiometric}
        onSignup={handleSignup}
        onGoogleSignInStart={handleGoogleSignInStart}
        pendingAction={pendingAction}
      />
    </main>
  )
}
