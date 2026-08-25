<template>
  <nav class="bottom-tab-bar" role="navigation" :aria-label="label">
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      class="bottom-tab-bar__item"
      :class="{ 'is-active': item.id === activeId }"
      @click="emit('select', item.id)"
    >
      <span class="bottom-tab-bar__icon-wrap">
        <v-badge
          :content="item.badge"
          :model-value="Boolean(item.badge)"
          color="warning"
          offset-x="2"
          offset-y="2"
        >
          <v-icon size="22">{{ item.id === activeId ? item.activeIcon || item.icon : item.icon }}</v-icon>
        </v-badge>
      </span>
      <span class="bottom-tab-bar__label">{{ item.label }}</span>
    </button>
  </nav>
</template>

<script setup>
defineProps({
  items: { type: Array, required: true },
  activeId: { type: String, default: '' },
  label: { type: String, default: 'Navigation' },
})

const emit = defineEmits(['select'])
</script>

<style scoped>
.bottom-tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  justify-content: space-around;
  align-items: stretch;
  min-height: 56px;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: var(--kamg-overlay);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-top: 1px solid var(--kamg-border);
}

.bottom-tab-bar__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 56px;
  border: 0;
  background: transparent;
  color: rgba(44, 51, 44, 0.55);
  cursor: pointer;
  padding: 6px 4px 8px;
}

.bottom-tab-bar__item.is-active {
  color: var(--kamg-deep);
  font-weight: 700;
}

.bottom-tab-bar__label {
  font-size: 0.68rem;
  line-height: 1.1;
  letter-spacing: 0.01em;
}

.bottom-tab-bar__icon-wrap {
  display: inline-flex;
}
</style>
