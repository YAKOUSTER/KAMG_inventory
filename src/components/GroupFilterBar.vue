<template>
  <div class="group-filter-bar" :class="{ 'group-filter-bar--mobile': isMobile }">
    <button
      v-if="isMobile"
      type="button"
      class="group-filter-bar__filters"
      :class="{ 'is-active': hasActiveFilter }"
      @click="sheetOpen = true"
    >
      <v-icon size="18">mdi-tune-variant</v-icon>
      <span>Filtres</span>
      <span v-if="hasActiveFilter" class="group-filter-bar__badge">1</span>
    </button>

    <div ref="scroller" class="group-filter-bar__scroller" role="radiogroup" :aria-label="label">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="group-filter-bar__pill"
        :class="{ 'is-active': model === item.id }"
        role="radio"
        :aria-checked="model === item.id"
        @click="select(item.id)"
      >
        {{ item.label }}
      </button>
    </div>

    <v-bottom-sheet v-if="isMobile" v-model="sheetOpen" max-width="640">
      <v-card class="group-filter-sheet">
        <div class="group-filter-sheet__head">
          <h2 class="group-filter-sheet__title">{{ label }}</h2>
          <v-btn icon variant="text" aria-label="Fermer" @click="sheetOpen = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
        <v-list class="group-filter-sheet__list">
          <v-list-item
            v-for="item in items"
            :key="item.id"
            :active="model === item.id"
            color="primary"
            rounded="xl"
            min-height="56"
            class="group-filter-sheet__item"
            @click="select(item.id)"
          >
            <template #prepend>
              <v-icon :icon="item.icon || 'mdi-account-group-outline'" />
            </template>
            <v-list-item-title class="group-filter-sheet__label">{{ item.label }}</v-list-item-title>
            <template #append>
              <v-icon v-if="model === item.id" color="primary">mdi-check</v-icon>
            </template>
          </v-list-item>
        </v-list>
      </v-card>
    </v-bottom-sheet>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'

const props = defineProps({
  items: { type: Array, default: () => [] },
  modelValue: { type: String, default: 'tous' },
  label: { type: String, default: 'Filtrer par groupe' },
})

const emit = defineEmits(['update:modelValue'])
const display = useDisplay()
const isMobile = computed(() => !display.mdAndUp.value)
const sheetOpen = ref(false)
const scroller = ref(null)
const model = computed(() => props.modelValue)
const hasActiveFilter = computed(() => Boolean(model.value && model.value !== 'tous'))

function select(id) {
  emit('update:modelValue', id)
  sheetOpen.value = false
}

watch(
  model,
  async () => {
    await nextTick()
    const active = scroller.value?.querySelector('.is-active')
    active?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  },
  { flush: 'post' },
)
</script>

<style scoped>
.group-filter-bar {
  display: flex;
  align-items: stretch;
  gap: 8px;
  margin-bottom: 14px;
}

.group-filter-bar--mobile {
  margin-left: -12px;
  margin-right: -12px;
  padding-left: 12px;
}

.group-filter-bar__filters {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid var(--kamg-border);
  border-radius: 999px;
  background: #fff;
  color: var(--kamg-ink);
  font-size: 0.95rem;
  font-weight: 700;
  box-shadow: 0 1px 2px rgba(28, 36, 32, 0.06);
  cursor: pointer;
}

.group-filter-bar__filters.is-active {
  border-color: var(--kamg-deep);
  color: var(--kamg-deep);
}

.group-filter-bar__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--kamg-deep);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 800;
  line-height: 1;
}

.group-filter-bar__scroller {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  padding: 1px 12px 8px 0;
}

.group-filter-bar__scroller::-webkit-scrollbar {
  display: none;
}

.group-filter-bar__pill {
  flex: 0 0 auto;
  min-height: 44px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  background: #fff;
  color: var(--kamg-ink);
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(28, 36, 32, 0.06);
  cursor: pointer;
}

.group-filter-bar__pill.is-active {
  background: var(--kamg-deep);
  color: #fff;
  box-shadow: none;
}

.group-filter-sheet {
  padding-bottom: env(safe-area-inset-bottom, 0px);
  border-radius: 20px 20px 0 0 !important;
}

.group-filter-sheet__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 8px 0 20px;
}

.group-filter-sheet__title {
  flex: 1;
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.group-filter-sheet__list {
  padding: 8px 12px 16px;
}

.group-filter-sheet__item {
  margin-bottom: 4px;
}

.group-filter-sheet__label {
  font-size: 1rem !important;
  font-weight: 600 !important;
}

@media (min-width: 960px) {
  .group-filter-bar__scroller {
    flex-wrap: wrap;
    overflow: visible;
    padding: 0;
  }
}
</style>
