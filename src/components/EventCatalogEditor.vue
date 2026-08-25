<template>
  <section class="page-block kamg-fiche">
    <h2 class="kamg-banner">Agenda : types et groupes</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Ces listes alimentent l’agenda, les filtres membres et les abonnements calendrier. Les identifiants
      techniques restent stables : vous changez surtout les noms affichés.
    </p>

    <h3 class="text-subtitle-2 mb-2">Types d’événement</h3>
    <div v-for="(kind, index) in draft.kinds" :key="kind.id" class="catalog-row">
      <div class="text-caption text-medium-emphasis mb-1">{{ kind.id }}</div>
      <div class="d-flex flex-wrap ga-2 align-start">
        <v-text-field v-model="kind.label" label="Nom affiché" density="compact" hide-details class="flex-grow-1" />
        <v-text-field v-model="kind.prefix" label="Préfixe du titre" density="compact" hide-details class="flex-grow-1" />
        <v-btn
          icon
          variant="text"
          color="error"
          :disabled="kind.builtin"
          :aria-label="`Supprimer ${kind.label}`"
          @click="draft.kinds.splice(index, 1)"
        >
          <v-icon>mdi-delete-outline</v-icon>
        </v-btn>
      </div>
    </div>
    <div class="d-flex ga-2 mt-3 mb-6">
      <v-text-field
        v-model="newKindLabel"
        label="Nouveau type"
        density="compact"
        hide-details
        class="flex-grow-1"
        @keyup.enter="addKind"
      />
      <v-btn color="primary" variant="tonal" :disabled="!newKindLabel.trim()" @click="addKind">Ajouter</v-btn>
    </div>

    <h3 class="text-subtitle-2 mb-2">Noms des groupes</h3>
    <p class="text-caption text-medium-emphasis mb-3">
      Exemple : Groupe tremplin, Groupe ado, Groupe concours… Ces noms apparaissent dans l’espace membres
      et pour s’abonner à un calendrier filtré.
    </p>
    <div v-for="(group, index) in draft.groups" :key="group.id" class="catalog-row">
      <div class="text-caption text-medium-emphasis mb-1">{{ group.id }}</div>
      <div class="d-flex flex-wrap ga-2 align-start">
        <v-text-field v-model="group.label" label="Nom du groupe" density="compact" hide-details class="flex-grow-1" />
        <v-btn
          icon
          variant="text"
          color="error"
          :disabled="group.builtin || group.id === 'tous'"
          :aria-label="`Supprimer ${group.label}`"
          @click="draft.groups.splice(index, 1)"
        >
          <v-icon>mdi-delete-outline</v-icon>
        </v-btn>
      </div>
    </div>
    <div class="d-flex ga-2 mt-3">
      <v-text-field
        v-model="newGroupLabel"
        label="Nouveau groupe"
        density="compact"
        hide-details
        class="flex-grow-1"
        @keyup.enter="addGroup"
      />
      <v-btn color="primary" variant="tonal" :disabled="!newGroupLabel.trim()" @click="addGroup">Ajouter</v-btn>
    </div>

    <v-alert v-if="message" :type="ok ? 'success' : 'error'" class="mt-4" density="compact">{{ message }}</v-alert>
    <div class="d-flex ga-3 mt-4">
      <v-btn variant="text" @click="resetDraft">Annuler</v-btn>
      <v-spacer />
      <v-btn color="primary" :loading="saving" @click="save">Enregistrer types et groupes</v-btn>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { api } from '@/services/api'
import { applyEventCatalog, normalizeEventCatalog, slugCatalogId } from '@/domain/eventCatalog'
import { useInventoryStore } from '@/stores/inventory'

const inventory = useInventoryStore()
const draft = reactive(normalizeEventCatalog())
const newKindLabel = ref('')
const newGroupLabel = ref('')
const saving = ref(false)
const message = ref('')
const ok = ref(false)

function assignDraft(catalog) {
  const next = normalizeEventCatalog(catalog)
  draft.kinds = next.kinds
  draft.groups = next.groups
}

function resetDraft() {
  assignDraft(inventory.eventCatalog)
}

function addKind() {
  const label = newKindLabel.value.trim()
  if (!label) return
  const id = slugCatalogId(label, 'type')
  if (draft.kinds.some((kind) => kind.id === id)) return
  draft.kinds.push({
    id,
    label,
    family: 'autre',
    prefix: '',
    groupes: [],
    color: 'secondary',
    builtin: false,
  })
  newKindLabel.value = ''
}

function addGroup() {
  const label = newGroupLabel.value.trim()
  if (!label) return
  const id = slugCatalogId(label, 'groupe')
  if (draft.groups.some((group) => group.id === id)) return
  draft.groups.push({
    id,
    label,
    icon: 'mdi-account-group-outline',
    builtin: false,
  })
  newGroupLabel.value = ''
}

async function save() {
  saving.value = true
  message.value = ''
  try {
    const saved = await api.updateEventCatalog({ kinds: draft.kinds, groups: draft.groups })
    inventory.eventCatalog = saved
    applyEventCatalog(saved)
    assignDraft(saved)
    ok.value = true
    message.value = 'Types et groupes enregistrés.'
  } catch (error) {
    ok.value = false
    message.value = error.message || 'Enregistrement impossible.'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const catalog = inventory.eventCatalog || (await api.eventCatalog())
    inventory.eventCatalog = catalog
    applyEventCatalog(catalog)
    assignDraft(catalog)
  } catch {
    resetDraft()
  }
})
</script>

<style scoped>
.catalog-row + .catalog-row {
  margin-top: 12px;
}
</style>
