import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  getMailPublicStatus,
  isMailConfigured,
  passwordResetEmail,
  saveMailSettings,
  sendMail,
} from './mail.js'

function isolateSmtpEnv(fn) {
  const previous = {
    host: process.env.KAMG_SMTP_HOST,
    user: process.env.KAMG_SMTP_USER,
    pass: process.env.KAMG_SMTP_PASS,
    port: process.env.KAMG_SMTP_PORT,
    from: process.env.KAMG_SMTP_FROM,
  }
  delete process.env.KAMG_SMTP_HOST
  delete process.env.KAMG_SMTP_USER
  delete process.env.KAMG_SMTP_PASS
  delete process.env.KAMG_SMTP_PORT
  delete process.env.KAMG_SMTP_FROM
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      if (previous.host != null) process.env.KAMG_SMTP_HOST = previous.host
      else delete process.env.KAMG_SMTP_HOST
      if (previous.user != null) process.env.KAMG_SMTP_USER = previous.user
      else delete process.env.KAMG_SMTP_USER
      if (previous.pass != null) process.env.KAMG_SMTP_PASS = previous.pass
      else delete process.env.KAMG_SMTP_PASS
      if (previous.port != null) process.env.KAMG_SMTP_PORT = previous.port
      else delete process.env.KAMG_SMTP_PORT
      if (previous.from != null) process.env.KAMG_SMTP_FROM = previous.from
      else delete process.env.KAMG_SMTP_FROM
    })
}

describe('mail mot de passe oublié', () => {
  it('reste inactif sans SMTP', () =>
    isolateSmtpEnv(async () => {
      const dir = await mkdtemp(path.join(os.tmpdir(), 'kamg-mail-'))
      assert.equal(isMailConfigured({ dataDir: dir }), false)
    }))

  it('rédige un e-mail avec le lien', () => {
    const mail = passwordResetEmail({
      nom: 'Marie',
      resetUrl: 'https://kamg.example/nouveau-mot-de-passe?token=abc',
    })
    assert.match(mail.subject, /mot de passe/i)
    assert.match(mail.text, /Marie/)
    assert.match(mail.text, /https:\/\/kamg\.example\/nouveau-mot-de-passe\?token=abc/)
  })

  it('n’envoie rien si SMTP n’est pas configuré', () =>
    isolateSmtpEnv(async () => {
      const dir = await mkdtemp(path.join(os.tmpdir(), 'kamg-mail-'))
      const result = await sendMail(
        { to: 'marie@example.test', subject: 'Test', text: 'Hello' },
        { dataDir: dir },
      )
      assert.equal(result.sent, false)
      assert.equal(result.skipped, 'not-configured')
    }))

  it('enregistre smtp.env et envoie via le transport fourni', () =>
    isolateSmtpEnv(async () => {
      const dir = await mkdtemp(path.join(os.tmpdir(), 'kamg-mail-'))
      const saved = saveMailSettings(
        {
          host: 'ssl0.ovh.net',
          port: 465,
          user: 'contact@kamg.fr',
          password: 'secret-ovh',
          from: 'KAMG <contact@kamg.fr>',
        },
        { dataDir: dir },
      )
      assert.equal(saved.configured, true)
      assert.equal(saved.hasPassword, true)
      assert.equal(saved.user, 'contact@kamg.fr')
      assert.equal(getMailPublicStatus({ dataDir: dir }).configured, true)
      const raw = await readFile(path.join(dir, 'smtp.env'), 'utf8')
      assert.match(raw, /KAMG_SMTP_PASS=secret-ovh/)
      assert.doesNotMatch(JSON.stringify(saved), /secret-ovh/)

      const sent = []
      const result = await sendMail(
        { to: 'marie@example.test', subject: 'Reset', text: 'Lien' },
        {
          dataDir: dir,
          transport: {
            sendMail: async (msg) => {
              sent.push(msg)
              return {}
            },
          },
        },
      )
      assert.equal(result.sent, true)
      assert.equal(sent[0].to, 'marie@example.test')
      assert.match(sent[0].from, /contact@kamg.fr/)
    }))

  it('conserve le mot de passe si le champ est laissé vide', () =>
    isolateSmtpEnv(async () => {
      const dir = await mkdtemp(path.join(os.tmpdir(), 'kamg-mail-'))
      saveMailSettings(
        { host: 'ssl0.ovh.net', user: 'contact@kamg.fr', password: 'secret-ovh' },
        { dataDir: dir },
      )
      saveMailSettings({ host: 'ssl0.ovh.net', user: 'bureau@kamg.fr', password: '' }, { dataDir: dir })
      const raw = await readFile(path.join(dir, 'smtp.env'), 'utf8')
      assert.match(raw, /KAMG_SMTP_PASS=secret-ovh/)
      assert.match(raw, /KAMG_SMTP_USER=bureau@kamg.fr/)
    }))
})
