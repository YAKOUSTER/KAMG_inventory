<template>
  <div>
    <h1 class="text-h5 text-md-h4 page-title mb-6">{{ isEdit ? 'Modifier l’événement' : 'Nouvel événement' }}</h1>
    <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>

    <v-form v-if="ready" @submit.prevent="submit">
      <div class="form-fields-grid form-fields-grid--2">
        <FieldRow label="Type">
          <v-select v-model="form.type" :items="typeItems" hide-details="auto" :rules="[required]" />
        </FieldRow>
        <FieldRow label="Titre">
          <v-text-field v-model="form.titre" hide-details="auto" :rules="[required]" />
        </FieldRow>
        <FieldRow label="Début">
          <v-text-field v-model="form.debut" type="datetime-local" hide-details="auto" :rules="[required]" />
        </FieldRow>
        <FieldRow label="Fin">
          <v-text-field v-model="form.fin" type="datetime-local" hide-details="auto" />
        </FieldRow>
        <FieldRow label="Lieu" class="form-fields-grid__span-2">
          <v-text-field v-model="form.lieu" hide-details />
        </FieldRow>
        <FieldRow label="Description" align-top class="form-fields-grid__span-2">
          <v-textarea v-model="form.description" hide-details rows="4" />
        </FieldRow>
        <FieldRow label="Publication">
          <v-checkbox v-model="form.publie" label="Visible dans l’espace membres" hide-details />
        </FieldRow>
      </div>

      <div class="d-flex ga-3 mt-6">
        <v-btn type="submit" color="primary" :loading="saving">Enregistrer</v-btn>
        <v-btn variant="text" :to="isEdit ? { name: 'agenda' } : '/agenda'">Annuler</v-btn>
        <v-spacer />
        <v-btn
          v-if="isEdit && auth.can('agenda.write')"
          color="error"
          variant="text"
          :loading="deleting"
          @click="remove"
        >
          Supprimer
        </v-btn>
      </div>
    </v-form>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import FieldRow from '@/components/FieldRow.vue'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { EVENT_TYPES } from '@/domain/events'

const props = defineProps({ id: { type: String, default: '' } })
const router = useRouter()
const auth = useAuthStore()
const ready = ref(false)
const saving = ref(false)
const deleting = ref(false)
const error = ref('')
const isEdit = computed(() => Boolean(props.id))

const typeItems = EVENT_TYPES.map((type) => ({ title: type.label, value: type.id }))
const form = reactive({
  type: 'repetition',
  titre: '',
  debut: '',
  fin: '',
  lieu: '',
  description: '',
  publie: true,
})

const required = (value) => Boolean(String(value || '').trim()) || 'Champ requis'

function toLocalInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

onMounted(async () => {
  if (props.id) {
    const event = await api.event(props.id)
    Object.assign(form, {
      type: event.type,
      titre: event.titre,
      debut: toLocalInput(event.debut),
      fin: toLocalInput(event.fin),
      lieu: event.lieu || '',
      description: event.description || '',
      publie: event.publie !== false,
    })
  }
  ready.value = true
})

async function submit() {
  saving.value = true
  error.value = ''
  try {
    const payload = { ...form }
    const saved = props.id ? await api.updateEvent(props.id, payload) : await api.createEvent(payload)
    router.push({ name: 'event-edit', params: { id: saved.id } })
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!confirm('Supprimer cet événement ?')) return
  deleting.value = true
  error.value = ''
  try {
    await api.deleteEvent(props.id)
    router.push({ name: 'agenda' })
  } catch (err) {
    error.value = err.message
  } finally {
    deleting.value = false
  }
}
</script>
