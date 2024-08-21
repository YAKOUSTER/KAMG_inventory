<!--Page d'accueil affichant la liste des pièces de costume et le modal de création.

-->

<template>
  <v-container>
    <v-row class="mb-4">
    <v-col>
      <h2>Liste des Pièces de Costume</h2>
      <v-text-field v-model="search" placeholder="Rechercher..." outlined dense />
      <v-btn @click="showCreateModal = true">Créer une pièce de costume</v-btn>
  
      <CostumeList :costumes="filteredCostumes" />
  
      <CreateCostumeModal v-if="showCreateModal" @close="showCreateModal = false" @refresh="fetchCostumes" />
    </v-col>
    </v-row>
  </v-container>
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
          costume.piece_name.toLowerCase().includes(search.value.toLowerCase())
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
  