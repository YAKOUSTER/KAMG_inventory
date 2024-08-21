<template>
  <div class="modal">
    <div class="modal-content">
      <span class="close" @click="$emit('close')">&times;</span>
      <h2>Créer une pièce de costume</h2>
      <form @submit.prevent="handleCreateCostume">
        <input v-model="name" placeholder="Nom" />
        <input v-model="type" placeholder="Type" />
        <input v-model="description" placeholder="Description" />
        <input v-model="taille" placeholder="Taille" />
        <input v-model="epoque" placeholder="Époque" />
        <input v-model="materiau" placeholder="Matériau" />
        <input v-model="state" placeholder="État" />
        <input v-model="couleur" placeholder="Couleur" />
        <input v-model="disponibilite" placeholder="Disponibilité" />
        <button type="submit">Créer</button>
      </form>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { createCostume } from '../services/costumeService';

export default {
  setup(props, { emit }) {
    const name = ref('');
    const code = ref('');
    const type = ref('');
    const description = ref('');
    const taille = ref('');
    const epoque = ref('');
    const materiau = ref('');
    const state = ref('');
    const couleur = ref('');
    const disponibilite = ref('');

    const handleCreateCostume = async () => {
      try {
        await createCostume({
          name: name.value,
          code: code.value,
          type: type.value,
          description: description.value,
          taille: taille.value,
          epoque: epoque.value,
          materiau: materiau.value,
          state: state.value,
          couleur: couleur.value,
          disponibilite: disponibilite.value
        });
        emit('refresh');  // Emit an event to refresh the list
        emit('close');    // Emit an event to close the modal
      } catch (error) {
        console.error('Error creating costume:', error);
      }
    };

    return {
      name,
      type,
      description,
      taille,
      epoque,
      materiau,
      state,
      couleur,
      disponibilite,
      handleCreateCostume
    };
  }
};
</script>

<style scoped>
/* Styles pour le modal */
</style>
