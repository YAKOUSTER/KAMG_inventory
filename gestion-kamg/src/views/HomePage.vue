<!--Page d'accueil affichant la liste des pièces de costume et le modal de création.

-->

<template>
    <div>
      <h2>Liste des Pièces de Costume</h2>
      <input v-model="search" placeholder="Rechercher..." />
      <button @click="showCreateModal = true">Créer une pièce de costume</button>
  
      <CostumeList :costumes="filteredCostumes" />
  
      <CreateCostumeModal v-if="showCreateModal" @close="showCreateModal = false" @refresh="fetchCostumes" />
    </div>
  </template>
  
  <script>
  import { ref, computed, onMounted } from 'vue';
  import CostumeList from '../components/CostumeList.vue';
  import CreateCostumeModal from '../components/CreateCostumeModal.vue';
  import { fetchCostumes } from '../services/costumeService';
  
  export default {
    components: {
      CostumeList,
      CreateCostumeModal
    },
    setup() {
      const costumes = ref([]);
      const search = ref('');
      const showCreateModal = ref(false);
  
      const fetchCostumesData = async () => {
        costumes.value = await fetchCostumes();
      };
  
      onMounted(() => {
        fetchCostumesData();
      });
  
      const filteredCostumes = computed(() => {
        return costumes.value.filter(costume =>
          costume.name.toLowerCase().includes(search.value.toLowerCase())
        );
      });
  
      return {
        search,
        filteredCostumes,
        showCreateModal,
        fetchCostumes: fetchCostumesData
      };
    }
  };
  </script>
  
  <style scoped>
  /* Styles spécifiques pour la page d'accueil */
  </style>
  