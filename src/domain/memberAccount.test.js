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
  peopleCoveredByAccount,
} from './memberAccount.js'
import { currentSeasonId, newSeasonId } from './seasons.js'

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
    assert.equal(parent.alsoDances, false)
    const dancingParent = normalizeSignup({
      prenom: 'Marie',
      nom: 'Le Gall',
      relation: 'parent',
      childrenNames: 'Léa',
      alsoDances: true,
    })
    assert.equal(dancingParent.alsoDances, true)
    const dancer = normalizeSignup({ prenom: 'Léa', nom: 'Le Gall', relation: 'danseur' })
    assert.equal(dancer.alsoDances, true)
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
    assert.equal(canRsvpAsPerson({ status: 'active', personIds: ['lea'], duesOverdue: true }, 'lea'), false)
  })

  it('laisse un parent sans cotisation répondre pour un enfant à jour', () => {
    const now = new Date('2026-09-02T12:00:00')
    const season = newSeasonId(now)
    assert.equal(season, '2026-2027')
    assert.equal(currentSeasonId(now), '2025-2026')
    const mom = { id: 'mom', prenom: 'Lydie', nom: 'Normant', roles: [], saisons: [], childIds: ['zoe'] }
    const zoe = {
      id: 'zoe',
      prenom: 'Zoé',
      nom: 'Normant',
      roles: ['danseur_enfant'],
      saisons: [season],
    }
    const people = [mom, zoe]
    const linkedToChild = { role: 'membre', status: 'active', personIds: ['zoe'] }
    assert.equal(accountDuesOverdue(linkedToChild, people, now), false)
    assert.equal(canRsvpAsPerson(linkedToChild, 'zoe', people, now), true)
    assert.equal(canRsvpAsPerson(linkedToChild, 'mom', people, now), false)

    const linkedToMom = { role: 'membre', status: 'active', personIds: ['mom'] }
    assert.deepEqual(peopleCoveredByAccount(linkedToMom, people).sort(), ['mom', 'zoe'])
    assert.equal(accountDuesOverdue(linkedToMom, people, now), false)
    assert.equal(canRsvpAsPerson(linkedToMom, 'zoe', people, now), true)
    assert.equal(canRsvpAsPerson(linkedToMom, 'mom', people, now), false)

    const unpaidChild = { ...zoe, saisons: [] }
    assert.equal(accountDuesOverdue(linkedToChild, [mom, unpaidChild], now), true)
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
