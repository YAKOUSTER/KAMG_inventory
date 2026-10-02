<template>
  <div class="calendrier-subnav">
    <v-btn
      v-for="link in links"
      :key="link.to"
      :to="link.to"
      exact
      variant="text"
      size="small"
      class="calendrier-subnav__link text-none"
      active-class=""
      exact-active-class=""
      :class="{ 'is-active': linkMatchesPath(link, route.path) }"
    >
      {{ link.title }}
    </v-btn>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { GESTION_AREAS, linkMatchesPath, visibleAreaLinks } from '@/domain/gestionNav'

const route = useRoute()
const auth = useAuthStore()
const links = computed(() => visibleAreaLinks(
  GESTION_AREAS.find((area) => area.id === 'calendrier'),
  auth.user,
))
</script>

<style scoped>
.calendrier-subnav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-bottom: 1rem;
}

.calendrier-subnav__link {
  font-weight: 600;
  color: var(--kamg-muted) !important;
  border-radius: 999px !important;
}

.calendrier-subnav__link.is-active {
  color: var(--kamg-deep) !important;
  background: rgba(83, 115, 106, 0.12);
}

@media (min-width: 960px) {
  .calendrier-subnav {
    display: none;
  }
}
</style>
