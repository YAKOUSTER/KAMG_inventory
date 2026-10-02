import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GROUP_NAME } from '../src/domain/brand.js'

const DEFAULT_HOST = 'ssl0.ovh.net'
const DEFAULT_PORT = '465'

function dataDir() {
  return process.env.KAMG_DATA_DIR
    ? path.resolve(process.env.KAMG_DATA_DIR)
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data')
}

export function smtpFilePath(options = {}) {
  return options.smtpPath || path.join(options.dataDir || dataDir(), 'smtp.env')
}

function parseEnvFile(text) {
  const out = {}
  for (const line of String(text || '').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1)
  }
  return out
}

function readSmtpFile(options = {}) {
  const file = smtpFilePath(options)
  if (!existsSync(file)) return {}
  try {
    return parseEnvFile(readFileSync(file, 'utf8'))
  } catch {
    return {}
  }
}

function firstValue(sources, key) {
  for (const source of sources) {
    const value = String(source?.[key] || '').trim()
    if (value) return value
  }
  return ''
}

export function getSmtpConfig(options = {}) {
  const file = readSmtpFile(options)
  const host = firstValue([process.env, file], 'KAMG_SMTP_HOST')
  const user = firstValue([process.env, file], 'KAMG_SMTP_USER')
  const pass = firstValue([process.env, file], 'KAMG_SMTP_PASS')
  const portRaw = firstValue([process.env, file], 'KAMG_SMTP_PORT') || DEFAULT_PORT
  const port = Number(portRaw)
  const secureFlag = firstValue([process.env, file], 'KAMG_SMTP_SECURE')
  const from = firstValue([process.env, file], 'KAMG_SMTP_FROM')
  return {
    host,
    user,
    pass,
    port: Number.isFinite(port) && port > 0 ? port : 465,
    secure: secureFlag === '1' || String(portRaw) === '465' || port === 465,
    from: from || (user ? `${GROUP_NAME} <${user}>` : ''),
  }
}

export function isMailConfigured(options = {}) {
  const config = getSmtpConfig(options)
  return Boolean(config.host && config.user && config.pass)
}

export function getMailPublicStatus(options = {}) {
  const config = getSmtpConfig(options)
  const configured = Boolean(config.host && config.user && config.pass)
  return {
    configured,
    host: config.host || DEFAULT_HOST,
    port: config.port,
    user: config.user,
    from: config.from,
    hasPassword: Boolean(config.pass),
  }
}

function assertSafeSmtpValue(label, value) {
  const text = String(value || '')
  if (text.includes('\n') || text.includes('\r')) {
    throw Object.assign(new Error(`${label} invalide`), { status: 400 })
  }
  return text.trim()
}

export function saveMailSettings(payload = {}, options = {}) {
  const current = getSmtpConfig(options)
  const host = assertSafeSmtpValue('Serveur SMTP', payload.host ?? current.host) || DEFAULT_HOST
  const user = assertSafeSmtpValue('Identifiant', payload.user ?? current.user)
  const from = assertSafeSmtpValue('Expéditeur', payload.from ?? '')
  const portRaw = assertSafeSmtpValue('Port', payload.port ?? current.port ?? DEFAULT_PORT) || DEFAULT_PORT
  const port = Number(portRaw)
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw Object.assign(new Error('Port SMTP invalide'), { status: 400 })
  }
  const incomingPass = payload.password == null ? '' : assertSafeSmtpValue('Mot de passe', payload.password)
  const pass = incomingPass || current.pass
  if (!user) throw Object.assign(new Error('L’identifiant SMTP est requis'), { status: 400 })
  if (!pass) throw Object.assign(new Error('Le mot de passe SMTP est requis'), { status: 400 })
  const secure = port === 465 ? '1' : payload.secure === true || payload.secure === '1' ? '1' : '0'
  const file = smtpFilePath(options)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(
    file,
    [
      `KAMG_SMTP_HOST=${host}`,
      `KAMG_SMTP_PORT=${port}`,
      `KAMG_SMTP_SECURE=${secure}`,
      `KAMG_SMTP_USER=${user}`,
      `KAMG_SMTP_PASS=${pass}`,
      from ? `KAMG_SMTP_FROM=${from}` : '',
      '',
    ]
      .filter((line) => line !== '')
      .join('\n') + '\n',
    { encoding: 'utf8', mode: 0o640 },
  )
  return getMailPublicStatus(options)
}

export async function sendMail({ to, subject, text }, options = {}) {
  const recipient = String(to || '').trim()
  if (!recipient) return { sent: false, skipped: 'no-recipient' }
  if (!isMailConfigured(options)) return { sent: false, skipped: 'not-configured' }
  const config = getSmtpConfig(options)
  try {
    const transport = options.transport || (await createSmtpTransport(config))
    await transport.sendMail({
      from: config.from || `${GROUP_NAME} <${config.user}>`,
      to: recipient,
      subject,
      text,
    })
    return { sent: true }
  } catch (error) {
    const reason = error?.message || 'send-failed'
    console.warn('KAMG mail : envoi impossible —', reason)
    return { sent: false, skipped: 'send-failed', error: reason }
  }
}

async function createSmtpTransport(config) {
  const nodemailerMod = await import('nodemailer')
  const nodemailer = nodemailerMod.default || nodemailerMod
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  })
}

export async function sendTestMail({ to } = {}, options = {}) {
  const recipient = String(to || '').trim()
  if (!recipient) throw Object.assign(new Error('Indiquez un e-mail de test'), { status: 400 })
  if (!isMailConfigured(options)) {
    throw Object.assign(new Error('SMTP non configuré'), { status: 400 })
  }
  const result = await sendMail(
    {
      to: recipient,
      subject: `Test d’envoi — ${GROUP_NAME}`,
      text: [
        'Ceci est un e-mail de test depuis Gestion KAMG.',
        'Si vous le lisez, le mot de passe oublié pourra partir.',
        '',
        GROUP_NAME,
      ].join('\n'),
    },
    options,
  )
  if (!result.sent) {
    throw Object.assign(new Error(result.error || 'L’e-mail de test n’est pas parti'), { status: 502 })
  }
  return { ok: true, to: recipient }
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
