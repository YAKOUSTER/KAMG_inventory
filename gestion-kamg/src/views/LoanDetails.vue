<template>
    <VContainer class="loan-details-container my-8">
      <VRow>
        <VCol cols="12">
          <VCard>
            <VCardTitle class="headline">Détails des Emprunts</VCardTitle>
            <VCardText>
              <!-- Filtrer par membre -->
              <VSelect
                v-model="selectedMember"
                :items="members"
                item-title="nom"
                item-value="id"
                label="Filtrer par membre"
                outlined
                dense
                class="mb-4"
              ></VSelect>
  
              <!-- Filtrer par date d'emprunt -->
              <VTextField
                v-model="selectedDate"
                label="Filtrer par date d'emprunt"
                type="date"
                outlined
                dense
                class="mb-4"
              ></VTextField>
  
              <!-- Tableau des emprunts -->
              <VDataTable
                :headers="headers"
                :items="filteredLoans"
                item-key="loan_id"
                class="elevation-1"
              >
                <template v-slot:item="{ item }">
                  <tr @click="viewLoanDetails(item)">
                    <td>{{ item.loan_id }}</td>
                    <td>{{ item.member_name }}</td>
                    <td>{{ item.loan_date }}</td>
                    <td>{{ item.items ? item.items.length : 0 }}</td>
                    <td>{{ item.items ? item.items.map(i => i.piece_name).join(', ') : 'Aucun' }}</td>
                    <td :class="{'text-success': item.status === 'Disponible', 'text-error': item.status !== 'Disponible'}">{{ item.status }}</td>
                  </tr>
                </template>
              </VDataTable>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
  
      <!-- Dialogue pour afficher les détails d'un emprunt -->
      <VDialog v-model="detailsDialog" max-width="800px">
        <VCard>
          <VCardTitle>
            Détails de l'Emprunt - ID {{ selectedLoan?.loan_id }}
          </VCardTitle>
          <VCardText>
            <VList>
              <VListItemGroup>
                <VListItem
                  v-for="item in selectedLoan?.items"
                  :key="item.piece_id"
                >
                  <VListItemContent>
                    <VListItemTitle>
                      {{ item.piece_name }}
                      <VCheckbox
                        v-model="item.returned"
                        @click.stop=""
                        :label="'Retourner cette pièce'"
                      ></VCheckbox>
                    </VListItemTitle>
                    <VListItemSubtitle>
                      Statut: <span :class="{'text-success': item.status === 'Disponible', 'text-error': item.status !== 'Disponible'}">{{ item.status }}</span>
                    </VListItemSubtitle>
                  </VListItemContent>
                </VListItem>
              </VListItemGroup>
            </VList>
            <p><strong>Membre :</strong> {{ selectedLoan?.member_name }}</p>
          </VCardText>
          <VCardActions>
            <VBtn color="success" @click="returnAllItems">Retourner toutes les pièces</VBtn>
            <VBtn color="warning" @click="returnSelectedItems">Retourner les pièces sélectionnées</VBtn>
            <VBtn @click="detailsDialog = false" color="primary">Fermer</VBtn>
          </VCardActions>
        </VCard>
      </VDialog>
    </VContainer>
  </template>
  
  <script>
import {
  VContainer,
  VRow,
  VCol,
  VCard,
  VCardTitle,
  VCardText,
  VSelect,
  VTextField,
  VDataTable,
  VList,
  VListItem,
  VListItemContent,
  VListItemTitle,
  VListItemSubtitle,
  VListItemGroup,
  VDialog,
  VCardActions,
  VBtn,
  VCheckbox
} from 'vuetify/components';
import axios from 'axios';

export default {
  name: 'LoanDetails',
  data() {
    return {
      selectedMember: null,
      selectedDate: null,
      detailsDialog: false,
      selectedLoan: null,
      members: [], // Liste des membres pour filtrer
      loans: [], // Liste des emprunts
      headers: [
        { text: 'ID Emprunt', value: 'loan_id' },
        { text: 'Membre', value: 'member_name' },
        { text: 'Date d\'Emprunt', value: 'loan_date' },
        { text: 'Nombre de Pièces', value: 'items.length' },
        { text: 'Liste des Pièces', value: 'items' },
        { text: 'Statut', value: 'status' }
      ]
    };
  },
  computed: {
    filteredLoans() {
      return this.loans.filter(loan => {
        const matchesMember = this.selectedMember ? loan.member_id === this.selectedMember : true;
        const matchesDate = this.selectedDate ? loan.loan_date === this.selectedDate : true;
        return matchesMember && matchesDate;
      });
    }
  },
  methods: {
    async fetchLoans() {
      try {
        const loansData = await axios.get('http://localhost:5000/api/loans');
        this.loans = loansData.data;
      } catch (error) {
        console.error('Erreur lors de la récupération des emprunts:', error);
      }
    },
    async fetchMembers() {
      try {
        const membersData = await axios.get('http://localhost:5000/api/members');
        this.members = membersData.data;
      } catch (error) {
        console.error('Erreur lors de la récupération des membres:', error);
      }
    },
    async viewLoanDetails(loan) {
      try {
        const response = await axios.get(`http://localhost:5000/api/loans/${loan.loan_id}`);
        this.selectedLoan = response.data;
        // Initialise l'état de retour pour chaque pièce
        this.selectedLoan.items.forEach(item => {
          item.returned = false; // Toutes les pièces ne sont pas retournées par défaut
        });
        this.detailsDialog = true;
      } catch (error) {
        console.error('Erreur lors de la récupération des détails de l\'emprunt:', error);
      }
    },
    async returnAllItems() {
      try {
        await axios.put(`http://localhost:5000/api/loans/${this.selectedLoan.loan_id}/return-all`);
        this.fetchLoans(); // Rafraîchir les données
        this.detailsDialog = false;
        alert('Toutes les pièces ont été retournées avec succès.');
      } catch (error) {
        console.error('Erreur lors du retour de toutes les pièces:', error);
      }
    },
    async returnSelectedItems() {
      const returnedItems = this.selectedLoan.items
        .filter(item => item.returned)
        .map(item => item.piece_id);

      if (returnedItems.length === 0) {
        alert('Veuillez sélectionner au moins une pièce à retourner.');
        return;
      }

      try {
        await axios.put(`http://localhost:5000/api/loans/${this.selectedLoan.loan_id}/return-partial`, {
          returnedItems
        });
        this.fetchLoans(); // Rafraîchir les données
        this.detailsDialog = false;
        alert('Les pièces sélectionnées ont été retournées avec succès.');
      } catch (error) {
        console.error('Erreur lors du retour partiel des pièces:', error);
      }
    }
  },
  async created() {
    await this.fetchLoans();
    await this.fetchMembers();
  }
};
</script>



  <style scoped>
  .loan-details-container {
    max-width: 1200px;
    margin: auto;
  }
  
  .v-card-title.headline {
    font-weight: bold;
  }
  
  .text-success {
    color: green;
  }
  
  .text-error {
    color: red;
  }
  </style>
  