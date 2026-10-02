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
            :class="{
              'has-image': block.images.length,
              'is-flip': block.imageSide === 'left',
            }"
          >
            <div class="member-blog-article__copy">
              <h3 v-if="block.heading" class="member-blog-article__heading">{{ block.heading }}</h3>
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
            </div>
            <div v-if="block.images.length" class="member-blog-article__media">
              <figure
                v-for="(media, mediaIndex) in block.images"
                :key="`${selectedPage.id}-img-${index}-${mediaIndex}`"
                class="member-blog-article__inline-figure"
              >
                <CoverImage :src="media.url" :alt="media.legende || selectedPage.titre" />
                <figcaption v-if="media.legende && media.legende !== block.heading">{{ media.legende }}</figcaption>
              </figure>
            </div>
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
      <nav v-if="lots.length > 1" class="member-blog__lots-nav" aria-label="Rubriques">
        <a
          v-for="lot in lots"
          :key="lot.id"
          class="member-blog__lots-link"
          href="#infos"
          @click.prevent="scrollToLot(lot.id)"
        >
          {{ lot.label }}
        </a>
      </nav>

      <section v-for="lot in lots" :id="`lot-${lot.id}`" :key="lot.id" class="member-blog-lot">
        <h2 class="member-blog-lot__title">{{ lot.label }}</h2>
        <div class="member-blog-lot__pages">
          <button
            v-for="page in lot.pages"
            :key="page.id"
            type="button"
            class="member-blog-lot__page"
            @click="openArticle(page.id)"
          >
            <span class="member-blog-lot__page-title">{{ page.titre }}</span>
            <v-icon size="18">mdi-chevron-right</v-icon>
          </button>
        </div>
      </section>

      <v-alert v-if="!lots.length" type="info" variant="tonal">Aucun article publié.</v-alert>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/services/api'
import {
  articleLayout,
  contentCategoryMeta,
  contentCoverMedia,
  filterPublishedPages,
  groupPagesByCategory,
} from '@/domain/content'
import CoverImage from '@/components/CoverImage.vue'

const props = defineProps({
  pages: { type: Array, default: () => [] },
  articleId: { type: String, default: '' },
  lotId: { type: String, default: '' },
})

const route = useRoute()
const router = useRouter()
const selectedArticleId = ref(props.articleId || route.query.article || '')
const fullPages = ref({})
const articleLoading = ref(false)
const articleError = ref('')

const publishedPages = computed(() => filterPublishedPages(props.pages))

const lots = computed(() => groupPagesByCategory(publishedPages.value))

const activeLotId = computed(() => String(props.lotId || route.query.categorie || '').trim())

const selectedPage = computed(() =>
  publishedPages.value.find((page) => page.id === selectedArticleId.value) || null,
)

const fullArticle = computed(() => fullPages.value[selectedArticleId.value] || null)

const selectedLayout = computed(() =>
  fullArticle.value ? articleLayout(fullArticle.value) : { sections: [], gallery: [] },
)

function scrollToLot(categoryId) {
  const id = String(categoryId || '').trim()
  if (!id) return
  const el = document.getElementById(`lot-${id}`)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

watch(
  () => [activeLotId.value, selectedArticleId.value, lots.value.map((lot) => lot.id).join('|')],
  ([lotId, articleId]) => {
    if (!lotId || articleId) return
    nextTick(() => {
      requestAnimationFrame(() => scrollToLot(lotId))
    })
  },
  { immediate: true },
)

watch(
  () => props.articleId,
  (value, previous) => {
    if (value && value !== previous) selectedArticleId.value = value
  },
)

watch(
  () => route.query.article,
  (value) => {
    if (value) {
      selectedArticleId.value = value
      return
    }
    if (!props.articleId) selectedArticleId.value = ''
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

function openArticle(id) {
  selectedArticleId.value = id
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function closeArticle() {
  selectedArticleId.value = ''
}
</script>

<style scoped>
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

.member-blog__lots-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 0.75rem;
  margin-bottom: 1.25rem;
}

.member-blog__lots-link {
  color: var(--kamg-deep);
  font-size: 0.88rem;
  font-weight: 650;
  text-decoration: none;
}

.member-blog__lots-link:hover,
.member-blog__lots-link:focus-visible {
  text-decoration: underline;
  outline: none;
}

.member-blog-lot {
  scroll-margin-top: 1rem;
  margin-bottom: 1.6rem;
}

.member-blog-lot__title {
  margin: 0 0 0.55rem;
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--kamg-ink);
}

.member-blog-lot__pages {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.member-blog-lot__page {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--kamg-border);
  border-radius: 12px;
  background: #fff;
  box-shadow: var(--kamg-shadow);
  cursor: pointer;
  font: inherit;
  color: inherit;
  text-align: left;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}

.member-blog-lot__page:hover,
.member-blog-lot__page:focus-visible {
  border-color: rgba(83, 115, 106, 0.28);
  box-shadow: var(--kamg-shadow-hover);
  outline: none;
}

.member-blog-lot__page-title {
  font-size: 0.98rem;
  font-weight: 650;
  line-height: 1.3;
}

.member-blog-article {
  background: #fff;
  border: 1px solid var(--kamg-border);
  border-radius: var(--kamg-radius);
  box-shadow: var(--kamg-shadow);
  overflow: hidden;
  max-width: 920px;
  margin: 0 auto;
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
  padding: 24px 28px 0;
}

.member-blog-article__title {
  margin: 12px 0 0;
  font-size: clamp(1.35rem, 4vw, 1.75rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.25;
}

.member-blog-article__body {
  padding: 20px 28px 28px;
}

.member-blog-article__heading {
  margin: 0 0 10px;
  font-size: 1.05rem;
  font-weight: 700;
  color: rgba(44, 51, 74, 0.92);
}

.member-blog-article__section {
  margin-bottom: 28px;
}

.member-blog-article__section.has-image {
  display: grid;
  gap: 20px;
  align-items: start;
}

@media (min-width: 800px) {
  .member-blog-article__section.has-image {
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
    gap: 32px;
  }

  .member-blog-article__section.is-flip .member-blog-article__copy {
    order: 2;
  }

  .member-blog-article__section.is-flip .member-blog-article__media {
    order: 1;
  }
}

.member-blog-article__inline-figure {
  margin: 0;
  overflow: hidden;
  border-radius: 12px;
  background: rgba(71, 91, 145, 0.06);
}

.member-blog-article__inline-figure :deep(img) {
  display: block;
  width: 100%;
  height: auto;
  max-height: 360px;
  object-fit: cover;
}

.member-blog-article__inline-figure figcaption {
  margin: 6px 8px 8px;
  font-size: 0.82rem;
  color: rgba(44, 51, 44, 0.62);
}

.member-blog-article__paragraphs {
  max-width: 62ch;
}

.member-blog-article__paragraphs p {
  margin: 0 0 12px;
  line-height: 1.75;
  font-size: 1.02rem;
  white-space: pre-wrap;
}

.member-blog-article__paragraphs a {
  color: rgb(var(--v-theme-primary));
  word-break: break-word;
}

.member-blog-article__gallery {
  display: grid;
  gap: 16px;
  padding: 0 28px 28px;
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
</style>
