import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'

import logoUrl from '../../assets/logos/logo.svg'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { APP_NAME } from '../../constants'
import { useCompleteOnboardingMutation } from '../../hooks/use-complete-onboarding-mutation'
import { onboardingSchema, type TOnboardingFormValues } from '../../schemas/onboarding-schema'

import ArrowRightIcon from '../../assets/icons/arrow-right-icon.svg?react'
import CheckIcon from '../../assets/icons/check-icon.svg?react'

const SUCCESS_TRANSITION_MS = 1200

const GRADIENT_CTA_CLASS =
  'w-full bg-linear-to-br from-primary to-accent-500 text-white font-semibold rounded-xl shadow-lg shadow-primary/20 transition-[filter] hover:brightness-110 active:brightness-95'

const HeroPanel = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'onboarding' })

  return (
    <section
      className="hidden lg:flex lg:w-1/2 lg:h-screen bg-linear-to-br from-primary to-accent-500 text-white px-16 py-14 flex-col relative overflow-hidden"
      aria-labelledby="onboarding-hero-headline"
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
        <div className="size-14 rounded-2xl bg-white flex items-center justify-center backdrop-blur-sm">
          <img src={logoUrl} alt="" aria-hidden="true" className="size-9" />
        </div>
        <span className="text-xl font-extrabold tracking-tight">{APP_NAME}</span>
      </header>

      <div className="relative flex-1 flex flex-col justify-center gap-8">
        <div className="relative size-56 xl:size-64 rounded-[2.5rem] bg-white/15 backdrop-blur-sm flex items-center justify-center overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-10 -left-8 size-32 rounded-full bg-white/15 blur-2xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-12 -right-8 size-36 rounded-full bg-white/10 blur-2xl"
          />
          <span aria-hidden="true" className="relative text-8xl">
            🏢
          </span>
        </div>

        <div className="flex flex-col gap-4 max-w-md">
          <h1
            id="onboarding-hero-headline"
            className="text-5xl font-extrabold tracking-[-0.03em] leading-[1.05]"
          >
            {t('heroHeadline')}
          </h1>
          <p className="text-lg text-white/90 leading-relaxed">{t('heroSubtitle')}</p>
        </div>
      </div>
    </section>
  )
}

const MobileLogoBlock = () => {
  return (
    <div className="lg:hidden flex flex-col items-center gap-3 pt-10 pb-6 px-6 size-20 bg-linear-to-br from-primary to-accent-500 justify-center text-4xl shadow-lg shadow-primary/20">
      <span aria-hidden="true">🏢</span>
    </div>
  )
}

export const OnboardingPage = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'onboarding' })
  const navigate = useNavigate()
  const completeMutation = useCompleteOnboardingMutation()
  const [isCelebrating, setIsCelebrating] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm<TOnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      companyName: '',
      cnpj: '',
    },
    mode: 'onChange',
  })

  const onSubmit = async (values: TOnboardingFormValues) => {
    await completeMutation.mutateAsync({ companyName: values.companyName })
    setIsCelebrating(true)
    window.setTimeout(() => {
      void navigate({ to: '/chat' })
    }, SUCCESS_TRANSITION_MS)
  }

  const isDisabled = !isValid || isSubmitting || completeMutation.isPending || isCelebrating

  return (
    <main className="min-h-screen w-full lg:flex bg-white lg:bg-neutral-50">
      <HeroPanel />

      <section
        className="flex-1 lg:w-1/2 lg:bg-[#F8F7FB] flex flex-col items-center lg:justify-center lg:p-10"
        aria-labelledby="onboarding-title"
      >
        <MobileLogoBlock />

        <div className="w-full max-w-md flex flex-col gap-6 px-6 pb-8 lg:bg-white lg:rounded-3xl lg:shadow-[0_16px_40px_rgba(26,24,50,0.12)] lg:p-10">
          {isCelebrating ? (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-1 flex-col items-center justify-center gap-4 py-6 text-center min-h-89.5 animate-[modal-in_0.35s_ease-out]"
            >
              <div className="size-16 rounded-full bg-linear-to-br from-primary to-accent-500 flex items-center justify-center shadow-lg shadow-primary/20 animate-[modal-in_0.5s_ease-out]">
                <CheckIcon className="size-8 text-white" aria-hidden="true" />
              </div>
              <h1
                id="onboarding-title"
                className="text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight"
              >
                {t('successHeadline')}
              </h1>
              <p className="text-sm text-neutral-500 leading-relaxed">{t('successMessage')}</p>
            </div>
          ) : (
            <>
              <header className="flex flex-col gap-2">
                <h1
                  id="onboarding-title"
                  className="text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight"
                >
                  {t('title')}
                </h1>
                <p className="text-sm text-neutral-500 leading-relaxed">{t('subtitle')}</p>
              </header>

              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
                <Controller
                  name="companyName"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label={t('companyNameLabel')}
                      placeholder={t('companyNamePlaceholder')}
                      required
                      maxLength={191}
                      autoComplete="organization"
                      error={
                        errors.companyName
                          ? errors.companyName.message === 'companyNameRequired'
                            ? t('companyNameRequired')
                            : errors.companyName.message
                          : undefined
                      }
                    />
                  )}
                />

                {/* TODO: Implement CNPJ input mask */}

                <Controller
                  name="cnpj"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      label={t('cnpjLabel')}
                      placeholder={t('cnpjPlaceholder')}
                      maxLength={20}
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  )}
                />

                <Button
                  type="submit"
                  size="lg"
                  disabled={isDisabled}
                  className={GRADIENT_CTA_CLASS}
                  icon={
                    isSubmitting || completeMutation.isPending ? undefined : (
                      <ArrowRightIcon className="size-5 shrink-0" aria-hidden="true" />
                    )
                  }
                >
                  {isSubmitting || completeMutation.isPending ? t('saving') : t('continue')}
                </Button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
