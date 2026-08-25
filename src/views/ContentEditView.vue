<template>
  <div>
    <h1 class="text-h5 text-md-h4 page-title mb-6">{{ isEdit ? 'Modifier le contenu' : 'Nouveau contenu' }}</h1>
    <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      hidden
      @change="onFilePicked"
    />

    <v-form v-if="ready" @submit.prevent="submit">
      <div class="form-fields-grid form-fields-grid--2">
        <FieldRow label="Catégorie">
          <v-select v-model="form.categorie" :items="categoryItems" hide-details="auto" :rules="[required]" />
        </FieldRow>
        <FieldRow label="Ordre">
          <v-text-field v-model.number="form.ordre" type="number" hide-details />
        </FieldRow>
        <FieldRow v-if="form.categorie === 'newsletter'" label="Date de l’actualité">
          <v-text-field v-model="form.datePublication" type="date" hide-details />
        </FieldRow>
        <FieldRow label="Titre" class="form-fields-grid__span-2">
          <v-text-field v-model="form.titre" hide-details="auto" :rules="[required]" />
        </FieldRow>
        <FieldRow label="Image de couverture" align-top class="form-fields-grid__span-2">
          <div class="content-cover">
            <div class="d-flex flex-wrap ga-2">
              <v-btn
                variant="tonal"
                size="small"
                class="text-none"
                prepend-icon="mdi-image-plus"
                :loading="uploading"
                @click="pickFile('cover')"
              >
                Importer une photo
              </v-btn>
              <v-btn
                v-if="form.couvertureUrl"
                variant="text"
                size="small"
                color="error"
                class="text-none"
                @click="form.couvertureUrl = ''"
              >
                Retirer
              </v-btn>
            </div>
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
          <v-textarea
            v-model="form.corps"
            hide-details
            rows="12"
            hint="Texte libre. Les liens et vidéos restent des URL (Lien : https://… / Vidéo : https://…)."
          />
        </FieldRow>
        <FieldRow label="Photos & vidéos" align-top class="form-fields-grid__span-2">
          <div class="content-medias">
            <div v-if="!form.medias.length" class="text-body-2 text-medium-emphasis mb-3">
              Photos : fichier importé. Vidéos et liens : URL.
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
              <div v-if="media.type === 'image'" class="content-medias__file">
                <v-btn
                  variant="tonal"
                  size="small"
                  class="text-none"
                  prepend-icon="mdi-image-plus"
                  :loading="uploading"
                  @click="pickFile(index)"
                >
                  {{ media.url ? 'Remplacer' : 'Importer' }}
                </v-btn>
                <CoverImage v-if="media.url" :src="media.url" :alt="media.legende || 'Photo'" class="content-medias__thumb" />
              </div>
              <v-text-field
                v-else
                v-model="media.url"
                label="Lien de la vidéo"
                hide-details
                density="compact"
                class="content-medias__url"
                placeholder="https://youtu.be/… ou fichier .mp4"
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
            <div class="d-flex flex-wrap ga-2 mt-2">
              <v-btn variant="tonal" size="small" class="text-none" prepend-icon="mdi-plus" @click="addMedia('image')">
                Ajouter une photo
              </v-btn>
              <v-btn variant="text" size="small" class="text-none" prepend-icon="mdi-link" @click="addMedia('youtube')">
                Ajouter un lien / vidéo
              </v-btn>
            </div>
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
import { compressImageFile } from '@/services/compressImage'
import { useAuthStore } from '@/stores/auth'
import { CONTENT_CATEGORIES } from '@/domain/content'

const props = defineProps({ id: { type: String, default: '' } })
const router = useRouter()
const auth = useAuthStore()
const ready = ref(false)
const saving = ref(false)
const deleting = ref(false)
const uploading = ref(false)
const error = ref('')
const fileInput = ref(null)
const fileTarget = ref('cover')
const isEdit = computed(() => Boolean(props.id))
const uploadPrefix = computed(() => (props.id ? `page-${props.id}` : 'page'))

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
  datePublication: new Date().toISOString().slice(0, 10),
  couvertureUrl: '',
  couvertureLegende: '',
  medias: [],
})

const required = (value) => Boolean(String(value || '').trim()) || 'Champ requis'

function addMedia(type = 'image') {
  form.medias.push({ type, url: '', legende: '' })
}

function removeMedia(index) {
  form.medias.splice(index, 1)
}

function pickFile(target) {
  fileTarget.value = target
  fileInput.value?.click()
}

async function onFilePicked(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  uploading.value = true
  error.value = ''
  try {
    const compressed = await compressImageFile(file)
    const uploaded = await api.upload(compressed.filename, compressed.dataUrl, uploadPrefix.value)
    const src = uploaded.src || uploaded
    if (fileTarget.value === 'cover') {
      form.couvertureUrl = src
    } else {
      const index = Number(fileTarget.value)
      if (form.medias[index]) {
        form.medias[index].type = 'image'
        form.medias[index].url = src
      }
    }
  } catch (err) {
    error.value = err.message || 'Impossible d’importer la photo.'
  } finally {
    uploading.value = false
  }
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
      datePublication: String(page.datePublication || page.createdAt || '').slice(0, 10),
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
      datePublication: form.datePublication ? `${form.datePublication}T12:00:00` : undefined,
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
  grid-template-columns: 120px minmax(0, 1.2fr) minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}

.content-medias__file {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.content-medias__thumb {
  width: 64px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

@media (max-width: 900px) {
  .content-medias__row {
    grid-template-columns: 1fr;
  }
}
</style>
