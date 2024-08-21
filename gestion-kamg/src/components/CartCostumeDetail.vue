<!-- Composant pour afficher les détails d'une pièce de costume dans le panier.
-->

<template>
    <div class="cart-costume-detail">
      <h3>{{ item.name }}</h3>
      <p>{{ item.description }}</p>
      <p>Quantité: {{ item.quantity }}</p>
    </div>
  </template>
  
  <script>
  export default {
    props: {
      item: Object
    }
  };
  </script>
  
  <style scoped>
  /* Styles spécifiques pour le détail du costume dans le panier */
  </style>
  