import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  createItem,
  createPerson,
  createLoan,
  returnLoanItems,
  getItem,
  getStats,
  ensureDb,
  resetStoreCache,
  createEvent,
  setEventPresence,
  listPresences,
  getPublicMemberSpace,
  login,
  registerMember,
  placeMember,
  resetPassword,
  createPasswordResetLink,
  userFromToken,
} from './store.js'
import { countOpenTasks } from '../src/domain/itemTasks.js'
import { inscriptionEventsForGrid } from '../src/domain/presenceGrid.js'

async function tmpOptions() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'patrimoine-wf-'))
  const seedPath = path.join(dir, 'seed.json')
  const dbPath = path.join(dir, 'db.json')
  await writeFile(
    seedPath,
    JSON.stringify({ meta: { version: 1 }, referentiels: {}, items: [], people: [], loans: [] }),
  )
  await mkdir(path.join(dir, 'uploads'), { recursive: true })
  await ensureDb({ seedPath, dbPath })
  return { seedPath, dbPath, uploadsDir: path.join(dir, 'uploads') }
}

describe('workflows métier', () => {
  let options

  beforeEach(async () => {
    options = await tmpOptions()
  })

  it('panier → emprunt → retour enrichi → actions au tableau de bord', async () => {
    const jupe = await createItem(
      { code: 'JUP-WF', nom: 'Jupe workflow', categorie: 'piece_costume', disponibilite: 'Disponible' },
      options,
    )
    const gilet = await createItem(
      { code: 'GIL-WF', nom: 'Gilet workflow', categorie: 'piece_costume', disponibilite: 'Disponible' },
      options,
    )
    const person = await createPerson({ nom: 'Test', prenom: 'Workflow' }, options)

    const loan = await createLoan(
      {
        personId: person.id,
        titre: 'Répétition',
        items: [
          { itemId: jupe.id, comment: 'sortie ok' },
          { itemId: gilet.id, comment: '' },
        ],
      },
      options,
    )
    assert.equal(loan.statut, 'en_cours')
    assert.equal((await getItem(jupe.id, options)).disponibilite, 'Emprunté')

    await returnLoanItems(loan.id, [jupe.id], {
      ...options,
      dateRetour: '2026-08-17',
      updates: {
        [jupe.id]: {
          etat: 'Usé',
          propre: false,
          pressingPayePar: 'personne',
          pressingPayeParPersonId: person.id,
          descriptionAppend: 'Tache au bas',
          aFaire: ['Recoudre un ourlet'],
        },
      },
    })

    const jupeAfter = await getItem(jupe.id, options)
    assert.equal(jupeAfter.etat, 'Usé')
    assert.equal(jupeAfter.propre, false)
    assert.equal(jupeAfter.disponibilite, 'En restauration')
    assert.match(jupeAfter.description, /Tache au bas/)
    assert.equal(countOpenTasks([jupeAfter]), 1)

    const stats = await getStats(options)
    assert.equal(stats.openTasks, 1)

    const closed = await returnLoanItems(loan.id, [], { ...options, dateRetour: '2026-08-20' })
    assert.equal(closed.statut, 'retourne')
    assert.equal((await getItem(gilet.id, options)).disponibilite, 'Disponible')
  })

  it('refuse une pièce invalide avec une erreur client', async () => {
    await assert.rejects(
      () => createItem({ code: '', nom: 'Sans code', categorie: 'piece_costume' }, options),
      (error) => {
        assert.equal(error.status, 400)
        assert.match(error.message, /code/i)
        return true
      },
    )
  })

  it('remplit une feuille de présences puis l’expose à l’espace membres', async () => {
    const anna = await createPerson(
      { nom: 'Le Gall', prenom: 'Anna', roles: ['danseur_enfant'] },
      options,
    )
    const zoe = await createPerson(
      { nom: 'Bihan', prenom: 'Zoé', roles: ['danseur_concours'] },
      options,
    )
    const first = await createEvent(
      {
        type: 'sortie',
        titre: 'Sortie A',
        debut: '2027-03-10T18:00:00.000Z',
        inscriptionsOuvertes: true,
        publie: true,
      },
      options,
    )
    const second = await createEvent(
      {
        type: 'sortie',
        titre: 'Sortie B',
        debut: '2027-03-17T18:00:00.000Z',
        inscriptionsOuvertes: true,
        publie: true,
      },
      options,
    )
    await setEventPresence(first.id, { personId: anna.id, statut: '1' }, options)
    await setEventPresence(second.id, { personId: anna.id, statut: '?' }, options)
    await setEventPresence(first.id, { personId: zoe.id, statut: '0' }, options)
    assert.equal((await listPresences(options)).length, 3)

    const cleared = await setEventPresence(second.id, { personId: anna.id, statut: '' }, options)
    assert.equal(cleared.deleted, true)
    assert.equal((await listPresences(options)).length, 2)

    const space = await getPublicMemberSpace(options)
    const columns = inscriptionEventsForGrid(space.events.upcoming)
    assert.equal(columns.length, 2)
    assert.ok(space.presences.every((entry) => entry.eventId === first.id || entry.eventId === second.id))
    assert.ok(space.pages.every((page) => page.corps === undefined))
  })

  it('crée une fiche sortie typée avec préfixe de titre', async () => {
    const event = await createEvent(
      {
        kinds: ['sortie'],
        titre: 'Festival de Lorient',
        debut: '2027-08-08T14:00:00.000Z',
        lieu: 'Lorient',
        publie: true,
        sortie: {
          format: 'defile_animation_spectacle',
          transport: 'minibus_voitures',
          parkingFestival: 'oui',
          musique: 'enregistrement_ibiza',
          rdvHeure: '08:30',
          rdvLieu: 'Moulin Vert',
          costume: 'traditionnel',
          change: 'oui',
          repasMidi: 'pique_nique',
          repasSoir: 'pas_concerne',
          gourde: 'oui',
          programme: 'Défilé 14h, spectacle 16h',
          responsable: 'Anna Le Gall',
        },
      },
      options,
    )
    assert.equal(event.titre, '[SORTIE] Festival de Lorient')
    assert.deepEqual(event.kinds, ['sortie'])
    assert.equal(event.sortie.format, 'defile_animation_spectacle')
    assert.equal(event.sortie.transport, 'minibus_voitures')

    const space = await getPublicMemberSpace(options)
    const published = space.events.upcoming.find((entry) => entry.id === event.id)
    assert.ok(published)
    assert.equal(published.titre, '[SORTIE] Festival de Lorient')
    assert.equal(published.sortie.format, 'defile_animation_spectacle')
    assert.equal(published.sortie.responsable, 'Anna Le Gall')
  })

  it('un membre pending réinitialise son mot de passe puis le bureau le range', async () => {
    const admin = await login('admin', 'admin', options)
    const signup = await registerMember(
      {
        prenom: 'Marie',
        nom: 'Le Gall',
        email: 'marie.workflow@cercle.test',
        password: 'ancienmdp',
        relation: 'parent',
        childrenNames: 'Léa',
      },
      options,
    )
    assert.equal(signup.user.status, 'pending')
    const child = await createPerson(
      { nom: 'Le Gall', prenom: 'Léa', roles: ['danseur_enfant'] },
      options,
    )
    const link = await createPasswordResetLink(signup.user.id, {
      origin: 'http://kamg.test',
      actor: admin.user,
      ...options,
    })
    const token = new URL(link.url).searchParams.get('token')
    await resetPassword(token, 'nouveaumdp', options)
    assert.equal(await userFromToken(signup.token, options), null)
    const again = await login('marie.workflow@cercle.test', 'nouveaumdp', options)
    assert.equal(again.user.status, 'pending')
    const placed = await placeMember(signup.user.id, { personIds: [child.id] }, { actor: admin.user, ...options })
    assert.equal(placed.status, 'active')
    assert.deepEqual(placed.personIds, [child.id])
  })
})
