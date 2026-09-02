<template>
  <v-form ref="form" @submit.prevent="submit">
    <section class="form-block form-section">
      <h2 class="section-label">Identité</h2>
      <div class="form-fields-grid form-fields-grid--2">
        <FieldRow label="Prénom">
          <v-text-field v-model="person.prenom" hide-details="auto" :rules="[required]" />
        </FieldRow>
        <FieldRow label="Nom">
          <v-text-field
            :model-value="person.nom"
            hide-details="auto"
            :rules="[required]"
            @update:model-value="person.nom = String($event || '').toLocaleUpperCase('fr')"
          />
        </FieldRow>
        <FieldRow label="Nom d’usage">
          <v-text-field
            :model-value="person.nomUsage"
            hide-details
            hint="Nom utilisé au cercle, si différent du nom d’état civil"
            persistent-hint
            @update:model-value="person.nomUsage = String($event || '').toLocaleUpperCase('fr')"
          />
        </FieldRow>
        <FieldRow v-if="showSeasons" label="Adhésions" class="form-fields-grid__span-2">
          <v-select
            v-model="person.saisons"
            :items="seasonItems"
            multiple
            chips
            closable-chips
            hide-details
            label="Années d’adhésion payées"
          />
          <v-checkbox
            :model-value="nouveauChecked"
            class="mt-2"
            hide-details
            :label="`Nouveau · rentrée ${newSeason}`"
            @update:model-value="person.nouveau = $event"
          />
          <p class="text-caption text-medium-emphasis mt-1">
            L’adhésion court d’octobre à octobre (ex. Membre 2025-2026). La saison {{ newSeason }} sert
            pour la rentrée. Le moyen de paiement se coche dans Gestion → Adhésions. Les invités n’ont
            pas d’adhésion.
          </p>
        </FieldRow>
        <FieldRow label="Taille générale">
          <v-select v-model="person.tailleLettre" :items="tailleItems" hide-details />
        </FieldRow>
        <FieldRow label="Téléphone">
          <v-text-field v-model="person.telephone" hide-details />
        </FieldRow>
        <FieldRow label="Courriel">
          <v-text-field v-model="person.email" hide-details />
        </FieldRow>
      </div>

      <div class="mt-6">
        <div class="section-label section-label--inline">Rôles</div>
        <v-chip-group v-model="person.roles" multiple column class="role-chips mt-2">
          <v-chip
            v-for="role in PERSON_ROLES"
            :key="role.id"
            :value="role.id"
            filter
            variant="outlined"
            color="primary"
          >
            {{ role.label }}
          </v-chip>
        </v-chip-group>
      </div>

      <FieldRow label="Notes" align-top class="mt-5">
        <v-textarea v-model="person.notes" hide-details rows="3" placeholder="Contact, remarques…" />
      </FieldRow>
      <FieldRow label="Enfant(s)" class="mt-5" hint="Lien de parenté pour le CA. Les deux parents peuvent pointer vers les mêmes enfants.">
        <v-autocomplete
          v-model="person.childIds"
          :items="familyItems"
          multiple
          chips
          closable-chips
          hide-details="auto"
          placeholder="Relier une fiche enfant"
        />
      </FieldRow>
      <FieldRow label="Parent(s)" class="mt-4" hint="Visible aussi depuis la fiche de l’enfant.">
        <v-autocomplete
          v-model="parentIds"
          :items="familyItems"
          multiple
          chips
          closable-chips
          hide-details="auto"
          placeholder="Relier une fiche parent"
        />
      </FieldRow>
      <FieldRow
        label="Biographie"
        hint="Quelques mots visibles par les membres du même groupe de danse"
        align-top
        class="mt-5"
      >
        <v-textarea
          v-model="person.bio"
          hide-details
          rows="3"
          :maxlength="PERSON_BIO_MAX"
          placeholder="Danse depuis…, ce que j’aime au cercle…"
        />
      </FieldRow>
      <FieldRow
        label="Mémo au Groupe Vêtement"
        hint="Visible par l’atelier costume, aussi saisissable depuis l’onglet Emprunts"
        align-top
        class="mt-5"
      >
        <v-textarea
          v-model="person.noteAtelier"
          hide-details
          rows="3"
          maxlength="1000"
          placeholder="Ex. J’ai laissé ma housse dans le local FLG, je la récupère la semaine prochaine."
        />
      </FieldRow>
    </section>

    <v-expansion-panels class="form-block form-section form-section--flat" variant="accordion">
      <v-expansion-panel>
        <v-expansion-panel-title class="section-label section-label--panel">
          Organigramme du cercle
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <p class="text-body-2 text-medium-emphasis mb-4">
            Cochez les responsabilités pour que la personne apparaisse dans l’onglet Adhérents.
            Les danseurs des groupes Loisir, Ado, Tremplin et Concours y sont déjà listés via leur rôle.
          </p>
          <div v-for="section in orgFormTree" :key="section.id" class="org-form-section">
            <h3 class="org-form-section__title">{{ section.label }}</h3>
            <div class="org-form-section__chips">
              <v-chip
                v-for="slot in section.slots"
                :key="slot.id"
                class="ma-1"
                filter
                :variant="person.tags.includes(slot.id) ? 'flat' : 'outlined'"
                color="primary"
                @click.prevent="toggleOrgTag(slot.id)"
              >
                {{ slot.label }}
              </v-chip>
            </div>
            <div v-for="child in section.children" :key="child.id" class="org-form-child">
              <h4 class="org-form-section__subtitle">{{ child.label }}</h4>
              <div class="org-form-section__chips">
                <v-chip
                  v-for="slot in child.slots"
                  :key="slot.id"
                  class="ma-1"
                  filter
                  :variant="person.tags.includes(slot.id) ? 'flat' : 'outlined'"
                  color="primary"
                  @click.prevent="toggleOrgTag(slot.id)"
                >
                  {{ slot.label }}
                </v-chip>
              </div>
            </div>
            <div v-if="section.afterSlots.length" class="org-form-section__chips mt-2">
              <v-chip
                v-for="slot in section.afterSlots"
                :key="slot.id"
                class="ma-1"
                filter
                :variant="person.tags.includes(slot.id) ? 'flat' : 'outlined'"
                color="primary"
                @click.prevent="toggleOrgTag(slot.id)"
              >
                {{ slot.label }}
              </v-chip>
            </div>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <section class="form-block form-section">
      <h2 class="section-label">Photo</h2>
      <ItemPhotos v-model="person.images" :code="photoCode" variant="avatar" />
    </section>

    <v-expansion-panels class="form-block form-section form-section--flat" variant="accordion">
      <v-expansion-panel>
        <v-expansion-panel-title class="section-label section-label--panel">
          Mensurations pour une tenue complète
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <p class="text-body-2 text-medium-emphasis mb-4">
            Facultatif — utile pour préparer un emprunt complet. Laissez vide ce que vous ne connaissez pas.
          </p>
          <div class="form-fields-grid form-fields-grid--2">
            <FieldRow v-for="field in PERSON_MEASUREMENTS" :key="field.key" :label="field.label">
              <v-text-field v-model.number="person.mesures[field.key]" hide-details type="number" />
            </FieldRow>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <div class="d-flex ga-3 justify-end form-actions">
      <v-btn variant="text" :to="cancelTo">Annuler</v-btn>
      <v-btn type="submit" color="primary" :loading="saving">{{ submitLabel }}</v-btn>
    </div>
  </v-form>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import {
  PERSON_MEASUREMENTS,
  PERSON_ROLES,
  PERSON_BIO_MAX,
  emptyPerson,
  membershipSeasons,
  normalizeRoles,
  normalizeChildIds,
  personDisplayName,
  personSeasons,
  isNewMember,
  canHaveSeasons,
  parentsOf,
} from '@/domain/person'
import { newSeasonId } from '@/domain/seasons'
import { normalizeImages } from '@/domain/images'
import { orgFormSections, normalizeOrgTags } from '@/domain/orgChart'
import FieldRow from './FieldRow.vue'
import ItemPhotos from './ItemPhotos.vue'

const props = defineProps({
  initial: { type: Object, default: null },
  saving: { type: Boolean, default: false },
  submitLabel: { type: String, default: 'Enregistrer' },
  cancelTo: { type: [String, Object], default: '/personnes' },
})
const emit = defineEmits(['save'])
const form = ref(null)
const person = reactive(emptyPerson())
const parentIds = ref([])
const inventory = useInventoryStore()
const tailleItems = computed(() => ['', ...inventory.resolvedReferentiels.tailles])
const showSeasons = computed(() => canHaveSeasons(person))
const newSeason = newSeasonId()
const seasonItems = membershipSeasons()
const nouveauChecked = computed(() => isNewMember(person))
const orgFormTree = orgFormSections()
const required = (v) => !!v || 'Champ requis'
const photoCode = computed(() => personDisplayName(person) || 'personne')
const familyItems = computed(() =>
  [...inventory.people]
    .filter((entry) => entry.id && entry.id !== person.id)
    .map((entry) => ({ title: personDisplayName(entry), value: entry.id }))
    .sort((a, b) => a.title.localeCompare(b.title, 'fr')),
)

function toggleOrgTag(id) {
  const index = person.tags.indexOf(id)
  if (index >= 0) person.tags.splice(index, 1)
  else person.tags.push(id)
}

watch(
  () => props.initial,
  (value) => {
    Object.assign(person, emptyPerson(), value || {})
    person.images = normalizeImages(person.images)
    person.mesures = { ...emptyPerson().mesures, ...(value?.mesures || {}) }
    person.roles = normalizeRoles(value || person)
    person.tags = normalizeOrgTags(value || person)
    person.childIds = normalizeChildIds(value?.childIds, person.id)
    person.saisons = personSeasons(person)
    parentIds.value = parentsOf(inventory.people, person.id).map((entry) => entry.id)
    if (value?.nouveau === true || value?.nouveau === false) person.nouveau = value.nouveau
    else person.nouveau = null
  },
  { immediate: true, deep: true },
)

async function submit() {
  const result = await form.value.validate()
  if (!result.valid) return
  emit('save', {
    ...person,
    images: normalizeImages(person.images),
    mesures: { ...emptyPerson().mesures, ...person.mesures },
    roles: [...person.roles],
    tags: [...person.tags],
    childIds: [...person.childIds],
    parentIds: [...parentIds.value],
  })
}
</script>

<style scoped>
.form-actions {
  position: sticky;
  bottom: 0;
  z-index: 2;
  padding: 16px 0 8px;
  background: linear-gradient(180deg, rgba(244, 246, 244, 0), #f4f6f4 32%);
}
.role-chips :deep(.v-chip) {
  margin: 4px 8px 4px 0;
}
.org-form-section + .org-form-section {
  margin-top: 1.1rem;
  padding-top: 0.9rem;
  border-top: 1px solid rgba(83, 115, 106, 0.12);
}
.org-form-section__title {
  margin: 0 0 6px;
  font-size: 0.92rem;
  font-weight: 700;
}
.org-form-section__subtitle {
  margin: 10px 0 4px;
  font-size: 0.82rem;
  font-weight: 650;
  color: var(--kamg-deep);
}
.org-form-child {
  margin-left: 0.4rem;
  padding-left: 0.7rem;
  border-left: 2px solid rgba(83, 115, 106, 0.18);
}
.section-label--panel {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--kamg-deep, #53736a);
}
</style>
