<template>
  <div class="member-home">
    <section class="member-home__section">
      <div class="member-home__head">
        <div>
          <h2 class="member-home__title">📅 Prochain événement</h2>
          <p class="member-home__intro">Prochaines répétitions, sorties et événements du cercle</p>
        </div>
        <v-btn variant="text" size="small" class="text-none" @click="emit('open-agenda')">
          Voir plus
        </v-btn>
      </div>
      <div v-if="nextEvents.length" class="member-home__stack">
        <EventPollCard
          v-for="event in nextEvents"
          :key="event.id"
          :event="event"
          :people="people"
          :presences="presences"
          :person-id="personId"
          public-mode
          @select="emit('select-event', $event)"
          @updated="emit('updated', $event)"
        />
      </div>
      <v-alert v-else type="info" variant="tonal">Aucun événement à venir.</v-alert>
    </section>

    <section class="member-home__section">
      <div class="member-home__head">
        <div>
          <h2 class="member-home__title">📣 Actualité du cercle</h2>
          <p class="member-home__intro">Que se passe-t-il en ce moment chez les Korriganed</p>
        </div>
        <v-btn variant="text" size="small" class="text-none" @click="emit('open-news')">
          Voir plus
        </v-btn>
      </div>
      <div v-if="news.length" class="member-home__news">
        <article
          v-for="page in news"
          :key="page.id"
          class="member-home-news"
          tabindex="0"
          role="button"
          @click="emit('open-article', page.id)"
          @keydown.enter="emit('open-article', page.id)"
        >
          <figure v-if="coverOf(page)" class="member-home-news__cover">
            <CoverImage :src="coverOf(page).url" :alt="coverOf(page).legende || page.titre" />
          </figure>
          <div v-else class="member-home-news__cover member-home-news__cover--empty">
            <v-icon size="28" color="primary">mdi-bullhorn-outline</v-icon>
          </div>
          <div class="member-home-news__body">
            <v-chip size="x-small" color="primary" variant="tonal" class="text-none mb-2">Actualité</v-chip>
            <h3>{{ page.titre }}</h3>
            <p>{{ page.excerpt }}</p>
          </div>
        </article>
      </div>
      <v-alert v-else type="info" variant="tonal">Pas encore d’actualité publiée.</v-alert>
    </section>

    <section class="member-home__section">
      <div class="member-home__head">
        <div>
          <h2 class="member-home__title">✨ Nouveaux membres</h2>
          <p class="member-home__intro">
            Qui sont les petits nouveaux de cette année et dans quel(s) groupe(s) sont-ils ?
          </p>
        </div>
      </div>
      <div v-if="newcomers.groups.length">
        <div v-for="group in newcomers.groups" :key="group.role" class="member-home__category">
          <h3 class="member-home__category-title">{{ group.label }}</h3>
          <div class="member-home__people">
            <article v-for="person in group.people" :key="person.id" class="member-home-person">
              <div
                class="member-home-person__photo"
                :style="person.photo ? { backgroundImage: `url(${person.photo})` } : undefined"
              >
                <v-icon v-if="!person.photo" size="28" color="primary">mdi-account</v-icon>
              </div>
              <div>
                <div class="member-home-person__name">{{ personDisplayName(person) }}</div>
                <div class="member-home-person__meta">NEW</div>
              </div>
            </article>
          </div>
        </div>
      </div>
      <v-alert v-else type="info" variant="tonal">
        Pas encore de nouveaux membres pour la saison {{ newcomers.season }}.
      </v-alert>
    </section>

    <section class="member-home__section">
      <div class="member-home__head">
        <div>
          <h2 class="member-home__title">🎉 Prochaines sorties</h2>
          <p class="member-home__intro">Fest-noz et sorties libres, hors cercle.</p>
        </div>
        <v-btn variant="text" size="small" class="text-none" @click="emit('open-agenda')">
          Voir plus
        </v-btn>
      </div>
      <div v-if="sorties.length" class="member-home__stack">
        <EventPollCard
          v-for="event in sorties"
          :key="event.id"
          :event="event"
          :people="people"
          :presences="presences"
          :person-id="personId"
          public-mode
          @select="emit('select-event', $event)"
          @updated="emit('updated', $event)"
        />
      </div>
      <v-alert v-else type="info" variant="tonal">Aucune sortie libre à venir.</v-alert>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import EventPollCard from '@/components/EventPollCard.vue'
import CoverImage from '@/components/CoverImage.vue'
import { contentCoverMedia } from '@/domain/content'
import { personDisplayName } from '@/domain/person'
import {
  memberHomeNews,
  memberHomeNewcomers,
  nextHomeEvents,
  upcomingLibreSorties,
} from '@/domain/memberHome'

const props = defineProps({
  events: { type: Array, default: () => [] },
  pages: { type: Array, default: () => [] },
  people: { type: Array, default: () => [] },
  presences: { type: Array, default: () => [] },
  personId: { type: String, default: '' },
})

const emit = defineEmits(['open-agenda', 'open-news', 'open-article', 'select-event', 'updated'])

const nextEvents = computed(() => nextHomeEvents(props.events))
const news = computed(() => memberHomeNews(props.pages))
const newcomers = computed(() => memberHomeNewcomers(props.people))
const sorties = computed(() => upcomingLibreSorties(props.events))

function coverOf(page) {
  return contentCoverMedia(page)
}
</script>

<style scoped>
.member-home {
  display: flex;
  flex-direction: column;
  gap: 56px;
}

.member-home__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}

.member-home__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--kamg-ink);
  background: none;
  padding: 0;
  border-radius: 0;
  display: block;
}

.member-home__section + .member-home__section {
  padding-top: 8px;
}

.member-home__intro {
  margin: 8px 0 0;
  font-size: 0.9rem;
  color: rgba(44, 51, 44, 0.68);
}

.member-home__stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.member-home__news {
  display: grid;
  gap: 12px;
}

@media (min-width: 720px) {
  .member-home__news {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.member-home-news {
  background: #fff;
  border: 1px solid var(--kamg-border);
  border-radius: var(--kamg-radius);
  box-shadow: var(--kamg-shadow);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.member-home-news:hover {
  transform: translateY(-2px);
  box-shadow: var(--kamg-shadow-hover);
}

.member-home-news__cover {
  margin: 0;
  aspect-ratio: 16 / 9;
  background: rgba(106, 140, 105, 0.1);
}

.member-home-news__cover :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-home-news__cover--empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.member-home-news__body {
  padding: 12px 14px 16px;
}

.member-home-news__body h3 {
  margin: 0 0 6px;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.3;
}

.member-home-news__body p {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.45;
  color: rgba(44, 51, 44, 0.7);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.member-home__category {
  margin-bottom: 16px;
}

.member-home__category-title {
  margin: 0 0 8px;
  font-size: 0.95rem;
}

.member-home__people {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
}

.member-home-person {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border: 1px solid var(--kamg-border);
  border-radius: 16px;
  box-shadow: var(--kamg-shadow);
  padding: 10px;
}

.member-home-person__photo {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--kamg-linen) center/cover no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.member-home-person__name {
  font-weight: 700;
  font-size: 0.9rem;
}

.member-home-person__meta {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--kamg-deep);
}
</style>
