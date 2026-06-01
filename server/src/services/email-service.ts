import { Resend } from 'resend'

import { EnvHelper } from '../helpers/EnvHelper'

const resend = EnvHelper.RESEND_API_KEY ? new Resend(EnvHelper.RESEND_API_KEY) : null

type TSendVerificationCodeInput = {
  email: string
  code: string
  fullName: string
}

export const sendVerificationCode = async ({
  email,
  code,
  fullName,
}: TSendVerificationCodeInput): Promise<void> => {
  if (!resend) {
    // TODO: remove this dev fallback once a verified sending domain is configured. Without a verified domain, Resend can only send from `onboarding@resend.dev` and only to the account owner's own email.
    console.info(`[Email] DEV — verification code for ${email} (${fullName}): ${code}`)

    return
  }

  const firstName = fullName.split(' ')[0] || fullName
  const subject = `${code} is your FractaPay verification code`

  const { error } = await resend.emails.send({
    from: EnvHelper.EMAIL_FROM,
    to: email,
    subject,
    html: buildVerificationHtml({ firstName, code }),
    text: buildVerificationText({ firstName, code }),
  })

  if (error) {
    throw new Error(`Resend rejected the email: ${error.name} — ${error.message}`)
  }
}

type TTemplateInput = {
  firstName: string
  code: string
}

const buildVerificationText = ({ firstName, code }: TTemplateInput): string => {
  return [
    `Hi ${firstName},`,
    '',
    `Your FractaPay verification code is: ${code}`,
    '',
    'This code expires in 10 minutes. If you didn’t request it, you can ignore this email.',
  ].join('\n')
}

const buildVerificationHtml = ({ firstName, code }: TTemplateInput): string => {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 32px; max-width: 480px; margin: 0 auto; color: #1a1832;">
      <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 16px;">Hi ${firstName},</h1>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 24px;">Use the code below to finish creating your FractaPay account.</p>
      <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; background: #f4f3fb; border-radius: 12px; padding: 20px; text-align: center; color: #1a1832;">${code}</div>
      <p style="font-size: 13px; color: #6b6884; margin: 24px 0 0;">This code expires in 10 minutes. If you didn&rsquo;t request it, you can ignore this email.</p>
    </div>
  `
}
