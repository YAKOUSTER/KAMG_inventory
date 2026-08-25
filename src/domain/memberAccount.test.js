import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  canRsvpAsPerson,
  findUserByIdentifiant,
  homePath,
  isValidEmail,
  normalizeSignup,
  passwordResetUrl,
  validatePassword,
} from './memberAccount.js'

describe('inscription membres', () => {
  it('exige un email et un mot de passe solides', () => {
    assert.equal(isValidEmail('Anna@Cercle.fr'), true)
    assert.equal(isValidEmail('pas-un-mail'), false)
    assert.equal(validatePassword('motdepasse'), 'motdepasse')
    assert.throws(() => validatePassword('court'), /8 caractères/)
  })

  it('demande le prénom des enfants pour un parent', () => {
    const parent = normalizeSignup({
      prenom: 'Marie',
      nom: 'Le Gall',
      relation: 'parent',
      childrenNames: 'Léa',
    })
    assert.equal(parent.relation, 'parent')
    assert.throws(
      () => normalizeSignup({ prenom: 'Marie', nom: 'Le Gall', relation: 'parent' }),
      /enfant/,
    )
  })
})

describe('accès après connexion', () => {
  it('envoie les simples membres vers l’espace membres', () => {
    assert.equal(homePath({ role: 'membre', status: 'pending', permissions: [] }), '/espace-membre')
    assert.equal(homePath({ role: 'admin', status: 'active', permissions: ['items.read'] }), '/')
  })

  it('n’autorise le sondage que pour les fiches liées, une fois rangé', () => {
    const parent = { status: 'active', personIds: ['lea', 'yann'] }
    assert.equal(canRsvpAsPerson(parent, 'lea'), true)
    assert.equal(canRsvpAsPerson(parent, 'inconnu'), false)
    assert.equal(canRsvpAsPerson({ status: 'pending', personIds: ['lea'] }, 'lea'), false)
  })

  it('retrouve un compte par email ou identifiant historique', () => {
    const users = [
      { login: 'admin', email: '' },
      { login: 'marie@cercle.fr', email: 'marie@cercle.fr' },
    ]
    assert.equal(findUserByIdentifiant(users, 'admin').login, 'admin')
    assert.equal(findUserByIdentifiant(users, 'Marie@Cercle.fr').login, 'marie@cercle.fr')
  })

  it('construit l’URL de réinitialisation depuis l’origine', () => {
    assert.equal(
      passwordResetUrl('https://kamg.example', 'tok-1'),
      'https://kamg.example/nouveau-mot-de-passe?token=tok-1',
    )
    assert.equal(passwordResetUrl('', 'abc'), '/nouveau-mot-de-passe?token=abc')
  })
})
