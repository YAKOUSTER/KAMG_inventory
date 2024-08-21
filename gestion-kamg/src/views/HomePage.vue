<template>
  <v-container>
    <!-- Barre de recherche avec filtres -->
    <v-row class="mb-4" align="center">
      <v-col cols="12" sm="4">
        <v-text-field
          v-model="search"
          placeholder="Rechercher par nom ou code..."
          outlined
          dense
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-select
          v-model="selectedEpoch"
          :items="['Tout', ...epochs]"
          label="Époque"
          outlined
          dense
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-select
          v-model="selectedAvailability"
          :items="['Tout', ...availabilities]"
          label="Disponibilité"
          outlined
          dense
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-select
          v-model="selectedSize"
          :items="['Tout', ...sizes]"
          label="Taille"
          outlined
          dense
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-select
          v-model="selectedState"
          :items="['Tout', ...states]"
          label="État"
          outlined
          dense
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-select
          v-model="selectedColor"
          :items="['Tout', ...colors]"
          label="Couleur"
          outlined
          dense
        />
      </v-col>
      <!-- Bouton pour ouvrir la modale de création -->
      <v-col cols="12" sm="2">
        <v-btn @click="openCreateModal" color="primary">Créer une pièce de costume</v-btn>
      </v-col>
    </v-row>

    <!-- Grille de cartes pour les costumes -->
    <v-row>
      <v-col
        v-for="costume in filteredCostumes"
        :key="costume.piece_id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <!-- Carte cliquable avec router-link -->
        <router-link :to="{ name: 'CostumeDetail', params: { id: costume.piece_id } }" style="text-decoration: none;">
          <v-card :class="{'hover-card': true}">
            <v-img
              :src="costume.image || 'https://via.placeholder.com/300'"
              height="200px"
            ></v-img>
            <v-card-title>{{ costume.piece_name }}</v-card-title>
            <v-card-subtitle>
              {{ costume.disponibilite ? 'Disponible' : `Emprunté par : ${costume.borrower_name}` }}
            </v-card-subtitle>
          </v-card>
        </router-link>
      </v-col>
    </v-row>

    <!-- Modale de création de costume -->
    <CreateCostumeModal
      :isModalOpen="showCreateModal"
      :name="name"
      :type="type"
      :description="description"
      :size="size"
      :epoch="epoch"
      :material="material"
      :state="state"
      :color="color"
      :availability="availability"
      @close="closeCreateModal"
      @update:name="val => name = val"
      @update:type="val => type = val"
      @update:description="val => description = val"
      @update:size="val => size = val"
      @update:epoch="val => epoch = val"
      @update:material="val => material = val"
      @update:state="val => state = val"
      @update:color="val => color = val"
      @update:availability="val => availability = val"
      @create-costume="handleCreateCostume"
    />
  </v-container>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import CreateCostumeModal from '../components/CreateCostumeModal.vue';
import { fetchCostumes, createCostume } from '../services/costumeService';

export default {
  components: {
    CreateCostumeModal
  },
  setup() {
    const costumes = ref([]);
    const search = ref('');
    const showCreateModal = ref(false);

    const name = ref('');
    const type = ref('');
    const description = ref('');
    const size = ref('');
    const epoch = ref('');
    const material = ref('');
    const state = ref('');
    const color = ref('');
    const availability = ref('');

    const selectedEpoch = ref('Tout');
    const selectedAvailability = ref('Tout');
    const selectedSize = ref('Tout');
    const selectedState = ref('Tout');
    const selectedColor = ref('Tout');

    const epochs = ['1870', '1880', '1890', '1900', '1910', '1920', '1930', '1940'];
    const availabilities = ['Disponible', 'Emprunté', 'Au pressing', 'En réparation'];
    const sizes = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const states = ['Ancien', 'A réparer', 'Usé', 'Bon', 'Moyen', 'Très bon'];
    const colors = ['Blanc', 'Rouge', 'Noir', 'Bleu', 'Vert', 'Jaune', 'Rose'];

    const fetchCostumesData = async () => {
      costumes.value = await fetchCostumes();
    };

    onMounted(() => {
      fetchCostumesData();
    });

    const filteredCostumes = computed(() => {
      return costumes.value.filter(costume => {
        return (
          (costume.piece_name.toLowerCase().includes(search.value.toLowerCase()) ||
            costume.code.toLowerCase().includes(search.value.toLowerCase())) &&
          (selectedEpoch.value === 'Tout' || costume.epoque === selectedEpoch.value) &&
          (selectedAvailability.value === 'Tout' ||
            (costume.disponibilite && selectedAvailability.value === 'Disponible') ||
            (!costume.disponibilite && selectedAvailability.value === 'Emprunté')) &&
          (selectedSize.value === 'Tout' || costume.taille === selectedSize.value) &&
          (selectedState.value === 'Tout' || costume.etat === selectedState.value) &&
          (selectedColor.value === 'Tout' || costume.couleur.toLowerCase() === selectedColor.value.toLowerCase())
        );
      });
    });

    const openCreateModal = () => {
      showCreateModal.value = true;
    };

    const closeCreateModal = () => {
      showCreateModal.value = false;
    };

    const handleCreateCostume = async (newCostume) => {
      console.log('Tentative de création de costume avec les données:', newCostume);
      try {
        await createCostume(newCostume);
        console.log('Costume créé avec succès');
        fetchCostumesData(); // Rafraîchir la liste des costumes
      } catch (error) {
        console.error('Erreur lors de la création du costume:', error);
      }
    };

    return {
      search,
      selectedEpoch,
      selectedAvailability,
      selectedSize,
      selectedState,
      selectedColor,
      epochs,
      availabilities,
      sizes,
      states,
      colors,
      showCreateModal,
      name,
      type,
      description,
      size,
      epoch,
      material,
      state,
      color,
      availability,
      filteredCostumes,
      openCreateModal,
      closeCreateModal,
      handleCreateCostume,
      fetchCostumes: fetchCostumesData
    };
  }
};
</script>

<style scoped>
.hover-card {
  transition: transform 0.2s ease-in-out;
  cursor: pointer;
}

.hover-card:hover {
  transform: scale(1.05);
}

/* Styles spécifiques pour la page d'accueil */
</style>
