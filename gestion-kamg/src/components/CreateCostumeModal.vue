<template>
  <div class="modal">
    <div class="modal-content">
      <span class="close" @click="$emit('close')">&times;</span>
      <h2>Créer une pièce de costume</h2>
      <form @submit.prevent="createCostume">
        <input v-model="name" placeholder="Nom" />
        <input v-model="type" placeholder="Type" />
        <input v-model="description" placeholder="Description" />
        <input v-model="size" placeholder="Taille" />
        <input v-model="epoch" placeholder="Époque" />
        <input v-model="material" placeholder="Matériau" />
        <input v-model="state" placeholder="État" />
        <input v-model="color" placeholder="Couleur" />
        <input v-model="availability" placeholder="Disponibilité" />
        <button type="submit">Créer</button>
      </form>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { createCostume } from '../services/costumeService';

export default {
  props: {
    // Define any props if needed
  },
  setup(props, { emit }) {
    const name = ref('');
    const type = ref('');
    const description = ref('');
    const size = ref('');
    const epoch = ref('');
    const material = ref('');
    const state = ref('');
    const color = ref('');
    const availability = ref('');

    const createCostume = async () => {
      try {
        await createCostume({
          name: name.value,
          type: type.value,
          description: description.value,
          size: size.value,
          epoch: epoch.value,
          material: material.value,
          state: state.value,
          color: color.value,
          availability: availability.value
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
      size,
      epoch,
      material,
      state,
      color,
      availability,
      createCostume
    };
  }
};
</script>

<style scoped>
/* Styles pour le modal */
</style>
