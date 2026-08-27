<template>
  <div>
    <div class="d-flex flex-wrap align-center ga-3 page-header">
      <h1 class="text-h5 text-md-h4 page-title">Contenus membres</h1>
      <v-spacer />
      <v-btn v-if="auth.can('content.write')" color="primary" to="/gestion/contenus/nouveau" prepend-icon="mdi-plus">
        Ajouter
      </v-btn>
    </div>

    <v-row class="mb-4">
      <v-col cols="12" md="4">
        <v-select v-model="categoryFilter" :items="categoryItems" label="Catégorie" hide-details />
      </v-col>
    </v-row>

    <div v-for="group in grouped" :key="group.id" class="page-block mb-6">
      <h2 class="section-label">{{ group.label }}</h2>
      <v-list lines="two" class="rounded-lg">
        <v-list-item
          v-for="page in group.pages"
          :key="page.id"
          :title="page.titre"
          :subtitle="page.publie ? 'Publié' : 'Brouillon'"
          :to="auth.can('content.write') ? { name: 'content-edit', params: { id: page.id } } : undefined"
        >
          <template #append>
            <v-chip size="x-small" :color="page.publie ? 'success' : 'warning'" variant="tonal">
              {{ page.publie ? 'Publié' : 'Brouillon' }}
            </v-chip>
          </template>
        </v-list-item>
      </v-list>
    </div>

    <v-alert v-if="!grouped.length" type="info" variant="tonal">Aucun contenu.</v-alert>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/services/api'
import { CONTENT_CATEGORIES, sortContentPages } from '@/domain/content'

const auth = useAuthStore()
const pages = ref([])
const categoryFilter = ref('Tout')

const categoryItems = [{ title: 'Tout', value: 'Tout' }, ...CONTENT_CATEGORIES.map((cat) => ({ title: cat.label, value: cat.id }))]

const filtered = computed(() =>
  pages.value.filter((page) => categoryFilter.value === 'Tout' || page.categorie === categoryFilter.value),
)

const grouped = computed(() => {
  const sorted = sortContentPages(filtered.value)
  return CONTENT_CATEGORIES.map((category) => ({
    ...category,
    pages: sorted.filter((page) => page.categorie === category.id),
  })).filter((group) => group.pages.length)
})

onMounted(async () => {
  pages.value = await api.pages()
})
</script>
