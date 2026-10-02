<template>
  <div>
    <input
      ref="fileInput"
      type="file"
      accept="image/*,.pdf,application/pdf"
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
      <v-icon size="36" color="primary">mdi-paperclip-plus</v-icon>
      <div class="text-subtitle-1 mt-2">Ajouter des pièces jointes</div>
      <div class="text-body-2 text-medium-emphasis">
        croquis, dessins, patrons, PDF… — JPG, PNG, WEBP, GIF ou PDF (10 Mo max)
      </div>
      <div v-if="uploading" class="text-caption mt-2">Envoi en cours…</div>
    </div>

    <v-alert v-if="error" type="error" class="mb-4" density="compact">{{ error }}</v-alert>

    <v-list v-if="attachments.length" lines="two" class="attachment-list">
      <v-list-item v-for="att in attachments" :key="att.id" class="attachment-item">
        <template #prepend>
          <a :href="att.src" target="_blank" rel="noopener" class="attachment-thumb">
            <v-img
              v-if="isImage(att)"
              :src="att.src"
              width="56"
              height="56"
              cover
              class="rounded"
            />
            <v-icon v-else size="40" color="error">mdi-file-pdf-box</v-icon>
          </a>
        </template>

        <v-list-item-title class="text-wrap">
          <a :href="att.src" target="_blank" rel="noopener" class="text-primary">
            {{ displayName(att) }}
          </a>
        </v-list-item-title>

        <v-list-item-subtitle class="text-wrap mt-2">
          <v-text-field
            :model-value="att.label"
            label="Description"
            placeholder="Croquis, patron, dessin technique…"
            hide-details
            density="compact"
            @update:model-value="patch(att.id, { label: $event })"
          />
        </v-list-item-subtitle>

        <template #append>
          <v-btn icon variant="text" size="small" @click="remove(att.id)">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </template>
      </v-list-item>
    </v-list>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { api } from '@/services/api'
import { createAttachment, isImageAttachment, normalizeAttachments } from '@/domain/attachments'

const MAX_BYTES = 10 * 1024 * 1024
const ACCEPTED = /^image\/(png|jpe?g|webp|gif)$|^application\/pdf$/

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  code: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const fileInput = ref(null)
const dragging = ref(false)
const uploading = ref(false)
const error = ref('')

const attachments = computed(() => normalizeAttachments(props.modelValue))

function commit(next) {
  emit('update:modelValue', normalizeAttachments(next))
}

function patch(id, fields) {
  commit(attachments.value.map((att) => (att.id === id ? { ...att, ...fields } : att)))
}

function remove(id) {
  commit(attachments.value.filter((att) => att.id !== id))
}

function isImage(att) {
  return isImageAttachment(att)
}

function displayName(att) {
  return att.filename || att.src.split('/').pop() || 'Fichier'
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
  const files = [...(fileList || [])].filter((file) => ACCEPTED.test(file.type))
  if (!files.length) {
    error.value = 'Formats acceptés : JPG, PNG, WEBP, GIF ou PDF.'
    return
  }
  uploading.value = true
  error.value = ''
  const added = []
  try {
    for (const file of files) {
      if (file.size > MAX_BYTES) {
        throw new Error(`« ${file.name} » dépasse la taille maximale de 10 Mo.`)
      }
      const dataUrl = await readAsDataUrl(file)
      const uploaded = await api.upload(file.name, dataUrl, props.code)
      added.push(
        createAttachment({
          src: uploaded.src || uploaded,
          filename: file.name,
          mimeType: uploaded.mimeType || file.type,
        }),
      )
    }
    commit([...attachments.value, ...added])
  } catch (err) {
    error.value = err.message || 'Impossible d’ajouter le fichier.'
  } finally {
    uploading.value = false
  }
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'))
    reader.readAsDataURL(file)
  })
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
.attachment-list {
  border: 1px solid rgba(44, 51, 74, 0.12);
  border-radius: 12px;
}
.attachment-thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin-right: 8px;
}
</style>
