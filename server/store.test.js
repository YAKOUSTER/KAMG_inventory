import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  createItem,
  updateItem,
  deleteItem,
  getItem,
  createPerson,
  getPerson,
  createLoan,
  returnLoanItems,
  updateLoan,
  cancelLoan,
  listItems,
  importDb,
  exportDb,
  ensureDb,
  saveUpload,
  login,
  createUser,
  updateUser,
  userFromToken,
  placeMember,
  registerMember,
  requestPasswordReset,
  createPasswordResetLink,
  resetPassword,
  readDb,
  writeDb,
  getBootstrap,
  getReferentiels,
  updateReferentiels,
  adjustStock,
  getLoan,
  listAudit,
  clearAudit,
  createEvent,
  getEvent,
  updateEvent,
  deleteEvent,
  setEventPresence,
  listPresences,
  listEvents,
  importGoogleCalendarEvents,
  getPublicCalendarIcs,
  getMemberSpace,
  updateMemberProfile,
} from './store.js'
import { todayLocal } from '../src/domain/dates.js'

async function tmpOptions() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'patrimoine-'))
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

describe('json store', () => {
  let options

  beforeEach(async () => {
    options = await tmpOptions()
  })

  it('crée et relit une pièce', async () => {
    const created = await createItem(
      { code: 'JUP-01', nom: 'Jupe noire', categorie: 'piece_costume', type: 'Jupe' },
      options,
    )
    assert.ok(created.id)
    const items = await listItems(options)
    assert.equal(items.length, 1)
    const detail = await getItem(created.id, options)
    assert.equal(detail.nom, 'Jupe noire')
  })

  it('enregistre du matériel dans un local', async () => {
    const created = await createItem(
      {
        code: 'MAC-01',
        nom: 'Machine à coudre Singer',
        categorie: 'materiel',
        type: 'Machine à coudre',
        local: 'Moulin Vert',
      },
      options,
    )
    assert.equal(created.categorie, 'materiel')
    assert.equal(created.local, 'moulin_vert')
    const loaded = await getItem(created.id, options)
    assert.equal(loaded.local, 'moulin_vert')
  })

  it('refuse un code en doublon', async () => {
    await createItem({ code: 'ECH-01', nom: 'Toile', categorie: 'echantillon' }, options)
    await assert.rejects(
      () => createItem({ code: 'ech-01', nom: 'Autre', categorie: 'echantillon' }, options),
      /existe déjà/,
    )
  })

  it('crée un emprunt puis un retour partiel', async () => {
    const jupe = await createItem(
      { code: 'JUP-01', nom: 'Jupe', categorie: 'piece_costume', disponibilite: 'Disponible' },
      options,
    )
    const gilet = await createItem(
      { code: 'GIL-01', nom: 'Gilet', categorie: 'piece_costume', disponibilite: 'Disponible' },
      options,
    )
    const person = await createPerson({ nom: 'Le Gall', prenom: 'Anna' }, options)
    const loan = await createLoan(
      {
        personId: person.id,
        items: [
          { itemId: jupe.id, comment: 'bon état' },
          { itemId: gilet.id, comment: '' },
        ],
      },
      options,
    )
    assert.equal(loan.statut, 'en_cours')
    assert.equal(loan.personName, 'Anna LE GALL')
    assert.equal((await getItem(jupe.id, options)).disponibilite, 'Emprunté')

    const partial = await returnLoanItems(loan.id, [jupe.id], { ...options, dateRetour: '2026-08-01' })
    assert.equal(partial.statut, 'retour_partiel')
    assert.equal(partial.items.find((line) => line.itemId === jupe.id).returnedAt, '2026-08-01')
    assert.equal((await getItem(jupe.id, options)).disponibilite, 'Disponible')
    assert.equal((await getItem(gilet.id, options)).disponibilite, 'Emprunté')

    const done = await returnLoanItems(loan.id, [], { ...options, dateRetour: '2026-08-15T18:00:00.000Z' })
    assert.equal(done.statut, 'retourne')
    assert.equal(done.items.find((line) => line.itemId === gilet.id).returnedAt, '2026-08-15')
    assert.equal(done.dateRetour, '2026-08-15')
    assert.equal((await getItem(gilet.id, options)).disponibilite, 'Disponible')
  })

  it('archive un emprunt passé sans bloquer les pièces', async () => {
    const jupe = await createItem(
      { code: 'JUP-ARC', nom: 'Jupe archive', categorie: 'piece_costume', disponibilite: 'Disponible' },
      options,
    )
    const person = await createPerson({ nom: 'Archive', prenom: 'Test' }, options)
    const loan = await createLoan(
      {
        personId: person.id,
        dateEmprunt: '2024-06-01',
        dateRetour: '2024-06-10',
        items: [{ itemId: jupe.id }],
      },
      options,
    )
    assert.equal(loan.statut, 'retourne')
    assert.equal(loan.dateEmprunt, '2024-06-01')
    assert.equal(loan.dateRetour, '2024-06-10')
    assert.equal(loan.items[0].returnedAt, '2024-06-10')
    assert.equal((await getItem(jupe.id, options)).disponibilite, 'Disponible')
  })

  it('modifie et annule un emprunt', async () => {
    const jupe = await createItem(
      { code: 'JUP-MNG', nom: 'Jupe manage', categorie: 'piece_costume', disponibilite: 'Disponible' },
      options,
    )
    const person = await createPerson({ nom: 'Manage', prenom: 'Loan' }, options)
    const loan = await createLoan(
      { personId: person.id, dateEmprunt: '2026-01-01', items: [{ itemId: jupe.id }] },
      options,
    )
    const updated = await updateLoan(
      loan.id,
      { titre: 'Emprunt corrigé', dateEmprunt: '2025-12-20', dateRetourPrevue: '2026-01-15' },
      options,
    )
    assert.equal(updated.titre, 'Emprunt corrigé')
    assert.equal(updated.dateEmprunt, '2025-12-20')
    assert.equal(updated.dateRetourPrevue, '2026-01-15')

    const closed = await updateLoan(loan.id, { dateRetour: '2026-01-10' }, options)
    assert.equal(closed.statut, 'retourne')
    assert.equal(closed.dateRetour, '2026-01-10')
    assert.equal((await getItem(jupe.id, options)).disponibilite, 'Disponible')

    const jupe2 = await createItem(
      { code: 'JUP-CAN', nom: 'Jupe cancel', categorie: 'piece_costume', disponibilite: 'Disponible' },
      options,
    )
    const openLoan = await createLoan({ personId: person.id, items: [{ itemId: jupe2.id }] }, options)
    await cancelLoan(openLoan.id, options)
    assert.equal((await getItem(jupe2.id, options)).disponibilite, 'Disponible')
  })

  it('refuse de supprimer une pièce empruntée', async () => {
    const item = await createItem(
      { code: 'TAB-01', nom: 'Tablier', categorie: 'piece_costume', disponibilite: 'Disponible' },
      options,
    )
    const person = await createPerson({ nom: 'Le Berre', prenom: 'Mikael' }, options)
    await createLoan({ personId: person.id, items: [{ itemId: item.id }] }, options)
    await assert.rejects(() => deleteItem(item.id, options), /empruntée/)
  })

  it('met à jour une pièce et lie deux fiches', async () => {
    const jupe = await createItem({ code: 'JUP-02', nom: 'Jupe', categorie: 'piece_costume' }, options)
    const tablier = await createItem({ code: 'TAB-02', nom: 'Tablier', categorie: 'piece_costume' }, options)
    await updateItem(jupe.id, { linkedItemIds: [tablier.id], couleurs: ['Noir'] }, options)
    const detail = await getItem(jupe.id, options)
    assert.deepEqual(detail.couleurs, ['Noir'])
    assert.equal(detail.linkedItems[0].id, tablier.id)
  })

  it('partage les photos via une fiche modèle', async () => {
    const master = await createItem(
      {
        code: 'CHAU-M',
        nom: 'Chaussure — visuel',
        categorie: 'piece_costume',
        type: 'Chaussure',
        images: [{ src: '/uploads/shoe.jpg', principale: true }],
      },
      options,
    )
    const variant = await createItem(
      {
        code: 'CHAU-38',
        nom: 'Chaussure 38',
        categorie: 'piece_costume',
        type: 'Chaussure',
        photoSourceId: master.id,
      },
      options,
    )
    const detail = await getItem(variant.id, options)
    assert.equal(detail.photoSource.id, master.id)
    await assert.rejects(() => deleteItem(master.id, options), /photos par défaut/)
  })

  it('importe un dump JSON complet', async () => {
    await importDb(
      {
        items: [{ id: 'a', code: 'TIS-01', nom: 'Toile de lin', categorie: 'tissu' }],
        people: [{ id: 'p1', nom: 'Sterenn' }],
        loans: [],
      },
      options,
    )
    const items = await listItems(options)
    assert.equal(items[0].code, 'TIS-01')
  })

  it('enregistre une photo dans le dossier uploads', async () => {
    const pixel =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    const saved = await saveUpload({ filename: 'face.png', dataUrl: pixel, prefix: 'JUP-014' }, options)
    assert.match(saved.src, /^\/uploads\/jup-014-/)
    assert.match(saved.src, /\.png$/)
    assert.equal(saved.mimeType, 'image/png')
  })

  it('enregistre un PDF dans le dossier uploads', async () => {
    const pdf = 'data:application/pdf;base64,JVBERi0xLjQK'
    const saved = await saveUpload({ filename: 'patron.pdf', dataUrl: pdf, prefix: 'ROB-001' }, options)
    assert.match(saved.src, /^\/uploads\/rob-001-/)
    assert.match(saved.src, /\.pdf$/)
    assert.equal(saved.mimeType, 'application/pdf')
  })

  it('refuse un type de fichier non pris en charge', async () => {
    const bad = 'data:text/plain;base64,dGVzdA=='
    await assert.rejects(
      () => saveUpload({ filename: 'notes.txt', dataUrl: bad, prefix: 'X' }, options),
      /non pris en charge/,
    )
  })

  it('connecte les comptes par défaut et refuse un mauvais mot de passe', async () => {
    const session = await login('admin', 'admin', options)
    assert.equal(session.user.role, 'admin')
    assert.ok(session.token)
    assert.ok(session.user.permissions.includes('items.create'))
    assert.ok(Array.isArray(session.items))
    assert.equal(typeof session.stats.totalItems, 'number')
    const boot = await getBootstrap(session.user, options)
    assert.equal(boot.items.length, session.items.length)
    await assert.rejects(() => login('admin', 'mauvais', options), /incorrect/)
  })

  it('crée un compte aux accès personnalisés', async () => {
    const user = await createUser(
      {
        login: 'marie',
        password: 'secret',
        nom: 'Marie',
        role: 'gestion',
        custom: true,
        permissions: ['items.read', 'items.create', 'loans.read'],
      },
      options,
    )
    assert.equal(user.custom, true)
    assert.ok(user.permissions.includes('items.create'))
    assert.ok(!user.permissions.includes('items.update'))
    assert.equal(user.passwordHash, undefined)
  })

  it('enregistre nom, prénom et plusieurs rôles', async () => {
    const person = await createPerson(
      {
        nom: 'Le Gall',
        prenom: 'Anna',
        roles: ['membre', 'danseur_enfant', 'couture'],
        anneeMembre: '2026',
      },
      options,
    )
    assert.equal(person.prenom, 'Anna')
    assert.equal(person.nom, 'LE GALL')
    assert.deepEqual(person.roles, ['membre', 'danseur_enfant', 'couture'])
    assert.equal(person.anneeMembre, '2026-2027')
    assert.deepEqual(person.saisons, ['2026-2027'])
  })

  it('regroupe l’historique d’emprunts d’une personne par année', async () => {
    const jupe = await createItem(
      { code: 'JUP-HIST', nom: 'Jupe', categorie: 'piece_costume', disponibilite: 'Disponible' },
      options,
    )
    const tablier = await createItem(
      { code: 'TAB-HIST', nom: 'Tablier', categorie: 'piece_costume', disponibilite: 'Disponible' },
      options,
    )
    const person = await createPerson(
      { nom: 'Le Gall', prenom: 'Anna', mesures: { tourTaille: 70, pointure: 38 } },
      options,
    )
    await createLoan(
      { personId: person.id, titre: 'Fest-noz', dateEmprunt: '2024-12-14', items: [{ itemId: tablier.id }] },
      options,
    )
    await createLoan(
      { personId: person.id, titre: 'Spectacle', dateEmprunt: '2026-07-20', items: [{ itemId: jupe.id }] },
      options,
    )
    const detail = await getPerson(person.id, options)
    assert.equal(detail.mesures.tourTaille, 70)
    assert.deepEqual(
      detail.loansByYear.map((group) => group.year),
      ['2026', '2024'],
    )
    assert.equal(detail.loansByYear[0].loans[0].titre, 'Spectacle')
  })

  it('déroule un emprunt réel : sortie, retour partiel daté, clôture', async () => {
    const jupe = await createItem(
      { code: 'JUP-WF', nom: 'Jupe', categorie: 'piece_costume', disponibilite: 'Disponible' },
      options,
    )
    const gilet = await createItem(
      { code: 'GIL-WF', nom: 'Gilet', categorie: 'piece_costume', disponibilite: 'Disponible' },
      options,
    )
    const person = await createPerson({ nom: 'Fonseca', prenom: 'Sterenn' }, options)
    const loan = await createLoan(
      {
        personId: person.id,
        titre: 'Répétition',
        items: [{ itemId: jupe.id }, { itemId: gilet.id }],
      },
      options,
    )
    assert.equal(loan.statut, 'en_cours')
    assert.match(loan.dateEmprunt, /^\d{4}-\d{2}-\d{2}$/)
    assert.equal((await getItem(jupe.id, options)).disponibilite, 'Emprunté')

    const partial = await returnLoanItems(loan.id, [jupe.id], { ...options, dateRetour: '2026-08-10' })
    assert.equal(partial.statut, 'retour_partiel')
    assert.equal(partial.items.find((line) => line.itemId === jupe.id).returnedAt, '2026-08-10')
    assert.equal((await getItem(jupe.id, options)).disponibilite, 'Disponible')
    assert.equal((await getItem(gilet.id, options)).disponibilite, 'Emprunté')

    const done = await returnLoanItems(loan.id, [], { ...options, dateRetour: '2026-08-15T22:00:00.000Z' })
    assert.equal(done.statut, 'retourne')
    assert.equal(done.dateRetour, '2026-08-15')
    assert.equal((await getLoan(loan.id, options)).items.every((line) => line.returnedAt), true)
    await assert.rejects(() => returnLoanItems(loan.id, [], options), /Aucune pièce/)
  })

  it('refuse un échantillon, un doublon, ou une pièce déjà sortie', async () => {
    const sample = await createItem(
      { code: 'ECH-WF', nom: 'Toile', categorie: 'echantillon', disponibilite: 'Disponible' },
      options,
    )
    const jupe = await createItem(
      { code: 'JUP-WF2', nom: 'Jupe', categorie: 'piece_costume', disponibilite: 'Disponible' },
      options,
    )
    const person = await createPerson({ nom: 'Prigent', prenom: 'Yann' }, options)
    await assert.rejects(
      () => createLoan({ personId: person.id, items: [{ itemId: sample.id }] }, options),
      /pas disponible/,
    )
    await createLoan({ personId: person.id, items: [{ itemId: jupe.id }] }, options)
    await assert.rejects(
      () => createLoan({ personId: person.id, items: [{ itemId: jupe.id }] }, options),
      /pas disponible/,
    )
    const gilet = await createItem(
      { code: 'GIL-WF2', nom: 'Gilet', categorie: 'piece_costume', disponibilite: 'Disponible' },
      options,
    )
    await assert.rejects(
      () =>
        createLoan(
          { personId: person.id, items: [{ itemId: gilet.id }, { itemId: gilet.id }] },
          options,
        ),
      /deux fois/,
    )
  })

  it('exporte sans sessions ni jetons de reset et conserve les comptes à l’import', async () => {
    await login('admin', 'admin', options)
    const dump = await exportDb(options)
    assert.deepEqual(dump.sessions, [])
    assert.deepEqual(dump.passwordResets, [])
    assert.ok(dump.users.length)
    const beforeUsers = dump.users.length
    await importDb({ items: [], people: [], loans: [] }, options)
    const after = await exportDb(options)
    assert.equal(after.users.length, beforeUsers)
    assert.deepEqual(after.sessions, [])
    assert.deepEqual(after.passwordResets, [])
  })

  it('expose et met à jour les listes de paramétrage', async () => {
    const session = await login('admin', 'admin', options)
    const boot = await getBootstrap(session.user, options)
    assert.ok(Array.isArray(boot.referentiels.categories))
    assert.ok(boot.referentiels.epoques.includes('1900'))

    const refs = await getReferentiels(options)
    const next = {
      ...refs,
      epoques: [...refs.epoques, '2000'],
    }
    const saved = await updateReferentiels(next, {
      ...options,
      actor: session.user,
    })
    assert.ok(saved.epoques.includes('2000'))
  })

  it('gère le stock des fournitures', async () => {
    const session = await login('admin', 'admin', options)
    const created = await createItem(
      {
        code: 'FOU-01',
        nom: 'Fil noir',
        categorie: 'fourniture',
        type: 'Fil',
        stockQuantite: 10,
        stockSeuil: 3,
        stockUnite: 'bobine',
      },
      { ...options, actor: session.user },
    )
    assert.equal(created.disponibilite, 'En stock')

    const adjusted = await adjustStock(
      created.id,
      { delta: -8, motif: 'Costumes 2026' },
      { ...options, actor: session.user },
    )
    assert.equal(adjusted.stockQuantite, 2)
    assert.equal(adjusted.disponibilite, 'Stock bas')
    assert.equal(adjusted.stockMouvements.length, 1)
  })

  it('gère la quantité restante des tissus', async () => {
    const session = await login('admin', 'admin', options)
    const created = await createItem(
      {
        code: 'TIS-WF',
        nom: 'Toile écrue',
        categorie: 'tissu',
        type: 'Toile',
        metrage: 6,
        stockSeuil: 2,
      },
      { ...options, actor: session.user },
    )
    assert.equal(created.stockQuantite, 6)
    assert.equal(created.stockUnite, 'm')
    assert.equal(created.disponibilite, 'Disponible')

    const adjusted = await adjustStock(
      created.id,
      { delta: -5, motif: 'Tablier' },
      { ...options, actor: session.user },
    )
    assert.equal(adjusted.stockQuantite, 1)
    assert.equal(adjusted.disponibilite, 'Stock bas')
    assert.equal(adjusted.metrage, 1)
  })

  it('enregistre créations, modifications et retours dans le journal d’audit', async () => {
    const session = await login('admin', 'admin', options)
    const actor = session.user
    const item = await createItem(
      { code: 'AUD-01', nom: 'Robe', categorie: 'piece_costume', type: 'Robe', disponibilite: 'Disponible' },
      { ...options, actor },
    )
    const person = await createPerson({ nom: 'Audit', prenom: 'Test' }, { ...options, actor })
    const loan = await createLoan(
      { personId: person.id, titre: 'Spectacle test', items: [{ itemId: item.id }] },
      { ...options, actor },
    )
    await updateItem(item.id, { nom: 'Robe bleue' }, { ...options, actor })
    await returnLoanItems(loan.id, [], { ...options, actor, dateRetour: '2026-08-17' })

    const audit = await listAudit({}, options)
    assert.ok(audit.total >= 5)
    const actions = audit.entries.map((entry) => entry.action)
    assert.ok(actions.includes('item.create'))
    assert.ok(actions.includes('item.update'))
    assert.ok(actions.includes('person.create'))
    assert.ok(actions.includes('loan.create'))
    assert.ok(actions.includes('loan.return_all'))
    assert.equal(audit.entries.find((entry) => entry.action === 'loan.create')?.actor.login, 'admin')
  })

  it('vide le journal d’activité', async () => {
    const session = await login('admin', 'admin', options)
    await createPerson({ nom: 'Journal', prenom: 'Test' }, { ...options, actor: session.user })
    const before = await listAudit({}, options)
    assert.ok(before.total >= 1)
    const result = await clearAudit({ ...options, actor: session.user })
    assert.ok(result.cleared >= 1)
    const after = await listAudit({}, options)
    assert.equal(after.total, 1)
    assert.equal(after.entries[0].action, 'audit.clear')
  })

  it('modifie un événement local et enregistre une présence', async () => {
    const created = await createEvent(
      {
        type: 'sortie',
        titre: 'Fest-noz test',
        debut: '2026-09-01T18:00:00.000Z',
        lieu: 'Quimper',
        inscriptionsOuvertes: true,
      },
      options,
    )
    const updated = await updateEvent(created.id, { titre: 'Fest-noz KAMG', lieu: 'Moulin Vert' }, options)
    assert.equal(updated.titre, 'Fest-noz KAMG')
    const loaded = await getEvent(created.id, options)
    assert.equal(loaded.lieu, 'Moulin Vert')
    assert.equal(loaded.inscriptionsOuvertes, true)

    const person = await createPerson({ nom: 'Le Gall', prenom: 'Anna', roles: ['danseur_concours'] }, options)
    const presence = await setEventPresence(created.id, { personId: person.id, statut: '1' }, options)
    assert.equal(presence.statut, 'present')
    assert.equal((await listPresences(options)).length, 1)
    const cleared = await setEventPresence(created.id, { personId: person.id, statut: '' }, options)
    assert.equal(cleared.deleted, true)
    assert.equal((await listPresences(options)).length, 0)
  })

  it('importe Google une fois puis gère tout le CRUD en local', async () => {
    const sampleIcs = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20260910T163000Z
DTEND:20260910T173000Z
UID:import-test@google.com
SUMMARY:Répétition importée
LOCATION:Moulin Vert
END:VEVENT
END:VCALENDAR`

    const first = await importGoogleCalendarEvents({
      ...options,
      ttlMs: 0,
      fetchImpl: async () => ({ ok: true, text: async () => sampleIcs }),
    })
    assert.equal(first.imported, 1)
    const events = await listEvents(options)
    assert.equal(events.length, 1)
    assert.equal(events[0].source, 'local')
    assert.equal(events[0].titre, 'Répétition importée')

    const updated = await updateEvent(
      events[0].id,
      { titre: 'Répétition KAMG', debut: '2026-09-10T18:00:00.000Z', lieu: 'Quimper' },
      options,
    )
    assert.equal(updated.titre, 'Répétition KAMG')
    assert.equal(updated.debut, '2026-09-10T18:00:00.000Z')
    assert.equal(updated.lieu, 'Quimper')

    const second = await importGoogleCalendarEvents({
      ...options,
      ttlMs: 0,
      fetchImpl: async () => ({ ok: true, text: async () => sampleIcs }),
    })
    assert.equal(second.imported, 0)
    assert.equal(second.skipped, 1)
    const afterReimport = await getEvent(events[0].id, options)
    assert.equal(afterReimport.titre, 'Répétition KAMG')
    assert.equal(afterReimport.debut, '2026-09-10T18:00:00.000Z')

    const ics = await getPublicCalendarIcs(options)
    assert.match(ics, /SUMMARY:Répétition KAMG/)
    assert.match(ics, /UID:import-test@google.com/)
    assert.match(ics, /LOCATION:Quimper/)

    const removed = await deleteEvent(events[0].id, options)
    assert.equal(removed.deleted, true)
    assert.equal((await listEvents(options)).length, 0)
    assert.doesNotMatch(await getPublicCalendarIcs(options), /Répétition KAMG/)
  })

  it('hash le jeton de reset, coupe les sessions, et refuse un lien expiré', async () => {
    const { hashToken } = await import('./password.js')
    const session = await login('admin', 'admin', options)
    const asked = await requestPasswordReset('admin', {
      origin: 'http://kamg.test',
      includeUrl: true,
      ...options,
    })
    const token = new URL(asked.resetUrl).searchParams.get('token')
    const stored = (await readDb(options)).passwordResets
    assert.equal(stored.length, 1)
    assert.equal(stored[0].token, undefined)
    assert.equal(stored[0].tokenHash, hashToken(token))

    await resetPassword(token, 'nouveaumdp', options)
    assert.equal(await userFromToken(session.token, options), null)
    await assert.rejects(() => login('admin', 'admin', options), /incorrect/)
    assert.ok((await login('admin', 'nouveaumdp', options)).token)
  })

  it('désactive un compte : plus de session, plus de lien de reset', async () => {
    const created = await createUser(
      { login: 'lea', password: 'motdepasse', nom: 'Léa', role: 'lecteur' },
      options,
    )
    const session = await login('lea', 'motdepasse', options)
    await updateUser(created.id, { status: 'disabled' }, options)
    assert.equal(await userFromToken(session.token, options), null)
    await assert.rejects(() => login('lea', 'motdepasse', options), /désactivé/)
    await assert.rejects(
      () => createPasswordResetLink(created.id, { origin: 'http://kamg.test', ...options }),
      /désactivé/,
    )
  })

  it('refuse un jeton de reset expiré', async () => {
    const created = await createUser(
      { login: 'yan', password: 'motdepasse', nom: 'Yan', role: 'lecteur' },
      options,
    )
    const link = await createPasswordResetLink(created.id, { origin: 'http://kamg.test', ...options })
    const token = new URL(link.url).searchParams.get('token')
    const db = await readDb(options)
    db.passwordResets[0].expiresAt = new Date(Date.now() - 1000).toISOString()
    await writeDb(db, options)
    await assert.rejects(() => resetPassword(token, 'nouveaumdp', options), /invalide/)
  })

  it('crée des répétitions récurrentes indépendantes', async () => {
    const start = new Date(2026, 8, 4, 18, 0, 0).toISOString()
    const end = new Date(2026, 8, 4, 20, 0, 0).toISOString()
    const created = await createEvent(
      {
        kinds: ['repetition_ado'],
        titre: 'Salle',
        debut: start,
        fin: end,
        recurrence: { freq: 'weekly', until: '2026-09-18' },
      },
      options,
    )
    assert.equal(created.createdCount, 3)
    const events = (await listEvents(options)).filter((event) => event.kinds.includes('repetition_ado'))
    assert.equal(events.length, 3)
    assert.ok(events.every((event) => !event.recurrence))
    const updated = await updateEvent(created.id, { lieu: 'Moulin Vert' }, options)
    assert.equal(updated.lieu, 'Moulin Vert')
    const others = events.filter((event) => event.id !== created.id)
    assert.ok(others.every((event) => !event.lieu))
  })

  it('saute les dates exclues d’une récurrence d’atelier', async () => {
    const start = new Date(2026, 8, 4, 18, 0, 0).toISOString()
    const skipDay = todayLocal(new Date(2026, 8, 11, 18, 0, 0))
    const created = await createEvent(
      {
        kinds: ['atelier_couture'],
        titre: 'Local FLG',
        debut: start,
        recurrence: { freq: 'weekly', until: '2026-09-18', except: [skipDay] },
      },
      options,
    )
    assert.equal(created.createdCount, 2)
    const events = (await listEvents(options)).filter((event) => event.kinds.includes('atelier_couture'))
    assert.equal(events.length, 2)
    assert.ok(!events.some((event) => todayLocal(new Date(event.debut)) === skipDay))
  })

  it('filtre les emprunts du groupe du membre', async () => {
    const jupe = await createItem(
      { code: 'JUP-ADO', nom: 'Jupe ado', categorie: 'piece_costume', disponibilite: 'Disponible' },
      options,
    )
    const gilet = await createItem(
      { code: 'GIL-CON', nom: 'Gilet concours', categorie: 'piece_costume', disponibilite: 'Disponible' },
      options,
    )
    const ado = await createPerson({ nom: 'Ado', prenom: 'Léa', roles: ['danseur_ado'] }, options)
    const concours = await createPerson(
      { nom: 'Concours', prenom: 'Yan', roles: ['danseur_concours'] },
      options,
    )
    await createLoan({ personId: ado.id, items: [{ itemId: jupe.id }] }, options)
    await createLoan({ personId: concours.id, items: [{ itemId: gilet.id }] }, options)
    const user = await createUser(
      { login: 'lea-membre', password: 'motdepasse', nom: 'Léa', role: 'membre', personIds: [ado.id] },
      options,
    )
    const space = await getMemberSpace(user, options)
    assert.equal(space.loans.length, 1)
    assert.equal(space.loans[0].personId, ado.id)
    assert.equal(space.selfLoans.length, 1)
    assert.equal(space.selfLoans[0].personId, ado.id)
  })

  it('enregistre un chèque de caution et un retour prévu facultatif', async () => {
    const jupe = await createItem(
      { code: 'JUP-CAUTION', nom: 'Jupe caution', categorie: 'piece_costume', disponibilite: 'Disponible' },
      options,
    )
    const person = await createPerson({ nom: 'Caution', prenom: 'Anna' }, options)
    const loan = await createLoan(
      {
        personId: person.id,
        items: [{ itemId: jupe.id }],
        chequeCaution: true,
        nomChequeCaution: 'Anna Caution',
        dateRetourPrevue: '',
      },
      options,
    )
    assert.equal(loan.chequeCaution, true)
    assert.equal(loan.nomChequeCaution, 'Anna Caution')
    assert.equal(loan.dateRetourPrevue, '')
    const cleared = await updateLoan(loan.id, { chequeCaution: false, nomChequeCaution: 'ignoré' }, options)
    assert.equal(cleared.chequeCaution, false)
    assert.equal(cleared.nomChequeCaution, '')
  })

  it('autorise un membre à mettre à jour uniquement sa fiche liée', async () => {
    const person = await createPerson({ nom: 'Profil', prenom: 'Léa' }, options)
    const other = await createPerson({ nom: 'Autre', prenom: 'Yan' }, options)
    const user = await createUser(
      {
        login: 'lea-profil',
        password: 'motdepasse',
        nom: 'Léa',
        role: 'membre',
        personIds: [person.id],
      },
      options,
    )
    await assert.rejects(
      () => updateMemberProfile(user, other.id, { noteAtelier: 'non' }, options),
      /liée/,
    )
    const updated = await updateMemberProfile(
      user,
      person.id,
      {
        noteAtelier: 'Housse au local FLG',
        tailleLettre: 'M',
        bio: 'Danse depuis 2019.',
        nomUsage: 'Martin',
      },
      options,
    )
    assert.equal(updated.noteAtelier, 'Housse au local FLG')
    assert.equal(updated.tailleLettre, 'M')
    assert.equal(updated.bio, 'Danse depuis 2019.')
    assert.equal(updated.nomUsage, 'MARTIN')
    const space = await getMemberSpace(user, options)
    assert.equal(space.profiles[0].noteAtelier, 'Housse au local FLG')
    assert.equal(space.profiles[0].bio, 'Danse depuis 2019.')
    assert.equal(space.profiles[0].nomUsage, 'MARTIN')
    assert.equal(space.people.find((entry) => entry.id === person.id)?.bio, 'Danse depuis 2019.')
    assert.equal(space.people.find((entry) => entry.id === person.id)?.nomUsage, 'MARTIN')
  })

  it('copie l’e-mail du compte sur la fiche au rangement', async () => {
    const person = await createPerson({ nom: 'Le Gall', prenom: 'Léa', roles: ['danseur_ado'] }, options)
    assert.equal(person.email, '')
    const signup = await registerMember(
      {
        prenom: 'Léa',
        nom: 'Le Gall',
        email: 'lea.fiche@cercle.test',
        password: 'motdepasse',
        relation: 'danseur',
      },
      options,
    )
    await placeMember(signup.user.id, { personIds: [person.id] }, options)
    const linked = await getPerson(person.id, options)
    assert.equal(linked.email, 'lea.fiche@cercle.test')
  })

  it('copie l’e-mail du compte quand on lie une fiche ensuite', async () => {
    const person = await createPerson(
      { nom: 'Prigent', prenom: 'Yan', email: 'ancien@cercle.test', roles: ['danseur_concours'] },
      options,
    )
    const user = await createUser(
      {
        login: 'yan.lien@cercle.test',
        password: 'motdepasse',
        nom: 'Yan',
        role: 'membre',
        email: 'yan.lien@cercle.test',
      },
      options,
    )
    await updateUser(user.id, { personIds: [person.id] }, options)
    const linked = await getPerson(person.id, options)
    assert.equal(linked.email, 'yan.lien@cercle.test')
  })

  it('interdit à un accès sorties libres de créer une répétition officielle', async () => {
    const actor = await createUser(
      {
        login: 'sortie-libre',
        password: 'motdepasse',
        nom: 'Libre',
        role: 'membre',
        custom: true,
        permissions: ['agenda.libre'],
      },
      options,
    )
    await assert.rejects(
      () =>
        createEvent(
          {
            kinds: ['repetition_ado'],
            titre: 'Salle',
            debut: '2026-09-04T18:00:00.000Z',
          },
          { ...options, actor },
        ),
      /non officielles/,
    )
    const created = await createEvent(
      {
        kinds: ['fest_noz'],
        horsCercle: true,
        titre: 'Fest-noz copains',
        debut: '2026-09-12T21:00:00.000Z',
      },
      { ...options, actor },
    )
    assert.equal(created.horsCercle, true)
    assert.ok(created.kinds.includes('fest_noz'))
  })

  it('refuse le sondage hors des groupes concernés', async () => {
    const event = await createEvent(
      {
        kinds: ['sortie'],
        groupes: ['ado', 'tremplin'],
        titre: 'Sortie ado',
        debut: '2026-10-01T18:00:00.000Z',
        inscriptionsOuvertes: true,
      },
      options,
    )
    const ado = await createPerson({ nom: 'Ado', prenom: 'Léa', roles: ['danseur_ado'] }, options)
    const concours = await createPerson(
      { nom: 'Concours', prenom: 'Yan', roles: ['danseur_concours'] },
      options,
    )
    const ok = await setEventPresence(event.id, { personId: ado.id, statut: '1' }, options)
    assert.equal(ok.statut, 'present')
    await assert.rejects(
      () => setEventPresence(event.id, { personId: concours.id, statut: '1' }, options),
      /concerné/,
    )
  })
})
