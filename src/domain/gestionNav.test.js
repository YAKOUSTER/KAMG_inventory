import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  canAccessGestion,
  gestionAreaForPath,
  gestionHomePath,
  linkMatchesPath,
  toolbarLinksForArea,
  visibleGestionAreas,
} from './gestionNav.js'

const admin = { role: 'admin' }
const membre = { role: 'membre', permissions: [], custom: true }
const lecteur = { role: 'lecteur' }

describe('navigation gestion', () => {
  it('regroupe costume, calendrier, membres et infos', () => {
    const areas = visibleGestionAreas(admin)
    assert.deepEqual(
      areas.map((area) => area.id),
      ['costume', 'calendrier', 'membres', 'infos'],
    )
    assert.deepEqual(
      areas.map((area) => area.fullTitle),
      ['Gestion costume', 'Gestion calendrier', 'Membres et invités', 'Newsletters / Infos'],
    )
    assert.deepEqual(
      areas.find((area) => area.id === 'costume').links.map((link) => link.title),
      ['Accueil', 'Inventaire', 'Emprunts', 'Panier'],
    )
    assert.deepEqual(
      toolbarLinksForArea(areas.find((area) => area.id === 'costume')).map((link) => link.title),
      ['Accueil', 'Inventaire', 'Emprunts'],
    )
    assert.deepEqual(
      areas.find((area) => area.id === 'membres').links.map((link) => link.title),
      ['Personnes', 'À ranger'],
    )
    assert.equal(canAccessGestion(admin), true)
  })

  it('cache une partie si le compte n’y a pas accès', () => {
    const areas = visibleGestionAreas(lecteur)
    assert.ok(areas.some((area) => area.id === 'costume'))
    assert.ok(areas.some((area) => area.id === 'calendrier'))
    assert.ok(areas.some((area) => area.id === 'membres'))
    assert.ok(!areas.find((area) => area.id === 'membres')?.links.some((link) => link.to === '/gestion/a-ranger'))
    assert.equal(canAccessGestion(membre), false)
    assert.equal(canAccessGestion(lecteur), true)
  })

  it('montre le calendrier à un accès sorties non officielles uniquement', () => {
    const libre = { role: 'membre', custom: true, permissions: ['agenda.libre'] }
    const areas = visibleGestionAreas(libre)
    assert.deepEqual(
      areas.map((area) => area.id),
      ['calendrier'],
    )
    assert.equal(gestionHomePath(libre), '/gestion/agenda')
    assert.equal(canAccessGestion(libre), true)
  })

  it('reconnaît la partie d’après l’URL', () => {
    assert.equal(gestionAreaForPath('/gestion/pieces/abc', admin)?.id, 'costume')
    assert.equal(gestionAreaForPath('/gestion/emprunts/1', admin)?.id, 'costume')
    assert.equal(gestionAreaForPath('/gestion/panier', admin)?.id, 'costume')
    assert.equal(gestionAreaForPath('/gestion/agenda/nouveau', admin)?.id, 'calendrier')
    assert.equal(gestionAreaForPath('/gestion/a-ranger', admin)?.id, 'membres')
    assert.equal(gestionAreaForPath('/gestion/contenus/nouveau', admin)?.id, 'infos')
    assert.equal(gestionAreaForPath('/gestion/utilisateurs', admin), null)
    assert.equal(linkMatchesPath({ to: '/gestion', exact: true }, '/gestion/inventaire'), false)
    assert.equal(linkMatchesPath({ to: '/gestion', exact: true }, '/gestion'), true)
  })
})
