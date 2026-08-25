import { GROUP_NAME } from '../src/domain/brand.js'

export function isMailConfigured() {
  return Boolean(process.env.KAMG_SMTP_HOST && process.env.KAMG_SMTP_USER && process.env.KAMG_SMTP_PASS)
}

export async function sendMail({ to, subject, text }) {
  if (!isMailConfigured()) return { sent: false, skipped: 'not-configured' }
  try {
    const nodemailerMod = await import('nodemailer')
    const nodemailer = nodemailerMod.default || nodemailerMod
    const transporter = nodemailer.createTransport({
      host: process.env.KAMG_SMTP_HOST,
      port: Number(process.env.KAMG_SMTP_PORT || 587),
      secure: process.env.KAMG_SMTP_SECURE === '1' || process.env.KAMG_SMTP_PORT === '465',
      auth: {
        user: process.env.KAMG_SMTP_USER,
        pass: process.env.KAMG_SMTP_PASS,
      },
    })
    await transporter.sendMail({
      from: process.env.KAMG_SMTP_FROM || `${GROUP_NAME} <${process.env.KAMG_SMTP_USER}>`,
      to,
      subject,
      text,
    })
    return { sent: true }
  } catch {
    return { sent: false, skipped: 'send-failed' }
  }
}

export function passwordResetEmail({ nom, resetUrl }) {
  return {
    subject: `Réinitialiser votre mot de passe — ${GROUP_NAME}`,
    text: [
      `Bonjour ${nom || ''},`.trim(),
      '',
      'Une demande de réinitialisation de mot de passe a été faite pour votre compte.',
      'Ouvrez ce lien (valable une heure) pour en choisir un nouveau :',
      resetUrl,
      '',
      'Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.',
      '',
      GROUP_NAME,
    ].join('\n'),
  }
}
