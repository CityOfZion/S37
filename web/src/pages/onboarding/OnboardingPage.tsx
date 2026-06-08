import { type FormEvent, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { isAxiosError } from 'axios'

import { APP_NAME, EErrorCode } from 'fractapay-shared'

import logoUrl from '../../assets/logos/logo.svg'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { InputHelper } from '../../helpers/InputHelper'
import { ToastHelper } from '../../helpers/ToastHelper'
import { useCompleteOnboardingMutation } from '../../hooks/use-complete-onboarding-mutation'
import { useConnectExistingWalletMutation } from '../../hooks/use-connect-existing-wallet-mutation'
import { useCreateWalletMutation } from '../../hooks/use-create-wallet-mutation'
import { useSignupRequestMutation } from '../../hooks/use-signup-request-mutation'
import { useSignupVerifyMutation } from '../../hooks/use-signup-verify-mutation'
import { useUserQuery } from '../../hooks/use-user-query'
import { onboardingSchema, type TOnboardingFormValues } from '../../schemas/onboarding-schema'

import ArrowRightIcon from '../../assets/icons/arrow-right-icon.svg?react'
import CheckIcon from '../../assets/icons/check-icon.svg?react'
import UserIcon from '../../assets/icons/user-icon.svg?react'

const SUCCESS_TRANSITION_MS = 1200

const GRADIENT_CTA_CLASS =
  'w-full bg-linear-to-br from-primary to-accent-500 text-white font-semibold rounded-xl shadow-lg shadow-primary/20 transition-[filter] hover:brightness-110 active:brightness-95'

const TOTAL_STEPS = 3

const STEP_1_FIELDS = ['fullName', 'email'] as const

const STEP_2_FIELDS = ['companyName', 'cnpj'] as const

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

type TStepIndicatorProps = {
  currentStep: number
}

const StepIndicator = ({ currentStep }: TStepIndicatorProps) => {
  const { t } = useTranslation('pages', { keyPrefix: 'onboarding' })

  return (
    <div
      className="flex items-center gap-2"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={TOTAL_STEPS}
      aria-valuenow={currentStep}
      aria-label={t('stepIndicatorAria', { current: currentStep, total: TOTAL_STEPS })}
    >
      {Array.from({ length: TOTAL_STEPS }, (_, position) => {
        const stepNumber = position + 1
        const isFilled = stepNumber <= currentStep

        return (
          <div
            key={stepNumber}
            aria-hidden="true"
            className={
              isFilled
                ? 'h-1.5 flex-1 rounded-full bg-linear-to-br from-primary to-accent-500'
                : 'h-1.5 flex-1 rounded-full bg-neutral-200'
            }
          />
        )
      })}
    </div>
  )
}

export const OnboardingPage = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'onboarding' })
  const navigate = useNavigate()
  const { source } = useSearch({ from: '/onboarding' })
  const isSignupSource = source === 'signup'
  const completeMutation = useCompleteOnboardingMutation()
  const createWalletMutation = useCreateWalletMutation()
  const connectWalletMutation = useConnectExistingWalletMutation()
  const signupRequestMutation = useSignupRequestMutation()
  const signupVerifyMutation = useSignupVerifyMutation()
  const { data: user } = useUserQuery()
  const [isCelebrating, setIsCelebrating] = useState(false)
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [skippedIdentityStep, setSkippedIdentityStep] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [signupVerified, setSignupVerified] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [codeError, setCodeError] = useState<string | undefined>(undefined)
  const [requestError, setRequestError] = useState<string | undefined>(undefined)
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  const {
    control,
    trigger,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<TOnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      fullName: '',
      email: '',
      companyName: '',
      cnpj: '',
    },
    mode: 'onChange',
  })

  useEffect(() => {
    if (isSignupSource) return
    if (!user) return

    const hasIdentity = !!user.name && !!user.email

    if (hasIdentity) {
      setValue('fullName', user.name ?? '', { shouldValidate: true })
      setValue('email', user.email, { shouldValidate: true })
      setSkippedIdentityStep(true)
      setCurrentStep(previousStep => (previousStep === 1 ? 2 : previousStep))
    }
  }, [isSignupSource, user, setValue])

  useEffect(() => {
    if (cooldownEndsAt === null) {
      setRemainingSeconds(0)

      return
    }

    const tick = () => {
      setRemainingSeconds(Math.max(0, Math.ceil((cooldownEndsAt - Date.now()) / 1000)))
    }

    tick()
    const interval = window.setInterval(tick, 1000)

    return () => window.clearInterval(interval)
  }, [cooldownEndsAt])

  const isRequestingCode = signupRequestMutation.isPending
  const isVerifyingCode = signupVerifyMutation.isPending
  const identityStepDone = skippedIdentityStep || signupVerified

  const mapRequestError = (error: EErrorCode): string => {
    switch (error) {
      case EErrorCode.EMAIL_ALREADY_REGISTERED:
        return t('errorEmailAlreadyRegistered')
      case EErrorCode.EMAIL_LINKED_TO_OAUTH:
        return t('errorEmailLinkedToOauth')
      case EErrorCode.EMAIL_SEND_FAILED:
        return t('errorEmailSendFailed')
      case EErrorCode.RATE_LIMITED:
      case EErrorCode.IP_BANNED:
        return t('errorRateLimited')
      default:
        return t('errorGeneric')
    }
  }

  const mapVerifyError = (error: EErrorCode): string => {
    switch (error) {
      case EErrorCode.INVALID_VERIFICATION_CODE:
        return t('errorInvalidCode')
      case EErrorCode.VERIFICATION_EXPIRED:
        return t('errorCodeExpired')
      case EErrorCode.TOO_MANY_VERIFICATION_ATTEMPTS:
        return t('errorTooManyAttempts')
      case EErrorCode.EMAIL_ALREADY_REGISTERED:
        return t('errorEmailAlreadyRegistered')
      case EErrorCode.RATE_LIMITED:
      case EErrorCode.IP_BANNED:
        return t('errorRateLimited')
      default:
        return t('errorGeneric')
    }
  }

  const handleStep1Continue = async () => {
    setRequestError(undefined)

    const isStepValid = await trigger([...STEP_1_FIELDS])

    if (!isStepValid) return

    signupRequestMutation.mutate(
      { fullName: getValues('fullName').trim(), email: getValues('email').trim() },
      {
        onSuccess: result => {
          setCooldownEndsAt(new Date(result.cooldownEndsAt).getTime())
          setVerificationCode('')
          setCodeError(undefined)
          setIsVerifying(true)
        },
        onError: error => {
          const code: EErrorCode = isAxiosError(error)
            ? error.response?.data?.error
            : EErrorCode.NETWORK_ERROR

          if (code === EErrorCode.RESEND_TOO_SOON) {
            const cooldown: string | undefined = isAxiosError(error)
              ? error.response?.data?.cooldownEndsAt
              : undefined
            if (cooldown) setCooldownEndsAt(new Date(cooldown).getTime())
            setVerificationCode('')
            setCodeError(undefined)
            setIsVerifying(true)

            return
          }

          setRequestError(mapRequestError(code))
        },
      }
    )
  }

  const handleResendCode = () => {
    if (remainingSeconds > 0 || isRequestingCode) return

    setCodeError(undefined)

    signupRequestMutation.mutate(
      { fullName: getValues('fullName').trim(), email: getValues('email').trim() },
      {
        onSuccess: result => {
          setCooldownEndsAt(new Date(result.cooldownEndsAt).getTime())
          setVerificationCode('')
        },
        onError: error => {
          const code: EErrorCode = isAxiosError(error)
            ? error.response?.data?.error
            : EErrorCode.NETWORK_ERROR

          if (code === EErrorCode.RESEND_TOO_SOON) {
            const cooldown: string | undefined = isAxiosError(error)
              ? error.response?.data?.cooldownEndsAt
              : undefined
            if (cooldown) setCooldownEndsAt(new Date(cooldown).getTime())

            return
          }

          setCodeError(mapRequestError(code))
        },
      }
    )
  }

  const handleVerifyCode = (event: FormEvent) => {
    event.preventDefault()
    setCodeError(undefined)

    if (!/^\d{6}$/.test(verificationCode)) {
      setCodeError(t('errorInvalidCode'))

      return
    }

    signupVerifyMutation.mutate(
      { email: getValues('email').trim(), code: verificationCode },
      {
        onSuccess: () => {
          setSignupVerified(true)
          setIsVerifying(false)
          setCurrentStep(2)
        },
        onError: error => {
          const code: EErrorCode = isAxiosError(error)
            ? error.response?.data?.error
            : EErrorCode.NETWORK_ERROR

          if (
            code === EErrorCode.VERIFICATION_EXPIRED ||
            code === EErrorCode.TOO_MANY_VERIFICATION_ATTEMPTS
          ) {
            setCooldownEndsAt(null)
          }

          setCodeError(mapVerifyError(code))
        },
      }
    )
  }

  const handleBackToIdentity = () => {
    setIsVerifying(false)
    setVerificationCode('')
    setCodeError(undefined)
  }

  const handleAdvance = async () => {
    const fieldsToValidate = currentStep === 1 ? STEP_1_FIELDS : STEP_2_FIELDS
    const isStepValid = await trigger([...fieldsToValidate])

    if (!isStepValid) return

    setCurrentStep(previousStep => (previousStep < TOTAL_STEPS ? previousStep + 1 : previousStep))
  }

  const handleGoBack = () => {
    setCurrentStep(previousStep => {
      if (previousStep === 3) return 2
      if (previousStep === 2 && !identityStepDone) return 1

      return previousStep
    })
  }

  const onSubmit = async () => {
    if (currentStep === 1 && isSignupSource) {
      await handleStep1Continue()

      return
    }

    await handleAdvance()
  }

  const finishOnboarding = async (contractId: string, credentialId: string) => {
    await completeMutation.mutateAsync({
      companyName: getValues('companyName').trim(),
      address: contractId,
      passkeyCredentialId: credentialId,
    })

    setIsCelebrating(true)
    window.setTimeout(() => {
      void navigate({ to: '/chat' })
    }, SUCCESS_TRANSITION_MS)
  }

  const handleCreateWallet = async () => {
    try {
      const userName = user?.email || user?.name
      if (!userName) throw new Error()

      const { contractId, credentialId } = await createWalletMutation.mutateAsync({ userName })

      await finishOnboarding(contractId, credentialId)
    } catch (error) {
      const message = error instanceof Error ? error.message : t('walletError')
      ToastHelper.error(message)
    }
  }

  const handleUseExistingWallet = async () => {
    try {
      const { contractId, credentialId } = await connectWalletMutation.mutateAsync()

      await finishOnboarding(contractId, credentialId)
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      const message = code === 'NO_SMART_ACCOUNT' ? t('walletNoExisting') : t('walletConnectError')
      ToastHelper.error(message)
    }
  }

  const isMutating = isSubmitting || completeMutation.isPending
  const isWalletBusy =
    createWalletMutation.isPending ||
    connectWalletMutation.isPending ||
    completeMutation.isPending ||
    isCelebrating
  const canShowBack = (currentStep === 2 && !identityStepDone) || currentStep === 3

  const renderStepHeader = () => {
    if (currentStep === 1) {
      return (
        <>
          <h1
            id="onboarding-title"
            className="text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight"
          >
            {t('step1Title')}
          </h1>
          <p className="text-sm text-neutral-500 leading-relaxed">{t('step1Subtitle')}</p>
        </>
      )
    }

    if (currentStep === 2) {
      return (
        <>
          <h1
            id="onboarding-title"
            className="text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight"
          >
            {t('title')}
          </h1>
          <p className="text-sm text-neutral-500 leading-relaxed">{t('subtitle')}</p>
        </>
      )
    }

    return (
      <>
        <h1
          id="onboarding-title"
          className="text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight"
        >
          {t('passkeyTitle')}
        </h1>
        <p className="text-sm text-neutral-500 leading-relaxed">{t('passkeySubtitle')}</p>
      </>
    )
  }

  const renderStepFields = () => {
    if (currentStep === 1) {
      return (
        <>
          <Controller
            name="fullName"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                label={t('fullNameLabel')}
                placeholder={t('fullNamePlaceholder')}
                required
                maxLength={150}
                autoComplete="name"
                error={
                  errors.fullName?.message
                    ? t(errors.fullName.message, { defaultValue: errors.fullName.message })
                    : undefined
                }
              />
            )}
          />

          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="email"
                label={t('emailLabel')}
                placeholder={t('emailPlaceholder')}
                required
                maxLength={150}
                autoComplete="email"
                inputMode="email"
                error={
                  errors.email?.message
                    ? t(errors.email.message, { defaultValue: errors.email.message })
                    : undefined
                }
              />
            )}
          />

          {requestError && (
            <p role="alert" className="text-sm text-danger-500">
              {requestError}
            </p>
          )}
        </>
      )
    }

    if (currentStep === 2) {
      return (
        <>
          <Controller
            name="companyName"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                label={t('companyNameLabel')}
                placeholder={t('companyNamePlaceholder')}
                required
                maxLength={150}
                autoComplete="organization"
                error={
                  errors.companyName?.message
                    ? t(errors.companyName.message, { defaultValue: errors.companyName.message })
                    : undefined
                }
              />
            )}
          />

          <Controller
            name="cnpj"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                value={field.value ?? ''}
                label={t('cnpjLabel')}
                placeholder={t('cnpjPlaceholder')}
                maxLength={18}
                inputMode="numeric"
                autoComplete="off"
                error={
                  errors.cnpj?.message
                    ? t(errors.cnpj.message, { defaultValue: errors.cnpj.message })
                    : undefined
                }
                onChange={event =>
                  field.onChange(InputHelper.applyPixKeyMask(event.target.value, 'CNPJ'))
                }
              />
            )}
          />
        </>
      )
    }

    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-neutral-50 px-6 py-8 text-center">
        <div className="size-16 rounded-full bg-linear-to-br from-primary to-accent-500 flex items-center justify-center shadow-lg shadow-primary/20">
          <UserIcon className="size-8 text-white" aria-hidden="true" />
        </div>
        <p className="text-sm text-neutral-600 leading-relaxed max-w-sm">
          {t('passkeyDescription')}
        </p>
      </div>
    )
  }

  const renderWalletActions = () => (
    <div className="flex flex-col gap-3 mt-3">
      <Button
        type="button"
        size="lg"
        disabled={isWalletBusy}
        onClick={() => void handleCreateWallet()}
        className={GRADIENT_CTA_CLASS}
        icon={
          createWalletMutation.isPending || completeMutation.isPending ? undefined : (
            <ArrowRightIcon className="size-5 shrink-0" aria-hidden="true" />
          )
        }
      >
        {createWalletMutation.isPending
          ? t('walletCreating')
          : completeMutation.isPending
            ? t('saving')
            : t('walletCreate')}
      </Button>

      <Button
        type="button"
        disabled={isWalletBusy}
        onClick={() => void handleUseExistingWallet()}
        className="text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded-md"
      >
        {connectWalletMutation.isPending ? t('walletConnecting') : t('walletUseExisting')}
      </Button>

      {canShowBack && (
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={isWalletBusy}
          onClick={handleGoBack}
          iconPosition="start"
        >
          {t('back')}
        </Button>
      )}
    </div>
  )

  const renderActions = () => {
    if (currentStep === TOTAL_STEPS) {
      return renderWalletActions()
    }

    const isSignupIdentityStep = currentStep === 1 && isSignupSource
    const isBusy = isMutating || (isSignupIdentityStep && isRequestingCode)

    const primaryLabel =
      isSignupIdentityStep && isRequestingCode
        ? t('sendingCode')
        : isMutating
          ? t('saving')
          : t('continue')

    return (
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between mt-3">
        {canShowBack && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={isBusy}
            onClick={handleGoBack}
            iconPosition="start"
            className="sm:w-auto"
          >
            {t('back')}
          </Button>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={isBusy}
          className={GRADIENT_CTA_CLASS}
          icon={isBusy ? undefined : <ArrowRightIcon className="size-5 shrink-0" aria-hidden />}
        >
          {primaryLabel}
        </Button>
      </div>
    )
  }

  const renderVerification = () => (
    <>
      <StepIndicator currentStep={1} />

      <header className="flex flex-col gap-2">
        <h1
          id="onboarding-title"
          className="text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight"
        >
          {t('verifyTitle')}
        </h1>
        <p className="text-sm text-neutral-500 leading-relaxed">
          {t('verifySubtitle', { email: getValues('email').trim() })}
        </p>
      </header>

      <form onSubmit={handleVerifyCode} className="flex flex-col gap-5">
        <Input
          label={t('verifyCodeLabel')}
          value={verificationCode}
          onChange={event => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder={t('verifyCodePlaceholder')}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className="text-center text-2xl font-semibold tracking-[0.5em]"
          error={codeError}
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="tertiary"
            disabled={isVerifyingCode}
            onClick={handleBackToIdentity}
          >
            {t('changeEmail')}
          </Button>

          <Button
            type="button"
            variant="tertiary"
            disabled={remainingSeconds > 0 || isRequestingCode}
            onClick={handleResendCode}
          >
            {remainingSeconds > 0
              ? t('resendCooldown', { seconds: remainingSeconds })
              : t('resendCode')}
          </Button>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={isVerifyingCode || verificationCode.length !== 6}
          className={GRADIENT_CTA_CLASS}
          icon={
            isVerifyingCode ? undefined : <ArrowRightIcon className="size-5 shrink-0" aria-hidden />
          }
        >
          {isVerifyingCode ? t('verifying') : t('verifyCtaLabel')}
        </Button>
      </form>
    </>
  )

  return (
    <main className="min-h-screen w-full lg:flex bg-white lg:bg-neutral-50">
      <HeroPanel />

      <section
        className="flex-1 lg:w-1/2 lg:bg-neutral-50 flex flex-col items-center lg:justify-center lg:p-10"
        aria-labelledby="onboarding-title"
      >
        <div className="lg:hidden w-full flex flex-col items-center gap-3 pt-10 pb-6 px-6 bg-linear-to-br from-primary to-accent-500 justify-center text-4xl shadow-lg shadow-primary/20">
          <span aria-hidden="true">🏢</span>
        </div>

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
          ) : isVerifying ? (
            renderVerification()
          ) : (
            <>
              <StepIndicator currentStep={currentStep} />

              <header className="flex flex-col gap-2">{renderStepHeader()}</header>

              <form
                onSubmit={event => {
                  event.preventDefault()
                  void onSubmit()
                }}
                className="flex flex-col gap-5"
              >
                {renderStepFields()}

                {renderActions()}
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
