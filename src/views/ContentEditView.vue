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
        <FieldRow label="Image de couverture" align-top class="form-fields-grid__span-2">
          <div class="content-cover">
            <v-text-field
              v-model="form.couvertureUrl"
              label="URL (colonne Photo du CSV / Drive / Glide)"
              hide-details="auto"
              placeholder="https://drive.google.com/file/d/… ou https://…"
            />
            <v-text-field
              v-model="form.couvertureLegende"
              label="Légende"
              hide-details
              class="mt-2"
            />
            <figure v-if="form.couvertureUrl" class="content-cover__preview">
              <CoverImage :src="form.couvertureUrl" :alt="form.couvertureLegende || form.titre" />
            </figure>
          </div>
        </FieldRow>
        <FieldRow label="Contenu" align-top class="form-fields-grid__span-2">
          <v-textarea v-model="form.corps" hide-details rows="12" hint="Texte libre, sauts de ligne conservés" />
        </FieldRow>
        <FieldRow label="Photos & vidéos" align-top class="form-fields-grid__span-2">
          <div class="content-medias">
            <div v-if="!form.medias.length" class="text-body-2 text-medium-emphasis mb-3">
              Aucun média. Ajoutez une URL d’image ou de vidéo (upload via Contenus ou lien Glide).
            </div>
            <div v-for="(media, index) in form.medias" :key="index" class="content-medias__row">
              <v-select
                v-model="media.type"
                :items="mediaTypeItems"
                label="Type"
                hide-details
                density="compact"
                class="content-medias__type"
              />
              <v-text-field
                v-model="media.url"
                label="URL"
                hide-details
                density="compact"
                class="content-medias__url"
                placeholder="https://… ou /uploads/…"
              />
              <v-text-field
                v-model="media.legende"
                label="Légende"
                hide-details
                density="compact"
                class="content-medias__legende"
              />
              <v-btn icon="mdi-delete" variant="text" color="error" size="small" @click="removeMedia(index)" />
            </div>
            <v-btn variant="tonal" size="small" class="text-none mt-2" prepend-icon="mdi-plus" @click="addMedia">
              Ajouter un média
            </v-btn>
          </div>
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
import CoverImage from '@/components/CoverImage.vue'
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
const mediaTypeItems = [
  { title: 'Image', value: 'image' },
  { title: 'Vidéo', value: 'video' },
  { title: 'YouTube', value: 'youtube' },
]

const form = reactive({
  categorie: 'presentation',
  titre: '',
  corps: '',
  ordre: 0,
  publie: true,
  couvertureUrl: '',
  couvertureLegende: '',
  medias: [],
})

const required = (value) => Boolean(String(value || '').trim()) || 'Champ requis'

function addMedia() {
  form.medias.push({ type: 'image', url: '', legende: '' })
}

function removeMedia(index) {
  form.medias.splice(index, 1)
}

onMounted(async () => {
  if (props.id) {
    const page = await api.page(props.id)
    Object.assign(form, {
      categorie: page.categorie,
      titre: page.titre,
      corps: page.corps || '',
      ordre: page.ordre || 0,
      publie: page.publie !== false,
      couvertureUrl: page.couverture?.url || '',
      couvertureLegende: page.couverture?.legende || '',
      medias: (page.medias || []).map((media) => ({
        type: media.type === 'video' ? 'video' : media.type === 'youtube' ? 'youtube' : 'image',
        url: media.url || '',
        legende: media.legende || '',
      })),
    })
  }
  ready.value = true
})

async function submit() {
  saving.value = true
  error.value = ''
  try {
    const payload = {
      categorie: form.categorie,
      titre: form.titre,
      corps: form.corps,
      ordre: form.ordre,
      publie: form.publie,
      couverture: form.couvertureUrl.trim()
        ? {
            type: 'image',
            url: form.couvertureUrl.trim(),
            legende: form.couvertureLegende.trim(),
            ordre: 0,
          }
        : null,
      medias: form.medias
        .filter((media) => String(media.url || '').trim())
        .map((media, index) => ({
          type: media.type === 'video' ? 'video' : media.type === 'youtube' ? 'youtube' : 'image',
          url: String(media.url).trim(),
          legende: String(media.legende || '').trim(),
          ordre: index,
        })),
    }
    const saved = props.id ? await api.updatePage(props.id, payload) : await api.createPage(payload)
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

<style scoped>
.content-cover__preview {
  margin: 12px 0 0;
  max-width: 420px;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 12px;
  background: rgba(71, 91, 145, 0.06);
}

.content-medias__row {
  display: grid;
  grid-template-columns: 120px 1fr 1fr auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

@media (max-width: 900px) {
  .content-medias__row {
    grid-template-columns: 1fr;
  }
}
</style>
