<!--Composant pour afficher la liste des pièces de costume.
-->

<template>
    <div class="costume-list">
      <div v-for="costume in costumes" :key="costume.id">
        <router-link :to="{ name: 'CostumeDetail', params: { id: costume.id } }">
          {{ costume.name }}
        </router-link>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    props: {
      costumes: Array
    }
  };
  </script>
  
  <style scoped>
  /* Styles pour la liste des costumes */
  </style>
  