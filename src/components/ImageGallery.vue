<template>
  <div v-if="images.length">
    <v-img
      :src="current.src"
      :alt="altText(current)"
      class="rounded-lg gallery-main"
      max-height="460"
      contain
      @click="open(index)"
    />
    <div v-if="current.legende || current.credit" class="text-body-2 mt-2">
      <span v-if="current.legende">{{ current.legende }}</span>
      <span v-if="current.credit" class="text-medium-emphasis">
        {{ current.legende ? ' — ' : '' }}{{ current.credit }}
      </span>
    </div>

    <div v-if="images.length > 1" class="d-flex ga-2 mt-3 flex-wrap">
      <button
        v-for="(img, i) in images"
        :key="img.id"
        type="button"
        class="thumb-btn"
        :class="{ 'thumb-btn-active': i === index }"
        @click="index = i"
      >
        <v-img :src="img.src" height="64" width="64" cover />
      </button>
    </div>

    <v-dialog v-model="dialog" max-width="960">
      <v-card>
        <v-img :src="current.src" max-height="80vh" contain />
        <v-card-text>
          <div class="text-subtitle-1">{{ current.legende || itemNom }}</div>
          <div v-if="current.credit" class="text-body-2 text-medium-emphasis">{{ current.credit }}</div>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="text" :disabled="index === 0" @click="index -= 1">Précédente</v-btn>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Fermer</v-btn>
          <v-btn variant="text" :disabled="index === images.length - 1" @click="index += 1">Suivante</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
  <v-sheet v-else class="d-flex align-center justify-center rounded-lg" height="280" color="kamg">
    <div class="text-center">
      <v-icon size="64" color="primary">{{ placeholderIcon }}</v-icon>
      <div class="text-body-2 text-medium-emphasis mt-2">Pas encore de photo</div>
    </div>
  </v-sheet>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { coverSrc, normalizeImages } from '@/domain/images'

const props = defineProps({
  item: { type: Object, required: true },
  placeholderIcon: { type: String, default: 'mdi-image-off-outline' },
})

const images = computed(() => normalizeImages(props.item?.images))
const itemNom = computed(() => props.item?.nom || '')
const index = ref(0)
const dialog = ref(false)

watch(
  images,
  (list) => {
    const cover = coverSrc(props.item)
    const found = list.findIndex((img) => img.src === cover)
    index.value = found >= 0 ? found : 0
  },
  { immediate: true },
)

const current = computed(() => images.value[index.value] || images.value[0] || { src: '', legende: '', credit: '' })

function altText(img) {
  return [itemNom.value, img?.legende].filter(Boolean).join(' — ')
}

function open(i) {
  index.value = i
  dialog.value = true
}
</script>

<style scoped>
.gallery-main {
  background: #edede5;
  cursor: zoom-in;
}
.thumb-btn {
  border: 2px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  padding: 0;
  background: none;
}
.thumb-btn-active {
  border-color: #6a8c69;
}
</style>
