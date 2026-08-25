<template>
  <div class="member-blog">
    <template v-if="selectedPage">
      <button type="button" class="member-blog__back text-none" @click="closeArticle">
        <v-icon start size="18">mdi-arrow-left</v-icon>
        Tous les articles
      </button>

      <v-progress-linear v-if="articleLoading" indeterminate color="primary" class="mb-4" />
      <v-alert v-if="articleError" type="error" variant="tonal" class="mb-4">{{ articleError }}</v-alert>

      <article v-if="fullArticle" class="member-blog-article">
          <figure v-if="coverMedia(fullArticle || selectedPage)" class="member-blog-article__hero">
            <CoverImage
              :src="coverMedia(fullArticle || selectedPage).url"
              :alt="coverMedia(fullArticle || selectedPage).legende || selectedPage.titre"
            />
          </figure>

        <header class="member-blog-article__header">
          <v-chip size="small" variant="tonal" color="primary" class="text-none">
            <v-icon start size="14">{{ categoryMeta(selectedPage.categorie).icon }}</v-icon>
            {{ categoryMeta(selectedPage.categorie).label }}
          </v-chip>
          <h2 class="member-blog-article__title">{{ selectedPage.titre }}</h2>
        </header>

        <div class="member-blog-article__body">
          <section
            v-for="(block, index) in selectedLayout.sections"
            :key="index"
            class="member-blog-article__section"
          >
            <h3 v-if="block.heading" class="member-blog-article__heading">{{ block.heading }}</h3>

            <figure
              v-for="(media, mediaIndex) in block.images"
              :key="`${selectedPage.id}-img-${index}-${mediaIndex}`"
              class="member-blog-article__inline-figure"
            >
              <CoverImage :src="media.url" :alt="media.legende || selectedPage.titre" />
            </figure>

            <div class="member-blog-article__paragraphs">
              <p v-for="(line, lineIndex) in block.lines" :key="lineIndex">
                <template v-if="line.kind === 'link'">
                  <a :href="line.url" target="_blank" rel="noopener noreferrer">{{ line.label }}</a>
                </template>
                <template v-else-if="line.kind === 'video'">
                  <a :href="line.url" target="_blank" rel="noopener noreferrer">Voir la vidéo</a>
                </template>
                <template v-else>{{ line.text }}</template>
              </p>
            </div>

            <figure
              v-for="(media, mediaIndex) in block.videos"
              :key="`${selectedPage.id}-vid-${index}-${mediaIndex}`"
              class="member-blog-article__figure"
            >
              <iframe
                v-if="media.type === 'youtube'"
                :src="media.url"
                class="member-blog-article__youtube"
                title="Vidéo"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
              />
              <video v-else :src="media.url" controls preload="metadata" />
            </figure>
          </section>
        </div>

        <div v-if="selectedLayout.gallery.length" class="member-blog-article__gallery">
          <figure
            v-for="(media, index) in selectedLayout.gallery"
            :key="`${selectedPage.id}-gallery-${index}`"
            class="member-blog-article__figure"
          >
            <CoverImage
              v-if="media.type === 'image'"
              :src="media.url"
              :alt="media.legende || selectedPage.titre"
            />
            <iframe
              v-else-if="media.type === 'youtube'"
              :src="media.url"
              class="member-blog-article__youtube"
              title="Vidéo"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            />
            <video v-else :src="media.url" controls preload="metadata" />
            <figcaption v-if="media.legende">{{ media.legende }}</figcaption>
          </figure>
        </div>
      </article>
    </template>

    <template v-else>
      <p class="member-blog__intro">
        Guides, tutos et infos du cercle — comme dans l’app Glide.
      </p>

      <div class="member-blog__filters d-flex flex-wrap ga-2 mb-4">
        <v-chip
          :color="categoryFilter === 'tous' ? 'primary' : undefined"
          :variant="categoryFilter === 'tous' ? 'flat' : 'outlined'"
          size="small"
          class="text-none"
          @click="categoryFilter = 'tous'"
        >
          Tous
        </v-chip>
        <v-chip
          v-for="category in availableCategories"
          :key="category.id"
          :color="categoryFilter === category.id ? 'primary' : undefined"
          :variant="categoryFilter === category.id ? 'flat' : 'outlined'"
          size="small"
          class="text-none"
          @click="categoryFilter = category.id"
        >
          <v-icon start size="14">{{ category.icon }}</v-icon>
          {{ category.label }}
        </v-chip>
      </div>

      <div v-if="filteredPages.length || showAgendaCard" class="member-blog__feed">
        <article
          v-if="showAgendaCard"
          class="member-blog-card member-blog-card--agenda"
          tabindex="0"
          role="button"
          @click="goToAgendaInscriptions"
          @keydown.enter="goToAgendaInscriptions"
        >
          <div class="member-blog-card__cover member-blog-card__cover--placeholder">
            <v-icon size="32" color="deep-orange">mdi-calendar-check</v-icon>
          </div>
          <div class="member-blog-card__body">
            <v-chip size="x-small" variant="tonal" color="deep-orange" class="text-none mb-2">
              Agenda
            </v-chip>
            <h3 class="member-blog-card__title">S’inscrire aux sorties de l’année</h3>
            <p class="member-blog-card__excerpt">
              Indiquez votre présence (1 présent, 0 absent, ? peut-être) directement dans l’agenda,
              à la place du tableur Excel.
            </p>
            <span class="member-blog-card__cta">
              Ouvrir l’agenda
              <v-icon size="16">mdi-arrow-right</v-icon>
            </span>
          </div>
        </article>
        <article
          v-for="page in filteredPages"
          :key="page.id"
          class="member-blog-card"
          tabindex="0"
          role="button"
          @click="openArticle(page.id)"
          @keydown.enter="openArticle(page.id)"
        >
          <figure v-if="coverMedia(page)" class="member-blog-card__cover">
            <CoverImage
              :src="coverMedia(page).url"
              :alt="coverMedia(page).legende || page.titre"
            />
          </figure>
          <div v-else class="member-blog-card__cover member-blog-card__cover--placeholder">
            <v-icon size="32" color="primary">{{ categoryMeta(page.categorie).icon }}</v-icon>
          </div>

          <div class="member-blog-card__body">
            <v-chip size="x-small" variant="tonal" color="primary" class="text-none mb-2">
              {{ categoryMeta(page.categorie).label }}
            </v-chip>
            <h3 class="member-blog-card__title">{{ page.titre }}</h3>
            <p class="member-blog-card__excerpt">{{ cardExcerpt(page) }}</p>
            <span class="member-blog-card__cta">
              Lire l’article
              <v-icon size="16">mdi-arrow-right</v-icon>
            </span>
          </div>
        </article>
      </div>

      <v-alert v-else type="info" variant="tonal">Aucun article pour ce filtre.</v-alert>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/services/api'
import {
  CONTENT_CATEGORIES,
  articleLayout,
  contentCategoryMeta,
  contentCoverMedia,
  contentExcerpt,
  filterPublishedPages,
} from '@/domain/content'
import CoverImage from '@/components/CoverImage.vue'

const props = defineProps({
  pages: { type: Array, default: () => [] },
})

const route = useRoute()
const router = useRouter()
const categoryFilter = ref(route.query.categorie || 'tous')
const selectedArticleId = ref(route.query.article || '')
const fullPages = ref({})
const articleLoading = ref(false)
const articleError = ref('')

const publishedPages = computed(() => filterPublishedPages(props.pages))

const availableCategories = computed(() => {
  const ids = new Set(publishedPages.value.map((page) => page.categorie))
  return CONTENT_CATEGORIES.filter((category) => ids.has(category.id))
})

const filteredPages = computed(() => {
  if (categoryFilter.value === 'tous') return publishedPages.value
  return publishedPages.value.filter((page) => page.categorie === categoryFilter.value)
})

const selectedPage = computed(() =>
  publishedPages.value.find((page) => page.id === selectedArticleId.value) || null,
)

const fullArticle = computed(() => fullPages.value[selectedArticleId.value] || null)

const selectedLayout = computed(() =>
  fullArticle.value ? articleLayout(fullArticle.value) : { sections: [], gallery: [] },
)

const showAgendaCard = computed(
  () => !selectedPage.value && (categoryFilter.value === 'tous' || categoryFilter.value === 'commencer_danse'),
)

watch(
  () => route.query.categorie,
  (value) => {
    if (value) categoryFilter.value = value
  },
)

watch(
  () => route.query.article,
  (value) => {
    selectedArticleId.value = value || ''
  },
)

watch(selectedArticleId, (value) => {
  const query = { ...route.query }
  if (value) {
    query.onglet = 'infos'
    query.article = value
  } else {
    delete query.article
  }
  router.replace({ query }).catch(() => {})
})

watch(
  selectedArticleId,
  async (id) => {
    if (!id || fullPages.value[id]) return
    const existing = publishedPages.value.find((page) => page.id === id)
    if (existing && existing.corps != null) {
      fullPages.value = { ...fullPages.value, [id]: existing }
      return
    }
    articleLoading.value = true
    articleError.value = ''
    try {
      const page = await api.publicPage(id)
      fullPages.value = { ...fullPages.value, [id]: page }
    } catch (err) {
      articleError.value = err.message || 'Impossible de charger l’article.'
    } finally {
      articleLoading.value = false
    }
  },
  { immediate: true },
)

function categoryMeta(category) {
  return contentCategoryMeta(category)
}

function coverMedia(page) {
  return contentCoverMedia(page)
}

function cardExcerpt(page) {
  if (page?.excerpt) return page.excerpt
  return contentExcerpt(page?.corps)
}

function openArticle(id) {
  selectedArticleId.value = id
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function closeArticle() {
  selectedArticleId.value = ''
}

function goToAgendaInscriptions() {
  router.replace({ query: { onglet: 'agenda', inscriptions: '1' } }).catch(() => {})
}
</script>

<style scoped>
.member-blog__intro {
  margin: 0 0 16px;
  color: rgba(44, 51, 44, 0.72);
  line-height: 1.5;
}

.member-blog__back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 16px;
  padding: 0;
  border: 0;
  background: none;
  color: rgb(var(--v-theme-primary));
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
}

.member-blog__feed {
  display: grid;
  gap: 16px;
}

@media (min-width: 720px) {
  .member-blog__feed {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.member-blog-card {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid rgba(71, 91, 145, 0.14);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.member-blog-card:hover,
.member-blog-card:focus-visible {
  box-shadow: 0 8px 28px rgba(44, 51, 74, 0.1);
  transform: translateY(-2px);
  outline: none;
}

.member-blog-card__cover {
  margin: 0;
  aspect-ratio: 16 / 9;
  background: rgba(71, 91, 145, 0.06);
  overflow: hidden;
}

.member-blog-card__cover :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-blog-card__cover--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.member-blog-card__body {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 14px 16px 16px;
}

.member-blog-card__title {
  margin: 0 0 8px;
  font-size: 1.08rem;
  line-height: 1.3;
}

.member-blog-card__excerpt {
  margin: 0;
  flex: 1;
  font-size: 0.92rem;
  line-height: 1.5;
  color: rgba(44, 51, 44, 0.72);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.member-blog-card__cta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
  font-size: 0.88rem;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}

.member-blog-article {
  background: #fff;
  border: 1px solid rgba(71, 91, 145, 0.12);
  border-radius: 18px;
  overflow: hidden;
}

.member-blog-article__hero {
  margin: 0;
  aspect-ratio: 16 / 9;
  max-height: 360px;
  overflow: hidden;
  background: rgba(71, 91, 145, 0.06);
}

.member-blog-article__hero :deep(img) {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-blog-article__header {
  padding: 20px 20px 0;
}

.member-blog-article__title {
  margin: 12px 0 0;
  font-size: clamp(1.35rem, 4vw, 1.75rem);
  line-height: 1.25;
}

.member-blog-article__body {
  padding: 20px;
}

.member-blog-article__heading {
  margin: 24px 0 10px;
  font-size: 1.05rem;
  font-weight: 700;
  color: rgba(44, 51, 74, 0.92);
}

.member-blog-article__heading:first-child {
  margin-top: 0;
}

.member-blog-article__section {
  margin-bottom: 8px;
}

.member-blog-article__section:first-child .member-blog-article__heading {
  margin-top: 0;
}

.member-blog-article__inline-figure {
  margin: 0 0 14px;
  aspect-ratio: 16 / 9;
  max-height: 280px;
  overflow: hidden;
  border-radius: 12px;
  background: rgba(71, 91, 145, 0.06);
}

.member-blog-article__inline-figure :deep(img) {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-blog-article__paragraphs p {
  margin: 0 0 10px;
  line-height: 1.65;
  white-space: pre-wrap;
}

.member-blog-article__paragraphs a {
  color: rgb(var(--v-theme-primary));
  word-break: break-word;
}

.member-blog-article__gallery {
  display: grid;
  gap: 16px;
  padding: 0 20px 20px;
}

@media (min-width: 720px) {
  .member-blog-article__gallery {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.member-blog-article__figure {
  margin: 0;
}

.member-blog-article__figure :deep(img),
.member-blog-article__figure video,
.member-blog-article__youtube {
  display: block;
  width: 100%;
  border-radius: 12px;
  background: rgba(44, 51, 44, 0.04);
}

.member-blog-article__youtube {
  aspect-ratio: 16 / 9;
  border: 0;
  min-height: 200px;
}

.member-blog-article__figure figcaption {
  margin-top: 6px;
  font-size: 0.86rem;
  color: rgba(44, 51, 44, 0.68);
}

.member-blog__filters {
  overflow-x: auto;
  padding-bottom: 2px;
}
</style>
