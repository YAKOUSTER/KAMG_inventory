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
                <template v-slot:item.loan_id="{ item }">
                  {{ item.loan_id }}
                </template>
                <template v-slot:item.member_name="{ item }">
                  {{ item.member_name }}
                </template>
                <template v-slot:item.loan_date="{ item }">
                  {{ item.loan_date }}
                </template>
                <template v-slot:item.items.length="{ item }">
                  {{ item.items.length }}
                </template>
                <template v-slot:item.items="{ item }">
                  {{ item.items.map(i => i.piece_name).join(', ') }}
                </template>
                <template v-slot:item.status="{ item }">
                  <span :class="{'text-success': item.status === 'Disponible', 'text-error': item.status !== 'Disponible'}">
                    {{ item.status }}
                  </span>
                </template>
              </VDataTable>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
  
      <!-- Optionnel : Dialog pour afficher les détails d'un emprunt -->
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
                  @click="goToCostumeDetails(item.piece_id)"
                >
                  <VListItemContent>
                    <VListItemTitle>{{ item.piece_name }}</VListItemTitle>
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
    VBtn
  } from 'vuetify/components';
  import { fetchLoans, fetchLoanDetails, fetchMembers } from '../services/loanService';
  
  export default {
    name: 'LoanDetails',
    data() {
      return {
        selectedMember: null,
        selectedDate: null,
        detailsDialog: false,
        selectedLoan: null,
        members: [], // Liste des membres pour filtrer
        loans: [], // Liste des emprunts avec les détails
        headers: [
          { title: 'ID Emprunt', value: 'loan_id' },
          { title: 'Membre', value: 'member_name' },
          { title: 'Date d\'Emprunt', value: 'loan_date' },
          { title: 'Nombre de Pièces', value: 'items.length' },
          { title: 'Liste des Pièces', value: 'items' },
          { title: 'Statut', value: 'status' }
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
          // 1. Récupérer les emprunts initiaux
          const loansData = await fetchLoans();
  
          // 2. Récupérer les détails pour chaque emprunt
          const loanDetailsPromises = loansData.map(async (loan) => {
            const loanDetails = await fetchLoanDetails(loan.loan_id);
            return { ...loan, items: loanDetails.items };
          });
  
          // Attendre que tous les détails soient récupérés
          this.loans = await Promise.all(loanDetailsPromises);
        } catch (error) {
          console.error('Erreur lors de la récupération des emprunts:', error);
        }
      },
      async fetchMembers() {
        try {
          const membersData = await fetchMembers();
          this.members = membersData;
        } catch (error) {
          console.error('Erreur lors de la récupération des membres:', error);
        }
      },
      goToCostumeDetails(costumeId) {
        this.$router.push(`/costumes/${costumeId}`);
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
  