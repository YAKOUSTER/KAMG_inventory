<template>
  <div v-if="item">
    <div class="d-flex flex-wrap align-center ga-3 page-header">
      <v-btn variant="text" to="/inventaire" prepend-icon="mdi-arrow-left">Inventaire</v-btn>
      <v-spacer />
      <v-btn
        v-if="canLoan"
        color="primary"
        :disabled="cart.isInCart(item.id)"
        @click="addToCart"
      >
        {{ cart.isInCart(item.id) ? 'Déjà au panier' : 'Ajouter au panier' }}
      </v-btn>
      <v-btn
        v-if="auth.can('items.update')"
        variant="tonal"
        :to="{ name: 'item-edit', params: { id: item.id } }"
        prepend-icon="mdi-pencil"
      >
        Modifier
      </v-btn>
      <v-btn v-if="auth.can('items.delete')" variant="text" color="error" @click="remove">Supprimer</v-btn>
    </div>

    <v-row>
      <v-col cols="12" md="5">
        <ImageGallery :item="item" :items="inventory.items" :placeholder-icon="categoryIcon(item.categorie, referentiels)" />
      </v-col>
      <v-col cols="12" md="7">
        <div class="text-overline">{{ item.code }} · {{ categoryLabel(item.categorie, referentiels) }}</div>
        <h1 class="text-h4 page-title mb-2">{{ item.nom }}</h1>
        <div class="text-subtitle-1 mb-3">{{ item.type }}</div>
        <StatusChip :status="item.disponibilite" />
        <div class="detail-rows mt-5">
          <DetailRow v-for="row in facts" :key="row.label" :label="row.label" :value="row.value || '—'" />
        </div>
      </v-col>
    </v-row>

    <p v-if="usesInheritedPhotos(item) && item.photoSource" class="text-body-2 text-medium-emphasis mb-4">
      Photos partagées depuis
      <router-link :to="{ name: 'item-detail', params: { id: item.photoSource.id } }">
        {{ item.photoSource.code }} — {{ item.photoSource.nom }}
      </router-link>.
    </p>

    <section v-if="pendingTasks.length" class="page-block">
      <h2 class="section-label">Actions à faire</h2>
      <v-list lines="two">
        <v-list-item v-for="task in pendingTasks" :key="task.id">
          <v-list-item-title>{{ task.text }}</v-list-item-title>
          <template #append>
            <v-btn
              v-if="auth.can('items.update')"
              size="small"
              variant="text"
              color="primary"
              @click="markTaskDone(task.id)"
            >
              Fait
            </v-btn>
          </template>
        </v-list-item>
      </v-list>
    </section>

    <section v-if="item?.categorie === 'fourniture'" class="page-block">
      <ItemStockPanel
        :item="item"
        :can-edit="auth.can('items.update')"
        @updated="onStockUpdated"
      />
    </section>

    <section class="page-block">
      <h2 class="section-label">Description</h2>
      <p class="text-multiline text-body-1">{{ item.description || 'Pas de description.' }}</p>
      <p v-if="item.motif" class="text-multiline"><strong>Motif :</strong> {{ item.motif }}</p>
      <p v-if="item.notesConservation" class="text-multiline"><strong>Conservation :</strong> {{ item.notesConservation }}</p>
    </section>

    <section v-if="measureRows.length" class="page-block">
      <h2 class="section-label">Mesures</h2>
      <v-table class="measure-table" density="compact">
        <tbody>
          <tr v-for="row in measureRows" :key="row.label">
            <td>{{ row.label }}</td>
            <td :class="{ 'measure-table--empty': row.value == null || row.value === '' }">
              {{ row.value ?? 'À compléter' }}
            </td>
          </tr>
        </tbody>
      </v-table>
    </section>

    <section v-if="item.linkedItems?.length" class="page-block">
      <h2 class="section-label">Pièces liées</h2>
      <v-row>
        <v-col v-for="linked in item.linkedItems" :key="linked.id" cols="12" sm="6" md="4">
          <ItemCard :item="linked" />
        </v-col>
      </v-row>
    </section>

    <section v-if="item.attachments?.length" class="page-block">
      <h2 class="section-label">Pièces jointes</h2>
      <v-list lines="two" class="attachment-list">
        <v-list-item v-for="att in item.attachments" :key="att.id">
          <template #prepend>
            <a :href="att.src" target="_blank" rel="noopener" class="attachment-thumb">
              <v-img
                v-if="isImageAttachment(att)"
                :src="att.src"
                width="56"
                height="56"
                cover
                class="rounded"
              />
              <v-icon v-else size="40" color="error">mdi-file-pdf-box</v-icon>
            </a>
          </template>
          <v-list-item-title>
            <a :href="att.src" target="_blank" rel="noopener">
              {{ att.label || att.filename || 'Document' }}
            </a>
          </v-list-item-title>
          <v-list-item-subtitle v-if="att.label && att.filename">
            {{ att.filename }}
          </v-list-item-subtitle>
        </v-list-item>
      </v-list>
    </section>

    <section class="page-block">
      <h2 class="section-label">Historique des emprunts</h2>
      <v-list v-if="item.loanHistory?.length">
        <v-list-item
          v-for="entry in item.loanHistory"
          :key="entry.loanId"
          :to="{ name: 'loan-detail', params: { id: entry.loanId } }"
          :title="`${entry.personName} — ${displayDate(entry.dateEmprunt)}`"
          :subtitle="`Retour : ${entry.dateRetour ? displayDate(entry.dateRetour) : 'en cours'}${entry.comment ? ' · ' + entry.comment : ''}`"
        />
      </v-list>
      <p v-else class="text-medium-emphasis">Aucun emprunt enregistré pour cette fiche.</p>
    </section>
  </div>
  <v-skeleton-loader v-else-if="loading" type="article, list-item-two-line" />
  <v-alert v-else-if="error" type="error">{{ error }}</v-alert>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/services/api'
import { useCartStore } from '@/stores/cart'
import { useInventoryStore } from '@/stores/inventory'
import { useAuthStore } from '@/stores/auth'
import { MEASUREMENT_FIELDS, categoryIcon, categoryLabel, visibleMeasurements } from '@/domain/taxonomy'
import { isLoanable } from '@/domain/item'
import { isImageAttachment } from '@/domain/attachments'
import { useUiStore } from '@/stores/ui'
import { displayDate } from '@/domain/dates'
import ItemCard from '@/components/ItemCard.vue'
import DetailRow from '@/components/DetailRow.vue'
import StatusChip from '@/components/StatusChip.vue'
import ItemStockPanel from '@/components/ItemStockPanel.vue'
import ImageGallery from '@/components/ImageGallery.vue'
import { formatStock } from '@/domain/stock'
import { usesInheritedPhotos } from '@/domain/images'
import { countOpenTasks, openTasks, completeTask, syncDisponibiliteAfterReturn } from '@/domain/itemTasks'
import { personDisplayName } from '@/domain/person'

const props = defineProps({ id: { type: String, required: true } })
const router = useRouter()
const cart = useCartStore()
const inventory = useInventoryStore()
const auth = useAuthStore()
const item = ref(null)
const error = ref('')
const loading = ref(false)
const ui = useUiStore()
const referentiels = computed(() => inventory.resolvedReferentiels)

const canLoan = computed(() => auth.can('loans.write') && isLoanable(item.value))

const pendingTasks = computed(() => openTasks(item.value))

async function markTaskDone(taskId) {
  if (!item.value) return
  const next = structuredClone(item.value)
  completeTask(next, taskId)
  syncDisponibiliteAfterReturn(next)
  try {
    item.value = await api.updateItem(item.value.id, next)
    inventory.upsertItem(item.value)
    ui.notify('Action marquée comme faite')
  } catch (err) {
    error.value = err.message
  }
}

const facts = computed(() => {
  if (!item.value) return []
  const rows = [
    { label: 'Époque', value: item.value.epoque },
    { label: 'Origine', value: item.value.origine },
    { label: 'Matière', value: item.value.materiau },
    { label: 'Composition', value: item.value.composition },
    { label: 'Couleur', value: item.value.couleur },
    { label: 'État', value: item.value.etat },
    {
      label: 'Propreté',
      value: item.value.propre == null ? '' : item.value.propre ? 'Propre' : 'Sale',
    },
    { label: 'Propriétaire', value: item.value.proprietaire },
    { label: 'Localisation', value: item.value.localisation },
  ]
  if (item.value.propre === false && item.value.pressingPayePar) {
    rows.push({
      label: 'Pressing payé par',
      value:
        item.value.pressingPayePar === 'cercle'
          ? 'Le cercle'
          : personDisplayName(inventory.personById(item.value.pressingPayeParPersonId)) || 'Une personne',
    })
  }
  if (item.value.categorie === 'fourniture') {
    rows.push(
      { label: 'Stock', value: formatStock(item.value) },
      { label: 'Seuil d’alerte', value: item.value.stockSeuil != null ? `${item.value.stockSeuil} ${item.value.stockUnite}` : '' },
      { label: 'Fournisseur', value: item.value.fournisseur },
      { label: 'Réf. fournisseur', value: item.value.stockReference },
    )
  }
  if (item.value.categorie === 'tissu') {
    rows.push(
      { label: 'Laize', value: item.value.laize ? `${item.value.laize} cm` : '' },
      { label: 'Métrage', value: item.value.metrage ? `${item.value.metrage} m` : '' },
      { label: 'Fournisseur', value: item.value.fournisseur },
    )
  }
  if (item.value.categorie === 'echantillon') {
    rows.push(
      { label: 'Format', value: [item.value.largeurEchantillon, item.value.hauteurEchantillon].filter(Boolean).join(' × ') + (item.value.largeurEchantillon ? ' cm' : '') },
      { label: 'Armure', value: item.value.armure },
    )
  }
  if (item.value.categorie === 'piece_collection') {
    rows.push(
      { label: 'N° inventaire', value: item.value.numeroInventaire },
      { label: 'Provenance', value: item.value.provenance },
      { label: 'Acquisition', value: [item.value.modeAcquisition, item.value.dateAcquisition].filter(Boolean).join(' · ') },
    )
  }
  return rows.filter((row) => row.value)
})

const measureRows = computed(() => {
  if (!item.value) return []
  const vis = visibleMeasurements(item.value.type)
  const rows = MEASUREMENT_FIELDS.filter((field) => vis[field.key]).map((field) => ({
    label: field.label,
    value: item.value[field.key],
  }))
  if (item.value.variable) {
    rows.push({ label: item.value.variable, value: item.value.longueurVariable })
  }
  return rows
})

async function load() {
  error.value = ''
  loading.value = true
  try {
    item.value = await api.item(props.id)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function onStockUpdated(saved) {
  item.value = saved
  inventory.upsertItem(saved)
}

function addToCart() {
  cart.add(item.value)
  ui.notify(`${item.value.code} ajoutée au panier`, { to: '/panier', action: 'Panier' })
}

async function remove() {
  if (!confirm('Supprimer cette fiche ?')) return
  try {
    await api.deleteItem(props.id)
    inventory.removeItem(props.id)
    ui.notify('Fiche supprimée')
    router.push('/inventaire')
  } catch (err) {
    error.value = err.message
  }
}

watch(() => props.id, load, { immediate: true })
</script>

<style scoped>
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
