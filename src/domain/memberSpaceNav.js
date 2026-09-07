export function memberSpaceQuery(tab, currentQuery = {}, extra = {}) {
  if (!tab || tab === 'moi') return null
  const query = { ...currentQuery, ...extra, onglet: tab }
  if (tab !== 'agenda') delete query.inscriptions
  if (tab !== 'infos') {
    delete query.article
    delete query.categorie
  }
  return query
}
