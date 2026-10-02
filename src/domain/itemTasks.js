export const ACTION_PRESETS = [
  'À laver',
  'À réparer',
  'Recoudre un bouton',
  'Recoudre un ourlet',
  'Remplacer une fermeture',
  'Repasser',
  'Autre',
]

function newTaskId() {
  return globalThis.crypto?.randomUUID?.() ?? `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function normalizeTask(entry = {}, index = 0) {
  if (!entry) return null
  const text = String(entry.text || entry.label || '').trim()
  if (!text) return null
  return {
    id: entry.id || `task-${index}`,
    text,
    createdAt: entry.createdAt || new Date().toISOString(),
    doneAt: entry.doneAt || null,
    loanId: entry.loanId || null,
  }
}

export function normalizeTasks(tasks = []) {
  return (Array.isArray(tasks) ? tasks : [])
    .map(normalizeTask)
    .filter(Boolean)
    .slice(0, 50)
}

export function openTasks(item) {
  return normalizeTasks(item?.aFaire).filter((task) => !task.doneAt)
}

export function addTasks(item, texts = [], { loanId, now } = {}) {
  const stamp = now || new Date().toISOString()
  const existing = normalizeTasks(item.aFaire)
  const added = texts
    .map((text) => String(text || '').trim())
    .filter(Boolean)
    .map((text) =>
      normalizeTask({
        id: newTaskId(),
        text,
        createdAt: stamp,
        loanId: loanId || null,
      }),
    )
  item.aFaire = [...existing, ...added].slice(0, 50)
  return added.length
}

export function completeTask(item, taskId, now) {
  const stamp = now || new Date().toISOString()
  item.aFaire = normalizeTasks(item.aFaire).map((task) =>
    task.id === taskId && !task.doneAt ? { ...task, doneAt: stamp } : task,
  )
}

export function appendDescription(item, note) {
  const text = String(note || '').trim()
  if (!text) return
  const stamp = new Date().toISOString().slice(0, 10)
  const block = `[Retour ${stamp}] ${text}`
  item.description = item.description?.trim() ? `${item.description.trim()}\n${block}` : block
}

export function syncDisponibiliteAfterReturn(item) {
  if (openTasks(item).length) {
    item.disponibilite = 'En restauration'
  } else if (item.propre === false) {
    item.disponibilite = 'Au pressing'
  } else {
    item.disponibilite = 'Disponible'
  }
}

export function applyReturnUpdate(item, update = {}, { loanId, defaultPersonId } = {}) {
  if (!item || !update) return item

  if (update.etat != null && String(update.etat).trim()) {
    item.etat = String(update.etat).trim()
  }

  if (update.propre != null && update.propre !== '') {
    item.propre = Boolean(update.propre)
  }

  if (item.propre === false) {
    const payer = update.pressingPayePar === 'cercle' ? 'cercle' : update.pressingPayePar === 'personne' ? 'personne' : ''
    item.pressingPayePar = payer
    item.pressingPayeParPersonId =
      payer === 'personne' ? String(update.pressingPayeParPersonId || defaultPersonId || '').trim() : ''
  } else if (item.propre === true) {
    item.pressingPayePar = ''
    item.pressingPayeParPersonId = ''
  }

  appendDescription(item, update.descriptionAppend)
  addTasks(item, update.aFaire || [], { loanId })
  syncDisponibiliteAfterReturn(item)
  return item
}

export function itemsWithOpenTasks(items = []) {
  return items
    .map((item) => ({ item, tasks: openTasks(item) }))
    .filter((entry) => entry.tasks.length)
}

export function countOpenTasks(items = []) {
  return itemsWithOpenTasks(items).reduce((sum, entry) => sum + entry.tasks.length, 0)
}

export function normalizeItemCareFields(item) {
  item.propre = item.propre == null || item.propre === '' ? null : Boolean(item.propre)
  item.pressingPayePar = ['cercle', 'personne'].includes(item.pressingPayePar) ? item.pressingPayePar : ''
  item.pressingPayeParPersonId = String(item.pressingPayeParPersonId || '').trim()
  item.aFaire = normalizeTasks(item.aFaire)
  return item
}
