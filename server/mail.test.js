import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isMailConfigured, passwordResetEmail, sendMail } from './mail.js'

describe('mail mot de passe oublié', () => {
  it('reste inactif sans SMTP', () => {
    const previous = {
      host: process.env.KAMG_SMTP_HOST,
      user: process.env.KAMG_SMTP_USER,
      pass: process.env.KAMG_SMTP_PASS,
    }
    delete process.env.KAMG_SMTP_HOST
    delete process.env.KAMG_SMTP_USER
    delete process.env.KAMG_SMTP_PASS
    try {
      assert.equal(isMailConfigured(), false)
    } finally {
      if (previous.host != null) process.env.KAMG_SMTP_HOST = previous.host
      if (previous.user != null) process.env.KAMG_SMTP_USER = previous.user
      if (previous.pass != null) process.env.KAMG_SMTP_PASS = previous.pass
    }
  })

  it('rédige un e-mail avec le lien', () => {
    const mail = passwordResetEmail({
      nom: 'Marie',
      resetUrl: 'https://kamg.example/nouveau-mot-de-passe?token=abc',
    })
    assert.match(mail.subject, /mot de passe/i)
    assert.match(mail.text, /Marie/)
    assert.match(mail.text, /https:\/\/kamg\.example\/nouveau-mot-de-passe\?token=abc/)
  })

  it('n’envoie rien si SMTP n’est pas configuré', async () => {
    const previousHost = process.env.KAMG_SMTP_HOST
    delete process.env.KAMG_SMTP_HOST
    try {
      const result = await sendMail({ to: 'marie@example.test', subject: 'Test', text: 'Hello' })
      assert.equal(result.sent, false)
      assert.equal(result.skipped, 'not-configured')
    } finally {
      if (previousHost != null) process.env.KAMG_SMTP_HOST = previousHost
    }
  })
})
