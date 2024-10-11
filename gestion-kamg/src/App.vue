<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-toolbar-title>Gestionnaire de Costumes</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn text to="/">Accueil</v-btn>
      <v-btn text to="/loan-details">Emprunts</v-btn>
      <v-btn text to="/cart" class="cart-button">
        <v-icon>mdi-cart</v-icon>
        <v-badge :content="cartItemCount" color="secondary" class="ml-2"></v-badge>
      </v-btn>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script>
import { mapGetters } from 'vuex';
import { VList, VListItem, VListItemContent, VListItemTitle, VListItemSubtitle, VSelect, VCard, VCardText, VContainer, VRow, VCol, VIcon, VBadge } from 'vuetify/lib/components';

export default {
  name: 'App',
  computed: {
    ...mapGetters('store', ['cartItems']),
    cartItemCount() {
      return this.cartItems.length;
    }
  }
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

.cart-button .v-icon {
  font-size: 24px; /* Ajustez la taille de l'icône selon vos besoins */
}

.cart-button .v-badge {
  font-size: 12px; /* Ajustez la taille du texte du badge */
}
</style>
