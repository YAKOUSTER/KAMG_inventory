<template>
  <div>
    <h1 class="text-h4 page-title mb-6">{{ isEdit ? 'Modifier la fiche' : 'Nouvelle fiche' }}</h1>
    <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
    <ItemForm
      v-if="ready"
      :initial="initial"
      :items="inventory.items"
      :saving="saving"
      :submit-label="isEdit ? 'Enregistrer' : 'Créer'"
      :cancel-to="isEdit ? { name: 'item-detail', params: { id } } : '/inventaire'"
      @save="onSave"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ItemForm from '@/components/ItemForm.vue'
import { api } from '@/services/api'
import { useInventoryStore } from '@/stores/inventory'
import { emptyItem } from '@/domain/item'

const props = defineProps({ id: { type: String, default: '' } })
const router = useRouter()
const inventory = useInventoryStore()
const initial = ref(emptyItem())
const ready = ref(false)
const saving = ref(false)
const error = ref('')
const isEdit = computed(() => Boolean(props.id))

onMounted(async () => {
  await inventory.refresh().catch(() => {})
  if (props.id) {
    initial.value = await api.item(props.id)
  }
  ready.value = true
})

async function onSave(payload) {
  saving.value = true
  error.value = ''
  try {
    const saved = props.id ? await api.updateItem(props.id, payload) : await api.createItem(payload)
    await inventory.refresh({ force: true })
    router.push({ name: 'item-detail', params: { id: saved.id } })
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}
</script>
