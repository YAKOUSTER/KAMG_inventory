<template>
  <v-container>
    <!-- Barre de recherche avec filtres -->
    <v-row class="mb-4">
      <v-col cols="12" sm="12">
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
          variant="solo"
          outlined
          dense
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-select
          v-model="selectedAvailability"
          :items="['Tout', ...availabilities]"
          label="Disponibilité"
          variant="solo"
          outlined
          dense
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-select
          v-model="selectedSize"
          :items="['Tout', ...sizes]"
          label="Taille"
          variant="solo"
          outlined
          dense
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-select
          v-model="selectedState"
          :items="['Tout', ...states]"
          label="État"
          variant="solo"
          outlined
          dense
        />
      </v-col>
      <v-col cols="12" sm="2">
        <v-select
          v-model="selectedColor"
          :items="['Tout', ...colors]"
          label="Couleur"
          variant="solo"
          outlined
          dense
        />
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
        <v-data-table
          :headers="tableHeaders"
          :items="filteredCostumes"
          item-key="piece_id"
          class="elevation-1"
        >
          <template v-slot:item="{ item }">
            <tr>
              <td>{{ item.piece_id }}</td>
              <td>{{ item.code }}</td>
              <td>{{ item.piece_name }}</td>
              <td>{{ item.epoque }}</td>
              <td>{{ item.taille }}</td>
              <td>{{ item.etat }}</td>
              <td>{{ item.couleur }}</td>
              <td :class="{'text-success': item.disponibilite === 'Disponible', 'text-error': item.disponibilite === 'Emprunté'}">
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
      <v-col
        v-for="costume in filteredCostumes"
        :key="costume.piece_id"
        cols="12"
        sm="4"
        md="3"
        lg="2"
      >
        <!-- Carte cliquable avec router-link -->
        <router-link :to="{ name: 'CostumeDetail', params: { id: costume.piece_id } }" style="text-decoration: none;">
          <v-card :class="{'hover-card': true}">
            <v-img
              :src="costume.image || 'https://via.placeholder.com/300'"
              height="200px"
            ></v-img>
            <v-card-title>{{ costume.code }}</v-card-title>
            <v-card-subtitle>
              <p>{{ costume.piece_name }}</p>
              {{ costume.disponibilite === "Emprunté" ? `Emprunté par : ${costume.borrower_name}` : costume.disponibilite }}
            </v-card-subtitle>
          </v-card>
        </router-link>
      </v-col>
    </v-row>

    <!-- Modale de création de costume -->
    <CreateCostumeModal
      :isModalOpen="showCreateModal"
      :pieces="costumes"
      :isEditing="false"
      @close="closeCreateModal"
      @create-costume="handleCreateCostume"
    />
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
    const isTableView = ref(false); // Variable pour gérer le mode d'affichage

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
          (selectedAvailability.value === 'Tout' || costume.disponibilite === selectedAvailability.value) &&
          (selectedSize.value === 'Tout' || costume.taille === selectedSize.value) &&
          (selectedState.value === 'Tout' || costume.etat === selectedState.value) &&
          (selectedColor.value === 'Tout' || costume.couleur.toLowerCase() === selectedColor.value.toLowerCase())
        );
      });
    });

    const openCreateModal = () => {
      // Réinitialiser les champs pour la création
      localName.value = '';
      localCode.value = '';
      localType.value = '';
      localDescription.value = '';
      localSize.value = '';
      localEpoch.value = '';
      localMaterial.value = '';
      localState.value = '';
      localColor.value = '';
      localAvailability.value = '';
      localPerle.value = false;
      localBroderie.value = false;
      localMotif.value = '';
      localLength.value = null;
      localBackLength.value = null;
      localFrontLength.value = null;
      localWaistMin.value = null;
      localWaistMax.value = null;
      localSkirtWaist.value = null;
      localShoulderLength.value = null;
      localSleeveLength.value = null;
      localHeadCircumference.value = null;
      localVariable.value = '';
      localVariableLength.value = null;
      linkedPiecesId.value = [];
      // Ouvrir la modale
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
