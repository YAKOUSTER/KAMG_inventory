<template>
  <div>
    <h1 class="text-h5 text-md-h4 page-title mb-6">{{ isEdit ? 'Modifier la personne' : 'Nouvelle personne' }}</h1>
    <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
    <PersonForm
      v-if="ready"
      :initial="initial"
      :saving="saving"
      :cancel-to="isEdit ? { name: 'person-detail', params: { id } } : '/personnes'"
      @save="onSave"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PersonForm from '@/components/PersonForm.vue'
import { api } from '@/services/api'
import { useInventoryStore } from '@/stores/inventory'
import { emptyPerson } from '@/domain/person'

const props = defineProps({ id: { type: String, default: '' } })
const router = useRouter()
const inventory = useInventoryStore()
const initial = ref(emptyPerson())
const ready = ref(false)
const saving = ref(false)
const error = ref('')
const isEdit = computed(() => Boolean(props.id))

onMounted(async () => {
  if (props.id) initial.value = await api.person(props.id)
  ready.value = true
})

async function onSave(payload) {
  saving.value = true
  error.value = ''
  try {
    const saved = props.id ? await api.updatePerson(props.id, payload) : await api.createPerson(payload)
    inventory.upsertPerson(saved)
    router.push({ name: 'person-detail', params: { id: saved.id } })
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}
</script>
