<template>
  <article>
    <button type="button" class="member-person-card" @click="open = true">
      <div
        class="member-person-card__photo"
        :style="person.photo ? { backgroundImage: `url(${person.photo})` } : undefined"
      >
        <v-icon v-if="!person.photo" size="28" color="primary">mdi-account</v-icon>
      </div>
      <div class="member-person-card__body">
        <div class="member-person-card__name">{{ personDisplayName(person) }}</div>
        <div v-if="showNew && person.nouveau" class="member-person-card__meta">NEW</div>
        <p v-else-if="excerpt" class="member-person-card__excerpt">{{ excerpt }}</p>
      </div>
    </button>

    <v-dialog v-model="open" max-width="480" scrollable>
      <v-card>
        <v-card-title class="d-flex align-start ga-2">
          <span class="member-person-card__dialog-title">{{ personDisplayName(person) }}</span>
          <v-spacer />
          <v-btn icon variant="text" aria-label="Fermer" @click="open = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <div class="member-person-card__dialog-photo-wrap">
            <div
              class="member-person-card__dialog-photo"
              :style="person.photo ? { backgroundImage: `url(${person.photo})` } : undefined"
            >
              <v-icon v-if="!person.photo" size="48" color="primary">mdi-account</v-icon>
            </div>
          </div>
          <div v-if="groupLabels.length || person.nouveau" class="d-flex flex-wrap ga-1 mb-3">
            <v-chip v-if="person.nouveau" size="small" color="primary" variant="tonal">NEW</v-chip>
            <v-chip v-for="label in groupLabels" :key="label" size="small" variant="tonal">
              {{ label }}
            </v-chip>
          </div>
          <p v-if="person.bio" class="member-person-card__bio">{{ person.bio }}</p>
          <p v-else class="text-medium-emphasis">Pas encore de biographie.</p>
        </v-card-text>
      </v-card>
    </v-dialog>
  </article>
</template>

<script setup>
import { computed, ref } from 'vue'
import { personDisplayName } from '@/domain/person'
import { eventGroupLabel, personDanceGroups } from '@/domain/eventGroups'

const props = defineProps({
  person: { type: Object, required: true },
  showNew: { type: Boolean, default: false },
})

const open = ref(false)
const groupLabels = computed(() => personDanceGroups(props.person).map((id) => eventGroupLabel(id)))
const excerpt = computed(() => {
  const text = String(props.person?.bio || '').trim()
  if (!text) return ''
  return text.length > 90 ? `${text.slice(0, 87).trim()}…` : text
})
</script>

<style scoped>
.member-person-card {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  background: #fff;
  border: 1px solid var(--kamg-border);
  border-radius: 16px;
  box-shadow: var(--kamg-shadow);
  padding: 10px;
  cursor: pointer;
  color: inherit;
}

.member-person-card__photo,
.member-person-card__dialog-photo {
  background: var(--kamg-linen) center / cover no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.member-person-card__photo {
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

.member-person-card__name {
  font-weight: 700;
  font-size: 0.9rem;
}

.member-person-card__meta {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--kamg-deep);
}

.member-person-card__excerpt,
.member-person-card__bio {
  margin: 2px 0 0;
  font-size: 0.82rem;
  line-height: 1.35;
  color: rgba(44, 51, 44, 0.72);
  white-space: pre-wrap;
}

.member-person-card__excerpt {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
}

.member-person-card__dialog-title {
  font-size: 1.1rem;
  line-height: 1.3;
  white-space: normal;
}

.member-person-card__dialog-photo-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.member-person-card__dialog-photo {
  width: 132px;
  height: 132px;
  border-radius: 50%;
}

.member-person-card__bio {
  margin: 0;
  font-size: 0.95rem;
}
</style>
