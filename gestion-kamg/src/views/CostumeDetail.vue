<template>
  <div v-if="costume">
    <v-container class="costume-detail-container my-8">

      <!-- Modale de modification du costume -->
      <CreateCostumeModal
        :isModalOpen="showEditModal"
        :isEdit="true"
        :initialData="costume"
        :pieces="costumes"
        v-bind="selectedPiece"
        @close="closeEditModal"
        @update-costume="handleEditCostume"
      />

      <v-row v-if="error" class="mt-4">
        <v-col>
          <v-alert type="error" dismissible>{{ error }}</v-alert>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12" md="6">
          <v-img :src="costume.image || 'https://via.placeholder.com/600'" class="costume-image" contain></v-img>
        </v-col>

        <v-col cols="12" md="6">
          <v-card flat>
            <v-card-title class="headline">
              {{ costume.name }}
            </v-card-title>
            <v-card-subtitle class="text-subtitle-1 text-grey-darken-1 mb-4">
              {{ costume.type }}
            </v-card-subtitle>

            <v-divider class="my-4"></v-divider>

            <v-card-text class="costume-details">
              <div>
                <p><strong>Description :</strong> {{ costume.description }}</p>
                <p><strong>Taille :</strong> {{ costume.taille_lettre }}</p>
                <p><strong>Époque :</strong> {{ costume.epoque }}</p>
                <p><strong>Matériau :</strong> {{ costume.materiau }}</p>
                <p><strong>État :</strong> {{ costume.etat }}</p>
                <p><strong>Couleur :</strong> {{ costume.couleur }}</p>
                <p><strong>Disponibilité :</strong> <span
                    :class="{ 'text-success': costume.disponibilite == 'Disponible', 'text-error': costume.disponibilite != 'Disponible' }">{{
                      costume.disponibilite }}</span></p>
                <p><strong>Créé le :</strong> {{ costume.tm_stp_cre }}</p>
                <p><strong>Modifié le :</strong> {{ costume.tm_stp }}</p>
              </div>
            </v-card-text>

            <v-btn @click="addCostumeToCart(costume)" :disabled="isInCart(costume)" color="primary" large block class="mt-4">
              {{ isInCart(costume) ? 'Déjà dans le panier' : 'Ajouter au panier' }}
            </v-btn>

            <!-- Bouton pour ouvrir la modale de modification -->
            <v-btn color="primary" @click="openEditModal(costume)">Modifier la pièce</v-btn>
          </v-card>
        </v-col>
      </v-row>

      <!-- Historique des emprunts -->
      <v-row class="mt-12">
        <v-col>
          <v-card flat>
            <v-card-title class="headline">Historique des Emprunts</v-card-title>
            <v-divider></v-divider>

            <v-list dense>
              <v-list-item v-for="entry in loanHistory" :key="entry.loan_id">
                <v-list-item-content>
                  <v-list-item-title>
                    Emprunté par <strong>{{ entry.member_name }}</strong> le <strong>{{ entry.loan_date }}</strong>
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    Retourné le {{ entry.return_date || 'en cours' }}<br>
                    <em>Commentaire:</em> {{ entry.comment }}
                  </v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </v-list>

            <v-alert v-if="loanHistory.length === 0" type="info" text>
              Aucun emprunt enregistré pour ce costume.
            </v-alert>
          </v-card>
        </v-col>
      </v-row>

      <!-- Pièces liées -->
      <v-row class="mt-12">
        <v-col>
          <v-card flat>
            <v-card-title class="headline">Pièces liées</v-card-title>
            <v-divider></v-divider>
            <v-row>
              <v-col v-for="piece in costume.linkedPieces" :key="piece.id" cols="12" md="4">
                <router-link :to="{ name: 'CostumeDetail', params: { id: piece.id } }" style="text-decoration: none;">
                  <v-card class="linked-piece-card" hover>
                    <v-img :src="piece.image || 'https://via.placeholder.com/150'" height="150px" contain></v-img>
                    <v-card-title>{{ piece.piece_name }}</v-card-title>
                    <v-card-subtitle>{{ piece.type }}</v-card-subtitle>
                    <v-card-actions>
                      <v-btn @click="addCostumeToCart(piece)" :disabled="isInCart(piece)" color="primary" large>
                        {{ isInCart(piece) ? 'Déjà dans le panier' : 'Ajouter au panier' }}
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </router-link>
              </v-col>
            </v-row>
          </v-card>
        </v-col>
      </v-row>

    </v-container>
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex';
import { fetchCostumeById, updateCostumeById } from '../services/costumeService';
import CreateCostumeModal from '../components/CreateCostumeModal.vue'; // Ton composant de modale

export default {
  name: 'CostumeDetail',
  components: {
    CreateCostumeModal,
  },
  data() {
    return {
      costume: null,
      error: null,
      loanHistory: [],
      showEditModal: false, // Modale de modification
      selectedPiece: {}, // Stocker les données de la pièce à modifier
      costumes: [], // Liste des costumes
    };
  },
  computed: {
    ...mapGetters('store', ['isInCart']), // Utilisation du store pour vérifier le panier
  },
  watch: {
    '$route.params.id': {
      immediate: true,
      handler() {
        this.loadCostume();
      },
    },
  },
  methods: {
    openEditModal(piece) {
      this.selectedPiece = { ...piece }; // Cloner la pièce pour la modification
      this.showEditModal = true; // Ouvrir la modale
    },
    closeEditModal() {
      this.showEditModal = false;
      this.selectedPiece = {}; // Réinitialiser la pièce sélectionnée
    },
    async handleEditCostume(updatedPiece) {
      try {
        // Appel à l'API pour mettre à jour la pièce via la méthode PUT
        const response = await updateCostumeById(this.costume.id, updatedPiece);
        this.costume = response.data;
        console.log('Costume mis à jour:', response.data);
        this.closeEditModal();
        await this.loadCostume(); // Rafraîchir les données après la modification
      } catch (error) {
        this.error = "Erreur lors de la mise à jour du costume.";
        console.error(error);
      }
    },
    async loadCostume() {
      const costumeId = this.$route.params.id;
      try {
        this.costume = await fetchCostumeById(costumeId);
        await this.fetchLoanHistory();
        window.scrollTo(0, 0); // Remonter en haut de page après chargement des données
      } catch (error) {
        this.error = 'Erreur lors du chargement du costume.';
        console.error(error);
      }
    },
    ...mapActions('store', ['addToCart']), // Utilisation du store pour ajouter au panier
    addCostumeToCart(costume) {
      if (costume.disponibilite === 'Disponible') {
        if (this.isInCart(costume.id)) {
          this.error = 'Ce costume est déjà dans le panier.';
          return;
        }
        this.addToCart(costume);
      } else {
        this.error = "Ce costume n'est pas disponible pour l'ajout au panier.";
      }
    },
    async fetchLoanHistory() {
      if (!this.costume) return;
      try {
        const response = await fetch(`http://localhost:5000/api/costumes/${this.costume.id}/history`);
        this.loanHistory = await response.json();
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'historique des emprunts:', error);
      }
    },
  },
};
</script>

<style scoped>
.costume-detail-container {
  max-width: 1200px;
  margin: auto;
}

.costume-image {
  width: 100%;
  border-radius: 8px;
}

.costume-details p {
  margin: 8px 0;
  line-height: 1.6;
}

.v-card-title.headline {
  font-weight: bold;
}

.v-card-subtitle {
  color: #6b6b6b;
}

.text-success {
  color: green;
}

.text-error {
  color: red;
}

.v-btn.large {
  height: 56px;
  font-size: 18px;
}

.linked-piece-card {
  transition: transform 0.2s ease-in-out;
  cursor: pointer;
}

.linked-piece-card:hover {
  transform: scale(1.05);
}
</style>
