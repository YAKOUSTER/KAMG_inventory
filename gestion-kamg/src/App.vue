<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-toolbar-title>Gestionnaire de Costumes</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn text to="/">Accueil</v-btn>
      <v-btn text to="/loan-details">Emprunts</v-btn>
      <v-btn text to="/cart">Panier</v-btn>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script>
import { VList, VListItem, VListItemContent, VListItemTitle, VListItemSubtitle, VSelect, VCard, VCardText, VContainer, VRow, VCol } from 'vuetify/lib/components';

export default {
  name: 'App',
};
</script>

<style>
/* Appliquez la police "Karla" à toute l'application */
body {
  font-family: 'Karla', sans-serif;
}

/* Style spécifique pour la barre de navigation */
.v-app-bar {
  font-family: 'Karla', sans-serif;
  font-weight: 700; /* Utilisez le poids de police souhaité */
}
</style>
