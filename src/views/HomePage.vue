<template>
  <v-container>
    <!-- Barre de recherche avec filtres -->
    <v-row class="mb-4">
      <v-col cols="12" sm="12">
        <v-text-field v-model="search" placeholder="Rechercher par nom ou code..." outlined dense />
      </v-col>
      <v-col cols="12" sm="2">
        <v-select v-model="selectedEpoch" :items="['Tout', ...epochs]" label="Époque" variant="solo" outlined dense />
      </v-col>
      <v-col cols="12" sm="2">
        <v-select v-model="selectedAvailability" :items="['Tout', ...availabilities]" label="Disponibilité"
          variant="solo" outlined dense />
      </v-col>
      <v-col cols="12" sm="2">
        <v-select v-model="selectedSize" :items="['Tout', ...sizes]" label="Taille" variant="solo" outlined dense />
      </v-col>
      <v-col cols="12" sm="2">
        <v-select v-model="selectedState" :items="['Tout', ...states]" label="État" variant="solo" outlined dense />
      </v-col>
      <v-col cols="12" sm="2">
        <v-select v-model="selectedColor" :items="['Tout', ...colors]" label="Couleur" variant="solo" outlined dense />
      </v-col>

      <!-- Filtres supplémentaires pour les mesures -->


      <v-col cols="12" sm="6" lg="4">
        <v-range-slider v-model="filters.lengthpiece" label="Longueur (cm)" :min="0" :max="180" step="1"
          dense></v-range-slider>
        <!-- Affichage des valeurs minimales et maximales sélectionnées -->
        <p>Longueur : {{ filters.lengthpiece[0] }} cm - {{ filters.lengthpiece[1] }} cm</p>
      </v-col>

      <v-col cols="12" sm="6" lg="4">

        <v-range-slider v-model="filters.waist" label="Tour de taille (cm)" :min="0" :max="100" step="1"
          dense></v-range-slider>
        <!-- Affichage des valeurs minimales et maximales sélectionnées -->
        <p>Tour de taille minimal : {{ filters.waist[0] }} cm - {{ filters.waist[1] }} cm</p>
      </v-col>

      <v-col cols="12" sm="6" lg="4">

        <v-range-slider v-model="filters.backLength" label="Hauteur du dos (cm)" :min="0" :max="100" step="1"
          dense></v-range-slider>
        <!-- Affichage des valeurs minimales et maximales sélectionnées -->
        <p>Longueur du dos : {{ filters.backLength[0] }} cm - {{ filters.backLength[1] }} cm</p>
      </v-col>

      <v-col cols="12" sm="6" lg="4">

        <v-range-slider v-model="filters.frontLength" label="Longueur avant (cm)" :min="0" :max="100" step="1"
          dense></v-range-slider>
        <!-- Affichage des valeurs minimales et maximales sélectionnées -->
        <p>Longueur avant : {{ filters.frontLength[0] }} cm - {{ filters.frontLength[1] }} cm</p>
      </v-col>

      <v-col cols="12" sm="6" lg="4">

        <v-range-slider v-model="filters.skirtCircumference" label="Tour de jupe (cm)" :min="0" :max="100" step="1"
          dense></v-range-slider>
        <!-- Affichage des valeurs minimales et maximales sélectionnées -->
        <p>Tour de jupe : {{ filters.skirtCircumference[0] }} cm - {{ filters.skirtCircumference[1] }} cm</p>
      </v-col>

      <v-col cols="12" sm="6" lg="4">

        <v-range-slider v-model="filters.shoulderToShoulder" label="Longueur épaule à épaule (cm)" :min="0" :max="100"
          step="1" dense></v-range-slider>
        <!-- Affichage des valeurs minimales et maximales sélectionnées -->
        <p>Epaule à épaule : {{ filters.shoulderToShoulder[0] }} cm - {{ filters.shoulderToShoulder[1] }} cm</p>
      </v-col>

      <v-col cols="12" sm="6" lg="4">

        <v-range-slider v-model="filters.sleeveLength" label="Longueur manches (cm)" :min="0" :max="100" step="1"
          dense></v-range-slider>
        <!-- Affichage des valeurs minimales et maximales sélectionnées -->
        <p>Longueur manche (cm) : {{ filters.sleeveLength[0] }} cm - {{ filters.sleeveLength[1] }} cm</p>
      </v-col>

      <v-col cols="12" sm="6" lg="4">

        <v-range-slider v-model="filters.headCircumference" label="Tour de tête (cm)" :min="0" :max="100" step="1"
          dense></v-range-slider>
        <!-- Affichage des valeurs minimales et maximales sélectionnées -->
        <p>Tour de tête (cm) : {{ filters.headCircumference[0] }} cm - {{ filters.headCircumference[1] }} cm</p>
      </v-col>


      <!-- Bouton RESET pour réinitialiser tous les filtres -->
      <v-col cols="12" sm="2">
        <v-btn @click="resetFilters" color="red" outlined>Réinitialiser</v-btn>
      </v-col>
      <!-- Bouton pour basculer entre tableau et cartes -->
      <v-col cols="12" sm="2">
        <v-btn @click="toggleViewMode" color="primary">
          Affichage en {{ isTableView ? 'cartes' : 'tableau' }}
        </v-btn>
      </v-col>
      <!-- Bouton pour ouvrir la modale de création -->
      <v-col cols="12" sm="2">
        <v-btn @click="openCreateModal" color="primary">Créer une pièce de costume</v-btn>
      </v-col>
    </v-row>

    <!-- Affichage en tableau -->
    <v-row v-if="isTableView">
      <v-col cols="12">
        <v-data-table :headers="tableHeaders" :items="filteredCostumes" item-key="piece_id" class="elevation-1">
          <template v-slot:item="{ item }">
            <tr>
              <td>{{ item.piece_id }}</td>
              <td>{{ item.code }}</td>
              <td>{{ item.piece_name }}</td>
              <td>{{ item.epoque }}</td>
              <td>{{ item.taille }}</td>
              <td>{{ item.etat }}</td>
              <td>{{ item.couleur }}</td>
              <td
                :class="{ 'text-success': item.disponibilite === 'Disponible', 'text-error': item.disponibilite === 'Emprunté' }">
                {{ item.disponibilite }}
              </td>
              <td>
                <router-link :to="{ name: 'CostumeDetail', params: { id: item.piece_id } }">
                  <v-btn color="primary" text>Voir les détails</v-btn>
                </router-link>
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-col>
    </v-row>

    <!-- Affichage en cartes -->
    <v-row v-else>
      <v-col v-for="costume in filteredCostumes" :key="costume.piece_id" cols="12" sm="4" md="3" lg="2">
        <!-- Carte cliquable avec router-link -->
        <router-link :to="{ name: 'CostumeDetail', params: { id: costume.piece_id } }" style="text-decoration: none;">
          <v-card :class="{ 'hover-card': true }">
            <v-img :src="costume.image || 'https://via.placeholder.com/300'" height="200px"></v-img>
            <v-card-title>{{ costume.code }}</v-card-title>
            <v-card-subtitle>
              <p>{{ costume.piece_name }}</p>
              {{ costume.disponibilite === "Emprunté" ? `Emprunté par : ${costume.borrower_name}` :
                costume.disponibilite }}
            </v-card-subtitle>
          </v-card>
        </router-link>
      </v-col>
    </v-row>

    <!-- Modale de création de costume -->
    <CreateCostumeModal :isModalOpen="showCreateModal" :pieces="costumes" @close="closeCreateModal"
      @create-costume="handleCreateCostume" />
  </v-container>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
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
    const isTableView = ref(true); // Variable pour gérer le mode d'affichage

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

    const resetFilters = () => {
    search.value = '';
    selectedEpoch.value = 'Tout';
    selectedAvailability.value = 'Tout';
    selectedSize.value = 'Tout';
    selectedState.value = 'Tout';
    selectedColor.value = 'Tout';

    // Réinitialiser les valeurs des sliders
    filters.value = {
      lengthpiece: [0, 180],
      waist: [0, 100],
      backLength: [0, 100],
      frontLength: [0, 100],
      skirtCircumference: [0, 300],
      shoulderToShoulder: [0, 100],
      sleeveLength: [0, 100],
      headCircumference: [0, 100]
    };
  };


    const filters = ref({
      lengthpiece: [0, 180],
      waist: [0, 100],
      backLength: [0, 100],
      frontLength: [0, 100],
      skirtCircumference: [0, 300],
      shoulderToShoulder: [0, 100],
      sleeveLength: [0, 100],
      headCircumference: [0, 100]
    });

    const fetchCostumesData = async () => {
      costumes.value = await fetchCostumes();
    };

    onMounted(() => {
      fetchCostumesData();
    });

    const filteredCostumes = computed(() => {
      return costumes.value.filter(costume => {
        return (
          (costume.piece_name?.toLowerCase().includes(search.value.toLowerCase()) ||
            costume.code?.toLowerCase().includes(search.value.toLowerCase())) &&
          (selectedEpoch.value === 'Tout' || costume.epoque === selectedEpoch.value) &&
          (selectedAvailability.value === 'Tout' || costume.disponibilite === selectedAvailability.value) &&
          (selectedSize.value === 'Tout' || costume.taille_lettre === selectedSize.value) &&
          (selectedState.value === 'Tout' || costume.etat === selectedState.value) &&
          (selectedColor.value === 'Tout' || costume.couleur?.toLowerCase() === selectedColor.value.toLowerCase()) &&
          (filters.value.lengthpiece && costume.longueur >= filters.value.lengthpiece[0] && costume.longueur <= filters.value.lengthpiece[1]) &&
          (filters.value.waist && costume.tour_taille_min >= filters.value.waist[0] && costume.tour_taille_max <= filters.value.waist[1]) &&
          (filters.value.backLength && costume.longueur_dos >= filters.value.backLength[0] && costume.longueur_dos <= filters.value.backLength[1]) &&
          (filters.value.frontLength && costume.longueur_avant >= filters.value.frontLength[0] && costume.longueur_avant <= filters.value.frontLength[1]) &&
          (filters.value.skirtCircumference && costume.tour_jupe >= filters.value.skirtCircumference[0] && costume.tour_jupe <= filters.value.skirtCircumference[1]) &&
          (filters.value.shoulderToShoulder && costume.longueur_epaule_epaule >= filters.value.shoulderToShoulder[0] && costume.longueur_epaule_epaule <= filters.value.shoulderToShoulder[1]) &&
          (filters.value.sleeveLength && costume.longueur_manche >= filters.value.sleeveLength[0] && costume.longueur_manche <= filters.value.sleeveLength[1]) &&
          (filters.value.headCircumference && costume.tour_tete >= filters.value.headCircumference[0] && costume.tour_tete <= filters.value.headCircumference[1])
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
      try {
        await createCostume(newCostume);
        fetchCostumesData(); // Rafraîchir la liste des costumes
        closeCreateModal(); // Fermer la modale après la création
      } catch (error) {
        console.error('Erreur lors de la création du costume:', error);
      }
    };

    const toggleViewMode = () => {
      isTableView.value = !isTableView.value;
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
      costumes,
      filteredCostumes,
      filters,
      resetFilters,
      openCreateModal,
      closeCreateModal,
      handleCreateCostume,
      fetchCostumes: fetchCostumesData,
      isTableView, // Gérer le mode d'affichage
      toggleViewMode, // Fonction pour basculer entre les vues
      tableHeaders: [
        { text: 'ID', value: 'piece_id' },
        { text: 'Code', value: 'code' },
        { text: 'Nom de la Pièce', value: 'piece_name' },
        { text: 'Époque', value: 'epoque' },
        { text: 'Taille', value: 'taille' },
        { text: 'État', value: 'etat' },
        { text: 'Couleur', value: 'couleur' },
        { text: 'Disponibilité', value: 'disponibilite' }
      ]
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

.text-success {
  color: green;
}

.text-error {
  color: red;
}
</style>
