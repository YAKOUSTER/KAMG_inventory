import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  canRsvpAsPerson,
  canVisitAppRoute,
  findUserByIdentifiant,
  homePath,
  isValidEmail,
  normalizeSignup,
  passwordResetUrl,
  validatePassword,
  accountDuesOverdue,
  DUES_OVERDUE_MESSAGE,
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
    assert.equal(canVisitAppRoute({ role: 'membre' }, { member: true }), true)
    assert.equal(canVisitAppRoute({ role: 'membre' }, { permission: 'items.read' }), false)
    assert.equal(canVisitAppRoute({ role: 'admin' }, { permission: 'users.manage' }), true)
  })

  it('bloque l’application si la cotisation n’est plus à jour', () => {
    const overdue = { role: 'membre', status: 'active', permissions: [], personIds: ['anna'], duesOverdue: true }
    assert.equal(homePath(overdue), '/espace-membre')
    assert.equal(canVisitAppRoute(overdue, { member: true }), true)
    assert.equal(canVisitAppRoute(overdue, { permission: 'items.read' }), false)
    assert.equal(canVisitAppRoute(overdue, { permissionAny: ['agenda.libre'] }), false)
    const anna = { id: 'anna', roles: ['danseur_loisir'], saisons: ['2024-2025'] }
    assert.equal(accountDuesOverdue({ role: 'membre', status: 'active', personIds: ['anna'] }, [anna], new Date('2026-11-10T12:00:00')), true)
    assert.equal(
      accountDuesOverdue(
        { role: 'membre', status: 'active', personIds: ['anna'] },
        [{ ...anna, saisons: ['2026-2027'] }],
        new Date('2026-11-10T12:00:00'),
      ),
      false,
    )
    assert.equal(accountDuesOverdue({ role: 'admin', personIds: ['anna'] }, [anna]), false)
    assert.match(DUES_OVERDUE_MESSAGE, /cotisation/)
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
