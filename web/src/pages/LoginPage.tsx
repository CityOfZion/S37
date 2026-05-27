import { useTranslation } from 'react-i18next'

import logoUrl from '../assets/logos/logo.svg'
import { Button } from '../components/Button'
import { SignInButton } from '../components/SignInButton'
import { APP_NAME } from '../constants'
import { ToastHelper } from '../helpers/ToastHelper'
import { usePageTitle } from '../hooks/use-page-title'
import { useSignupMutation } from '../hooks/use-signup-mutation'

type TFeatureKey = 'ai' | 'pix' | 'audit'

const FEATURE_KEYS: TFeatureKey[] = ['ai', 'pix', 'audit']

const HeroPanel = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'auth' })

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
          <img src={logoUrl} alt="FractaPay logo" aria-hidden="true" className="size-8 sm:size-9" />
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

      <div className="lg:hidden relative mt-4">
        <SignInButton variant="solid-white" />
      </div>
    </section>
  )
}

const SignInCard = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'auth' })
  const signupMutation = useSignupMutation()

  const handleSignup = () => {
    signupMutation.mutate(undefined, {
      onSuccess: result => {
        if (result.kind === 'not-implemented') {
          ToastHelper.success(t('signupComingSoon'))

          return
        }

        ToastHelper.error(t('signupError'))
      },
      onError: () => {
        ToastHelper.error(t('signupError'))
      },
    })
  }

  return (
    <section
      className="hidden lg:flex lg:w-1/2 bg-[#F8F7FB] items-center justify-center px-10 py-12 min-h-screen"
      aria-labelledby="signin-card-title"
    >
      <div className="bg-white rounded-3xl shadow-[0_16px_40px_rgba(26,24,50,0.12)] p-10 w-full max-w-md flex flex-col gap-7">
        <header className="flex flex-col gap-2">
          <h2
            id="signin-card-title"
            className="text-3xl font-extrabold text-neutral-900 tracking-tight"
          >
            {t('signInTitle')}
          </h2>
          <p className="text-sm text-neutral-500">{t('signInSubtitle')}</p>
        </header>

        <SignInButton variant="outline" />

        <div className="flex flex-col gap-2 items-center">
          <p className="text-xs text-neutral-500">{t('newHere')}</p>
          <Button
            variant="ghost"
            onClick={handleSignup}
            disabled={signupMutation.isPending}
            className="w-full bg-brand-50 text-brand-700 hover:bg-brand-100 hover:text-brand-800 font-semibold text-sm py-3"
          >
            {t('signUp')}
          </Button>
        </div>
      </div>
    </section>
  )
}

export const LoginPage = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'auth' })
  usePageTitle(t('signInTitle'))

  return (
    <main className="min-h-screen w-full lg:flex bg-neutral-50">
      <HeroPanel />
      <SignInCard />
    </main>
  )
}
