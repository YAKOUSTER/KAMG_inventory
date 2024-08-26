<template>
    <VContainer class="loan-details-container my-8">
      <VRow>
        <VCol cols="12">
          <VCard flat>
            <VCardTitle class="headline">Détails des Emprunts</VCardTitle>
            <VCardText>
              <VForm>
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
                <VMenu
                  v-model="dateMenu"
                  :close-on-content-click="false"
                  transition="scale-transition"
                  offset-y
                  class="mb-4"
                >
                  <template #activator="{ on, attrs }">
                    <VTextField
                      v-model="selectedDate"
                      label="Filtrer par date d'emprunt"
                      readonly
                      v-bind="attrs"
                      v-on="on"
                      outlined
                      dense
                    ></VTextField>
                  </template>
                  <VDatePicker v-model="selectedDate" @input="dateMenu = false"></VDatePicker>
                </VMenu>
  
                <!-- Tableau des emprunts -->
                <VDataTable
                  :headers="headers"
                  :items="filteredLoans"
                  item-key="loan_id"
                  class="elevation-1"
                  @click:row="viewLoanDetails"
                >
                  <template v-slot:body.cell(loan_id)="data">
                    <VDataTableTd @click="viewLoanDetails(data.item)">
                      {{ data.item.loan_id }}
                    </VDataTableTd>
                  </template>
                </VDataTable>
              </VForm>
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
    VForm,
    VSelect,
    VMenu,
    VTextField,
    VDatePicker,
    VDataTable,
    VList,
    VListItem,
    VListItemContent,
    VListItemTitle,
    VListItemSubtitle,
    VDataTableTd,
    VDialog,
    VCardActions,
    VBtn
  } from 'vuetify/components';
  import { fetchLoans, fetchMembers } from '../services/loanService';
  
  export default {
    name: 'LoanDetails',
    data() {
      return {
        selectedMember: null,
        selectedDate: null,
        dateMenu: false,
        detailsDialog: false,
        selectedLoan: null,
        members: [], // Liste des membres pour filtrer
        loans: [], // Liste des emprunts
        headers: [
          { text: 'ID Emprunt', value: 'loan_id' },
          { text: 'Date d\'Emprunt', value: 'loan_date' },
          { text: 'Membre', value: 'member_name' }
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
          const loansData = await fetchLoans();
          this.loans = loansData;
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
      async viewLoanDetails(loan) {
        try {
          const response = await fetch(`http://localhost:5000/api/loans/${loan.loan_id}`);
          if (!response.ok) {
            throw new Error('Erreur lors de la récupération des détails de l\'emprunt');
          }
          this.selectedLoan = await response.json();
          this.detailsDialog = true;
        } catch (error) {
          console.error('Erreur lors de la récupération des détails de l\'emprunt:', error);
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
  
  .v-btn.large {
    height: 56px;
    font-size: 18px;
  }
  
  .text-success {
    color: green;
  }
  
  .text-error {
    color: red;
  }
  </style>
  