<template>
  <div :class="{ 'item-photos--avatar': isAvatar }">
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      :multiple="!isAvatar"
      hidden
      @change="onInput"
    />

    <div v-if="isAvatar" class="profile-photo">
      <button type="button" class="profile-photo__frame" :disabled="uploading" @click="fileInput.click()">
        <img v-if="cover" :src="cover.src" alt="" class="profile-photo__img" />
        <span v-else class="profile-photo__placeholder">
          <v-icon size="36" color="primary">mdi-camera-plus-outline</v-icon>
        </span>
      </button>
      <div class="profile-photo__actions">
        <v-btn size="small" variant="tonal" class="text-none" :loading="uploading" @click="fileInput.click()">
          {{ cover ? 'Changer la photo' : 'Ajouter une photo' }}
        </v-btn>
        <v-btn v-if="cover" size="small" variant="text" class="text-none" @click="remove(cover.id)">
          Retirer
        </v-btn>
      </div>
      <v-alert v-if="error" type="error" class="mt-3" density="compact">{{ error }}</v-alert>
    </div>

    <template v-else>
    <div
      class="dropzone mb-4"
      :class="{ 'dropzone-active': dragging, 'dropzone-busy': uploading }"
      @dragenter.prevent="dragging = true"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
      @click="fileInput.click()"
    >
      <v-icon size="36" color="primary">mdi-camera-plus-outline</v-icon>
      <div class="text-subtitle-1 mt-2">Déposer des photos ici</div>
      <div class="text-body-2 text-medium-emphasis">
        JPG, PNG, WEBP (10 Mo max)
      </div>
      <div v-if="uploading" class="text-caption mt-2">Envoi en cours…</div>
    </div>

    <v-alert v-if="error" type="error" class="mb-4" density="compact">{{ error }}</v-alert>

    <v-row v-if="images.length">
      <v-col v-for="(img, index) in images" :key="img.id" cols="12" sm="6" md="4">
        <div class="photo-block">
          <v-img :src="img.src" height="160" cover class="rounded-lg">
            <div class="d-flex justify-space-between pa-1">
              <v-chip v-if="img.principale" size="x-small" color="primary">Photo principale</v-chip>
              <v-spacer />
              <v-btn icon size="x-small" variant="text" @click.stop="remove(img.id)">
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </div>
          </v-img>
          <v-text-field
            class="mt-3"
            :model-value="img.legende"
            label="Légende"
            placeholder="Vue de face, dos, détail…"
            hide-details
            density="compact"
            @update:model-value="patch(img.id, { legende: $event })"
          />
          <v-text-field
            class="mt-2"
            :model-value="img.credit"
            label="Crédit / source"
            hide-details
            density="compact"
            @update:model-value="patch(img.id, { credit: $event })"
          />
          <div class="d-flex ga-1 mt-2">
            <v-btn size="x-small" variant="text" :disabled="index === 0" @click="move(img.id, -1)">
              <v-icon start>mdi-chevron-left</v-icon>
              Avant
            </v-btn>
            <v-btn size="x-small" variant="text" :disabled="index === images.length - 1" @click="move(img.id, 1)">
              Après
              <v-icon end>mdi-chevron-right</v-icon>
            </v-btn>
            <v-spacer />
            <v-btn
              size="x-small"
              variant="text"
              color="primary"
              :disabled="img.principale"
              @click="makeCover(img.id)"
            >
              Couverture
            </v-btn>
          </div>
        </div>
      </v-col>
    </v-row>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { api } from '@/services/api'
import { compressImageFile } from '@/services/compressImage'
import { createImage, moveImage, normalizeImages, setPrincipal } from '@/domain/images'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  code: { type: String, default: '' },
  variant: { type: String, default: 'gallery' },
})

const emit = defineEmits(['update:modelValue', 'change'])

const fileInput = ref(null)
const dragging = ref(false)
const uploading = ref(false)
const error = ref('')

const isAvatar = computed(() => props.variant === 'avatar')
const images = computed(() => normalizeImages(props.modelValue))
const cover = computed(() => images.value.find((img) => img.principale) || images.value[0] || null)
let saveTimer

function commit(next, immediate = false) {
  const normalized = normalizeImages(next)
  emit('update:modelValue', normalized)
  clearTimeout(saveTimer)
  if (immediate) emit('change', normalized)
  else saveTimer = setTimeout(() => emit('change', normalized), 500)
}

function patch(id, fields) {
  commit(images.value.map((img) => (img.id === id ? { ...img, ...fields } : img)))
}

function remove(id) {
  commit(images.value.filter((img) => img.id !== id), true)
}

function move(id, direction) {
  commit(moveImage(images.value, id, direction), true)
}

function makeCover(id) {
  commit(setPrincipal(images.value, id), true)
}

function onInput(event) {
  addFiles(event.target.files)
  event.target.value = ''
}

function onDrop(event) {
  dragging.value = false
  addFiles(event.dataTransfer?.files)
}

const MAX_PHOTO_BYTES = 10 * 1024 * 1024

async function addFiles(fileList) {
  const files = [...(fileList || [])].filter((file) => file.type.startsWith('image/'))
  if (!files.length) return
  uploading.value = true
  error.value = ''
  const added = []
  try {
    for (const file of files) {
      if (file.size > MAX_PHOTO_BYTES) {
        throw new Error(`${file.name} dépasse 10 Mo`)
      }
      const compressed = await compressImageFile(file)
      const uploaded = await api.upload(compressed.filename, compressed.dataUrl, props.code)
      added.push(
        createImage({
          src: uploaded.src || uploaded,
          principale: images.value.length + added.length === 0,
        }),
      )
    }
    commit(isAvatar.value ? added.map((img, index) => ({ ...img, principale: index === 0 })) : [...images.value, ...added], true)
  } catch (err) {
    error.value = err.message || 'Impossible d’ajouter la photo.'
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.dropzone {
  border-radius: 16px;
  padding: 28px 16px;
  text-align: center;
  cursor: pointer;
  transition: background 0.15s ease;
}
.dropzone-active,
.dropzone:hover {
  background: #edede5;
}
.dropzone-busy {
  opacity: 0.7;
  pointer-events: none;
}

.profile-photo {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.profile-photo__frame {
  width: 168px;
  height: 168px;
  padding: 0;
  border: 2px dashed var(--kamg-border, #d5d8cf);
  border-radius: 50%;
  overflow: hidden;
  background: #f4f6f4;
  cursor: pointer;
}

.profile-photo__frame:disabled {
  opacity: 0.7;
  cursor: default;
}

.profile-photo__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-photo__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-photo__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
