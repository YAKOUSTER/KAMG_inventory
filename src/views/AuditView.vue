<template>
  <div>
    <div class="d-flex flex-wrap align-center ga-3 page-header">
      <h1 class="text-h4 page-title">Journal d’activité</h1>
      <v-spacer />
      <span v-if="total" class="text-body-2 text-medium-emphasis">{{ total }} action(s)</span>
    </div>

    <p class="text-body-2 text-medium-emphasis mb-6">
      Dernières créations, modifications, emprunts et retours, avec l’utilisateur concerné.
    </p>

    <div class="d-flex flex-wrap ga-3 mb-6">
      <v-select
        v-model="filterAction"
        :items="actionItems"
        item-title="label"
        item-value="id"
        label="Type d’action"
        hide-details
        clearable
        style="min-width: 220px"
        @update:model-value="load"
      />
      <v-select
        v-model="filterEntity"
        :items="entityItems"
        item-title="label"
        item-value="id"
        label="Type de fiche"
        hide-details
        clearable
        style="min-width: 200px"
        @update:model-value="load"
      />
      <v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="load">Actualiser</v-btn>
      <v-btn
        v-if="auth.can('audit.manage')"
        variant="tonal"
        color="error"
        prepend-icon="mdi-delete-sweep"
        :loading="clearing"
        @click="clearJournal"
      >
        Vider le journal
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>

    <v-progress-linear v-if="loading && !entries.length" color="primary" indeterminate class="mb-4" />

    <div v-if="entries.length" class="audit-list">
      <article v-for="entry in entries" :key="entry.id" class="audit-entry">
        <div class="audit-entry__when">{{ displayDateTime(entry.at) }}</div>
        <div class="audit-entry__body">
          <div class="audit-entry__summary">{{ entry.summary }}</div>
          <div class="audit-entry__meta text-body-2 text-medium-emphasis">
            <span>{{ auditActionLabel(entry.action) }}</span>
            <span v-if="entry.actor"> · {{ entry.actor.nom || entry.actor.login }}</span>
            <span v-if="entry.meta?.itemCodes?.length"> · {{ entry.meta.itemCodes.join(', ') }}</span>
          </div>
          <router-link
            v-if="auditEntityRoute(entry)"
            :to="auditEntityRoute(entry)"
            class="audit-entry__link"
          >
            {{ entry.entityLabel }}
          </router-link>
          <span v-else-if="entry.entityLabel" class="audit-entry__label">{{ entry.entityLabel }}</span>
        </div>
      </article>
    </div>

    <p v-else-if="!loading" class="text-medium-emphasis">Aucune action enregistrée pour le moment.</p>

    <v-btn
      v-if="entries.length < total"
      variant="text"
      class="mt-4"
      :loading="loadingMore"
      @click="loadMore"
    >
      Afficher plus
    </v-btn>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { api } from '@/services/api'
import { AUDIT_ACTIONS, auditActionLabel, auditEntityRoute } from '@/domain/audit'
import { displayDateTime } from '@/domain/dates'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const entries = ref([])
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const clearing = ref(false)
const error = ref('')
const filterAction = ref(null)
const filterEntity = ref(null)
const limit = 50

const actionItems = AUDIT_ACTIONS.map((a) => ({ id: a.id, label: a.label }))
const entityItems = [
  { id: 'item', label: 'Pièces' },
  { id: 'person', label: 'Personnes' },
  { id: 'loan', label: 'Emprunts' },
  { id: 'user', label: 'Comptes' },
  { id: 'db', label: 'Base JSON' },
]

async function fetchAudit(offset = 0) {
  return api.audit({
    limit,
    offset,
    action: filterAction.value || undefined,
    entityType: filterEntity.value || undefined,
  })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchAudit(0)
    entries.value = data.entries || []
    total.value = data.total || 0
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  loadingMore.value = true
  try {
    const data = await fetchAudit(entries.value.length)
    entries.value = [...entries.value, ...(data.entries || [])]
    total.value = data.total || total.value
  } catch (err) {
    error.value = err.message
  } finally {
    loadingMore.value = false
  }
}

async function clearJournal() {
  if (!confirm('Vider tout le journal d’activité ? Cette action est irréversible.')) return
  clearing.value = true
  error.value = ''
  try {
    await api.clearAudit()
    await load()
  } catch (err) {
    error.value = err.message
  } finally {
    clearing.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.audit-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.audit-entry {
  display: grid;
  grid-template-columns: minmax(8.5rem, 10rem) 1fr;
  gap: 1rem 1.5rem;
  padding: 1rem 0;
  border-bottom: 1px solid rgba(83, 115, 106, 0.14);
}

.audit-entry:first-child {
  padding-top: 0.25rem;
}

.audit-entry__when {
  font-size: 0.88rem;
  color: rgba(44, 51, 44, 0.62);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.audit-entry__summary {
  font-weight: 600;
  line-height: 1.45;
  margin-bottom: 0.2rem;
}

.audit-entry__link {
  display: inline-block;
  margin-top: 0.35rem;
  color: #53736a;
  text-decoration: none;
  font-size: 0.92rem;
}

.audit-entry__link:hover {
  text-decoration: underline;
}

.audit-entry__label {
  display: inline-block;
  margin-top: 0.35rem;
  font-size: 0.92rem;
}

@media (max-width: 600px) {
  .audit-entry {
    grid-template-columns: 1fr;
    gap: 0.35rem;
  }
}
</style>
