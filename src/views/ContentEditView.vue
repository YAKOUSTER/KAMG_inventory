<template>
  <div>
    <h1 class="text-h5 text-md-h4 page-title mb-6">{{ isEdit ? 'Modifier le contenu' : 'Nouveau contenu' }}</h1>
    <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>

    <v-form v-if="ready" @submit.prevent="submit">
      <div class="form-fields-grid form-fields-grid--2">
        <FieldRow label="Catégorie">
          <v-select v-model="form.categorie" :items="categoryItems" hide-details="auto" :rules="[required]" />
        </FieldRow>
        <FieldRow label="Ordre">
          <v-text-field v-model.number="form.ordre" type="number" hide-details />
        </FieldRow>
        <FieldRow label="Titre" class="form-fields-grid__span-2">
          <v-text-field v-model="form.titre" hide-details="auto" :rules="[required]" />
        </FieldRow>
        <FieldRow label="Contenu" align-top class="form-fields-grid__span-2">
          <v-textarea v-model="form.corps" hide-details rows="12" hint="Texte libre, sauts de ligne conservés" />
        </FieldRow>
        <FieldRow label="Publication">
          <v-checkbox v-model="form.publie" label="Visible dans l’espace membres" hide-details />
        </FieldRow>
      </div>

      <div class="d-flex ga-3 mt-6">
        <v-btn type="submit" color="primary" :loading="saving">Enregistrer</v-btn>
        <v-btn variant="text" to="/contenus">Annuler</v-btn>
        <v-spacer />
        <v-btn
          v-if="isEdit && auth.can('content.write')"
          color="error"
          variant="text"
          :loading="deleting"
          @click="remove"
        >
          Supprimer
        </v-btn>
      </div>
    </v-form>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import FieldRow from '@/components/FieldRow.vue'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { CONTENT_CATEGORIES } from '@/domain/content'

const props = defineProps({ id: { type: String, default: '' } })
const router = useRouter()
const auth = useAuthStore()
const ready = ref(false)
const saving = ref(false)
const deleting = ref(false)
const error = ref('')
const isEdit = computed(() => Boolean(props.id))

const categoryItems = CONTENT_CATEGORIES.map((cat) => ({ title: cat.label, value: cat.id }))
const form = reactive({
  categorie: 'presentation',
  titre: '',
  corps: '',
  ordre: 0,
  publie: true,
})

const required = (value) => Boolean(String(value || '').trim()) || 'Champ requis'

onMounted(async () => {
  if (props.id) {
    const page = await api.page(props.id)
    Object.assign(form, {
      categorie: page.categorie,
      titre: page.titre,
      corps: page.corps || '',
      ordre: page.ordre || 0,
      publie: page.publie !== false,
    })
  }
  ready.value = true
})

async function submit() {
  saving.value = true
  error.value = ''
  try {
    const saved = props.id ? await api.updatePage(props.id, form) : await api.createPage(form)
    router.push({ name: 'content-edit', params: { id: saved.id } })
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!confirm('Supprimer ce contenu ?')) return
  deleting.value = true
  error.value = ''
  try {
    await api.deletePage(props.id)
    router.push({ name: 'contents' })
  } catch (err) {
    error.value = err.message
  } finally {
    deleting.value = false
  }
}
</script>
