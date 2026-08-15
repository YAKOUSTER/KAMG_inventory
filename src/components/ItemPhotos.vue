<template>
  <div>
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      hidden
      @change="onInput"
    />

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
        ou cliquer pour parcourir — plusieurs vues : face, dos, détail, étiquette…
      </div>
      <div v-if="uploading" class="text-caption mt-2">Envoi en cours…</div>
    </div>

    <v-text-field
      v-model="urlInput"
      class="mb-4"
      label="Ou coller une URL déjà hébergée"
      hide-details
      density="compact"
      append-inner-icon="mdi-plus"
      @click:append-inner="addUrl"
      @keyup.enter="addUrl"
    />

    <v-alert v-if="error" type="error" class="mb-4" density="compact">{{ error }}</v-alert>

    <v-row v-if="images.length">
      <v-col v-for="(img, index) in images" :key="img.id" cols="12" sm="6" md="4">
        <v-card variant="outlined">
          <v-img :src="img.src" height="160" cover>
            <div class="d-flex justify-space-between pa-1">
              <v-chip v-if="img.principale" size="x-small" color="primary">Photo principale</v-chip>
              <v-spacer />
              <v-btn icon size="x-small" variant="flat" @click.stop="remove(img.id)">
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </div>
          </v-img>
          <v-card-text class="pt-3">
            <v-text-field
              :model-value="img.legende"
              label="Légende"
              placeholder="Vue de face, dos, détail…"
              hide-details
              density="compact"
              class="mb-2"
              @update:model-value="patch(img.id, { legende: $event })"
            />
            <v-text-field
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
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
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
})

const emit = defineEmits(['update:modelValue', 'change'])

const fileInput = ref(null)
const dragging = ref(false)
const uploading = ref(false)
const error = ref('')
const urlInput = ref('')

const images = computed(() => normalizeImages(props.modelValue))
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

function addUrl() {
  const src = urlInput.value.trim()
  if (!src) return
  urlInput.value = ''
  commit(
    [
      ...images.value,
      createImage({ src, principale: images.value.length === 0 }),
    ],
    true,
  )
}

function onInput(event) {
  addFiles(event.target.files)
  event.target.value = ''
}

function onDrop(event) {
  dragging.value = false
  addFiles(event.dataTransfer?.files)
}

async function addFiles(fileList) {
  const files = [...(fileList || [])].filter((file) => file.type.startsWith('image/'))
  if (!files.length) return
  uploading.value = true
  error.value = ''
  const added = []
  try {
    for (const file of files) {
      const compressed = await compressImageFile(file)
      const uploaded = await api.upload(compressed.filename, compressed.dataUrl, props.code)
      added.push(
        createImage({
          src: uploaded.src || uploaded,
          principale: images.value.length + added.length === 0,
        }),
      )
    }
    commit([...images.value, ...added], true)
  } catch (err) {
    error.value = err.message || 'Impossible d’ajouter la photo.'
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.dropzone {
  border: 2px dashed #9aab9a;
  border-radius: 16px;
  padding: 28px 16px;
  text-align: center;
  background: #f7f8f4;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.dropzone-active,
.dropzone:hover {
  border-color: #6a8c69;
  background: #edede5;
}
.dropzone-busy {
  opacity: 0.7;
  pointer-events: none;
}
</style>
