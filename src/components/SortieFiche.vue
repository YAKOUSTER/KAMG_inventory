<template>
  <article :class="embedded ? 'sortie-fiche sortie-fiche--embedded' : 'sortie-fiche'">
    <header v-if="!embedded" class="sortie-fiche__header">
      <img :src="LOGO_SRC" :alt="GROUP_NAME" class="sortie-fiche__logo" />
      <div class="sortie-fiche__title-box">
        <h2 class="sortie-fiche__title">{{ titre || 'Nom de la sortie' }}</h2>
        <p class="sortie-fiche__season">{{ season }}</p>
      </div>
    </header>

    <div class="sortie-fiche__grid sortie-fiche__grid--top">
      <div class="sortie-fiche__field">
        <div class="sortie-fiche__label">Date</div>
        <div class="sortie-fiche__value">{{ dateLabel || '—' }}</div>
      </div>
      <div class="sortie-fiche__field">
        <div class="sortie-fiche__label">Lieu de la sortie</div>
        <div class="sortie-fiche__value">{{ lieu || '—' }}</div>
      </div>
      <div class="sortie-fiche__field">
        <div class="sortie-fiche__label">Type de sortie</div>
        <div class="sortie-fiche__value">
          <v-select
            v-if="editable"
            v-model="sortie.format"
            :items="selectItems(SORTIE_FORMATS)"
            hide-details
            density="compact"
            variant="solo"
            bg-color="#ececec"
            rounded="lg"
          />
          <SortieReadValue v-else :options="SORTIE_FORMATS" :id="sortie.format" />
        </div>
      </div>
      <div class="sortie-fiche__field">
        <div class="sortie-fiche__label">Accompagnement musical</div>
        <div class="sortie-fiche__value">
          <v-select
            v-if="editable"
            v-model="sortie.musique"
            :items="selectItems(MUSIQUE_TYPES)"
            hide-details
            density="compact"
            variant="solo"
            bg-color="#ececec"
            rounded="lg"
          />
          <SortieReadValue v-else :options="MUSIQUE_TYPES" :id="sortie.musique" />
        </div>
      </div>
      <div class="sortie-fiche__field">
        <div class="sortie-fiche__label">Nombre de danseurs inscrits</div>
        <div class="sortie-fiche__value">{{ dancerCountLabel }}</div>
      </div>
      <div class="sortie-fiche__field">
        <div class="sortie-fiche__label">Responsable de la sortie</div>
        <div class="sortie-fiche__value">
          <v-combobox
            v-if="editable"
            v-model="sortie.responsable"
            :items="personItems"
            hide-details
            density="compact"
            variant="solo"
            bg-color="#ececec"
            rounded="lg"
          />
          <span v-else>{{ sortie.responsable || '—' }}</span>
        </div>
      </div>
    </div>

    <h3 class="sortie-fiche__banner">Information sur le déplacement</h3>
    <div class="sortie-fiche__grid">
      <div class="sortie-fiche__field">
        <div class="sortie-fiche__label">Type de transport</div>
        <div class="sortie-fiche__value">
          <v-select
            v-if="editable"
            v-model="sortie.transport"
            :items="selectItems(TRANSPORT_TYPES)"
            hide-details
            density="compact"
            variant="solo"
            bg-color="#ececec"
            rounded="lg"
          />
          <SortieReadValue v-else :options="TRANSPORT_TYPES" :id="sortie.transport" />
        </div>
      </div>
      <div class="sortie-fiche__field">
        <div class="sortie-fiche__label">Parking prévu par le festival</div>
        <div class="sortie-fiche__value">
          <SortiePendingSelect
            v-if="editable"
            v-model="sortie.parkingFestival"
            :options="TRI_STATE"
          />
          <SortieReadValue v-else :options="TRI_STATE" :id="sortie.parkingFestival" />
        </div>
      </div>
      <div class="sortie-fiche__field">
        <div class="sortie-fiche__label">Heure de rendez-vous</div>
        <div class="sortie-fiche__value">
          <v-text-field
            v-if="editable"
            v-model="sortie.rdvHeure"
            type="time"
            hide-details
            density="compact"
            variant="solo"
            bg-color="#ececec"
            rounded="lg"
          />
          <span v-else>{{ displayHourLabel(sortie.rdvHeure) || '—' }}</span>
        </div>
      </div>
      <div class="sortie-fiche__field">
        <div class="sortie-fiche__label">Lieu de rendez-vous</div>
        <div class="sortie-fiche__value">
          <v-text-field
            v-if="editable"
            v-model="sortie.rdvLieu"
            hide-details
            density="compact"
            variant="solo"
            bg-color="#ececec"
            rounded="lg"
          />
          <span v-else>{{ sortie.rdvLieu || '—' }}</span>
        </div>
      </div>
      <div class="sortie-fiche__field">
        <div class="sortie-fiche__label">Heure de retour</div>
        <div class="sortie-fiche__value">
          <v-text-field
            v-if="editable"
            v-model="sortie.retourHeure"
            type="time"
            hide-details
            density="compact"
            variant="solo"
            bg-color="#ececec"
            rounded="lg"
          />
          <span v-else>{{ displayHourLabel(sortie.retourHeure) || '—' }}</span>
        </div>
      </div>
      <div class="sortie-fiche__field">
        <div class="sortie-fiche__label">Lieu de retour</div>
        <div class="sortie-fiche__value">
          <v-text-field
            v-if="editable"
            v-model="sortie.retourLieu"
            hide-details
            density="compact"
            variant="solo"
            bg-color="#ececec"
            rounded="lg"
          />
          <span v-else>{{ sortie.retourLieu || '—' }}</span>
        </div>
      </div>
    </div>
    <v-textarea
      v-if="editable"
      v-model="sortie.deplacementNotes"
      hide-details
      rows="3"
      auto-grow
      placeholder="Précisions sur le déplacement, covoiturage, arrêts…"
      variant="solo"
      bg-color="#f7f7f4"
      rounded="lg"
      class="mt-2"
    />
    <p v-else-if="sortie.deplacementNotes" class="sortie-fiche__notes">{{ sortie.deplacementNotes }}</p>

    <div class="sortie-fiche__split">
      <section>
        <h3 class="sortie-fiche__banner">Costume</h3>
        <div class="sortie-fiche__grid sortie-fiche__grid--2">
          <div class="sortie-fiche__field">
            <div class="sortie-fiche__label">Vêtement</div>
            <div class="sortie-fiche__value">
              <v-select
                v-if="editable"
                v-model="sortie.costume"
                :items="selectItems(COSTUME_TYPES)"
                hide-details
                density="compact"
                variant="solo"
                bg-color="#ececec"
                rounded="lg"
              />
              <SortieReadValue v-else :options="COSTUME_TYPES" :id="sortie.costume" />
            </div>
          </div>
          <div class="sortie-fiche__field">
            <div class="sortie-fiche__label">Prévoir un change</div>
            <div class="sortie-fiche__value">
              <SortiePendingSelect
                v-if="editable"
                v-model="sortie.change"
                :options="TRI_STATE"
              />
              <SortieReadValue v-else :options="TRI_STATE" :id="sortie.change" />
            </div>
          </div>
        </div>
      </section>
      <section>
        <h3 class="sortie-fiche__banner">Accessoires</h3>
        <v-textarea
          v-if="editable"
          v-model="sortie.accessoires"
          hide-details
          rows="3"
          auto-grow
          placeholder="Coiffe, tablier, chaussures…"
          variant="solo"
          bg-color="#f7f7f4"
          rounded="lg"
        />
        <p v-else-if="sortie.accessoires" class="sortie-fiche__notes">{{ sortie.accessoires }}</p>
      </section>
    </div>

    <h3 class="sortie-fiche__banner">Repas</h3>
    <div class="sortie-fiche__grid">
      <div class="sortie-fiche__field">
        <div class="sortie-fiche__label">Repas du midi</div>
        <div class="sortie-fiche__value">
          <SortiePendingSelect
            v-if="editable"
            v-model="sortie.repasMidi"
            :options="REPAS_TYPES"
          />
          <SortieReadValue v-else :options="REPAS_TYPES" :id="sortie.repasMidi" />
        </div>
      </div>
      <div class="sortie-fiche__field">
        <div class="sortie-fiche__label">Repas du soir</div>
        <div class="sortie-fiche__value">
          <SortiePendingSelect
            v-if="editable"
            v-model="sortie.repasSoir"
            :options="REPAS_TYPES"
          />
          <SortieReadValue v-else :options="REPAS_TYPES" :id="sortie.repasSoir" />
        </div>
      </div>
      <div class="sortie-fiche__field">
        <div class="sortie-fiche__label">Prévoir une gourde d’eau</div>
        <div class="sortie-fiche__value">
          <SortiePendingSelect
            v-if="editable"
            v-model="sortie.gourde"
            :options="TRI_STATE"
          />
          <SortieReadValue v-else :options="TRI_STATE" :id="sortie.gourde" />
        </div>
      </div>
    </div>
    <v-textarea
      v-if="editable"
      v-model="sortie.repasNotes"
      hide-details
      rows="3"
      auto-grow
      placeholder="Allergies, organisation du pique-nique…"
      variant="solo"
      bg-color="#f7f7f4"
      rounded="lg"
      class="mt-2"
    />
    <p v-else-if="sortie.repasNotes" class="sortie-fiche__notes">{{ sortie.repasNotes }}</p>

    <h3 class="sortie-fiche__banner">Détail du programme</h3>
    <v-textarea
      v-if="editable"
      v-model="sortie.programme"
      hide-details
      rows="4"
      auto-grow
      placeholder="Horaires, défilé, spectacle, consignes…"
      variant="solo"
      bg-color="#f7f7f4"
      rounded="lg"
    />
    <p v-else-if="sortie.programme" class="sortie-fiche__notes">{{ sortie.programme }}</p>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { GROUP_NAME, LOGO_SRC } from '@/domain/brand'
import { personDisplayName } from '@/domain/person'
import {
  COSTUME_TYPES,
  MUSIQUE_TYPES,
  REPAS_TYPES,
  SORTIE_FORMATS,
  TRANSPORT_TYPES,
  TRI_STATE,
  displayHourLabel,
  seasonLabel,
  selectItems,
  sortieDateLabel,
} from '@/domain/sortie'
import SortieReadValue from '@/components/SortieReadValue.vue'
import SortiePendingSelect from '@/components/SortiePendingSelect.vue'

const props = defineProps({
  titre: { type: String, default: '' },
  debut: { type: String, default: '' },
  lieu: { type: String, default: '' },
  sortie: { type: Object, required: true },
  dancerCount: { type: Number, default: null },
  people: { type: Array, default: () => [] },
  editable: { type: Boolean, default: false },
  embedded: { type: Boolean, default: false },
})

const season = computed(() => seasonLabel(props.debut))
const dateLabel = computed(() => sortieDateLabel(props.debut))
const dancerCountLabel = computed(() => (props.dancerCount == null ? '—' : String(props.dancerCount)))
const personItems = computed(() =>
  props.people.map((person) => personDisplayName(person)).filter(Boolean),
)
</script>

<style scoped>
.sortie-fiche {
  background: #fff;
  border: 1px solid var(--kamg-border);
  border-radius: 16px;
  padding: 16px;
  color: #2c332c;
}

.sortie-fiche--embedded {
  background: transparent;
  border: 0;
  border-radius: 0;
  padding: 0;
}

.sortie-fiche__header {
  display: flex;
  align-items: stretch;
  gap: 12px;
  margin-bottom: 16px;
}

.sortie-fiche__logo {
  width: 64px;
  height: 64px;
  object-fit: contain;
  flex-shrink: 0;
}

.sortie-fiche__title-box {
  flex: 1;
  background: var(--kamg-deep);
  color: #fff;
  border-radius: 8px;
  padding: 10px 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.sortie-fiche__title {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  line-height: 1.2;
}

.sortie-fiche__season {
  margin: 4px 0 0;
  opacity: 0.9;
  font-size: 0.92rem;
}

.sortie-fiche__banner {
  background: var(--kamg-deep);
  color: #fff;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  margin: 16px 0 10px;
  padding: 6px 14px;
  border-radius: 6px;
}

.sortie-fiche__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
}

.sortie-fiche__grid--top {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.sortie-fiche__grid--2 {
  grid-template-columns: 1fr;
}

.sortie-fiche__split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.sortie-fiche__label {
  font-size: 0.78rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.sortie-fiche__value {
  min-height: 36px;
  display: flex;
  align-items: center;
}

.sortie-fiche__notes {
  white-space: pre-wrap;
  margin: 8px 0 0;
  font-size: 0.92rem;
  color: rgba(44, 51, 44, 0.78);
}

.sortie-fiche :deep(.v-field) {
  box-shadow: none;
}

@media (max-width: 800px) {
  .sortie-fiche__grid,
  .sortie-fiche__grid--top,
  .sortie-fiche__split {
    grid-template-columns: 1fr;
  }
}
</style>
