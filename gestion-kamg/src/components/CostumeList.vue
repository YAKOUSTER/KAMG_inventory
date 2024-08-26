<template>
  <v-container>
    <v-row>
      <v-col
        v-for="costume in costumes"
        :key="costume.id"
        cols="12" sm="6" md="4" lg="3"
      >
        <v-card :class="{ 'bg-red-lighten-5': !costume.disponibilite, 'bg-green-lighten-5': costume.disponibilite }">
          <v-card-title>
            {{ costume.piece_name }}
          </v-card-title>
          <v-card-subtitle v-if="costume.disponibilite = 'Emprunté'">
            Emprunté par: {{ costume.borrower_name }}
          </v-card-subtitle>
          <v-card-subtitle v-else>
            {{ costume.disponibilite }}
          </v-card-subtitle>
          <v-card-actions>
            <router-link
              :to="{ name: 'CostumeDetail', params: { id: costume.piece_id } }"
            >
              <v-btn color="primary" text>Voir les détails</v-btn>
            </router-link>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  props: {
    costumes: Array
  }
};
</script>

<style scoped>
.bg-red-lighten-5 {
  background-color: #ffebee;
}

.bg-green-lighten-5 {
  background-color: #e8f5e9;
}

.v-card {
  margin-bottom: 20px;
}
</style>
