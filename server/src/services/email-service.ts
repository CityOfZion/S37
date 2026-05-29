import { Resend } from 'resend'

import { APP_NAME, DEFAULT_LANGUAGE, type TLanguage } from 'fractapay-shared'

import { EnvHelper } from '../helpers/EnvHelper'
import i18next from '../i18next'

const resend = EnvHelper.RESEND_API_KEY ? new Resend(EnvHelper.RESEND_API_KEY) : null

type TSendVerificationCodeInput = {
  email: string
  code: string
  fullName: string
  language?: TLanguage
}

type TTemplateInput = {
  firstName: string
  code: string
  language: TLanguage
}

export const sendVerificationCode = async ({
  email,
  code,
  fullName,
  language = DEFAULT_LANGUAGE,
}: TSendVerificationCodeInput): Promise<void> => {
  if (!resend) {
    return
  }

  const firstName = fullName.split(' ')[0] || fullName

  const { error } = await resend.emails.send({
    from: `${APP_NAME} <${EnvHelper.RESEND_EMAIL}>`,
    to: email,
    subject: i18next.t('verification.subject', { lng: language, code, appName: APP_NAME }),
    html: buildVerificationHtml({ firstName, code, language }),
    text: buildVerificationText({ firstName, code, language }),
  })

  if (error) {
    throw new Error(`Resend rejected the email: ${error.name} — ${error.message}`)
  }
}

const buildVerificationText = ({ firstName, code, language }: TTemplateInput): string => {
  const translate = (key: string): string =>
    i18next.t(key, { lng: language, firstName, code, appName: APP_NAME })

  return [
    translate('verification.greeting'),
    '',
    translate('verification.textBody'),
    '',
    translate('verification.expiry'),
  ].join('\n')
}

const buildVerificationHtml = ({ firstName, code, language }: TTemplateInput): string => {
  const translate = (key: string): string =>
    i18next.t(key, { lng: language, firstName, code, appName: APP_NAME })

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 32px; max-width: 480px; margin: 0 auto; color: #1a1832;">
      <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 16px;">${translate('verification.greeting')}</h1>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 24px;">${translate('verification.htmlIntro')}</p>
      <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; background: #f4f3fb; border-radius: 12px; padding: 20px; text-align: center; color: #1a1832;">${code}</div>
      <p style="font-size: 13px; color: #6b6884; margin: 24px 0 0;">${translate('verification.expiry')}</p>
    </div>
  `
}
