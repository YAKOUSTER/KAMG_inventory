<template>
  <div id="app">
    <header>
      <h1>Gestionnaire de Costumes</h1>
      <router-link to="/">Accueil</router-link>
      <router-link to="/cart">Panier</router-link>
    </header>
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App'
};
</script>

<style>
/* Styles pour l'en-tête global et autres styles */
header {
  background-color: #4CAF50;
  color: white;
  padding: 10px;
  text-align: center;
}
</style>
