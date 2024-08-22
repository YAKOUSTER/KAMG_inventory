<template>
  <v-dialog
    v-model="internalModalOpen"
    fullscreen
    overlay-color="rgba(0, 0, 0, 0.6)"
    transition="dialog-bottom-transition"
  >
    <v-card>
      <v-toolbar dense flat color="primary" dark>
        <v-toolbar-title>Créer une pièce de costume</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon @click="closeModal">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text>
        <v-container>
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="localName"
                label="Nom"
                outlined
                dense
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                :items="types"
                v-model="localType"
                label="Type"
                outlined
                dense
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="localDescription"
                label="Description"
                outlined
                dense
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                :items="sizes"
                v-model="localSize"
                label="Taille"
                outlined
                dense
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                :items="epochs"
                v-model="localEpoch"
                label="Époque"
                outlined
                dense
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="localMaterial"
                label="Matériau"
                outlined
                dense
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                :items="states"
                v-model="localState"
                label="État"
                outlined
                dense
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                :items="colors"
                v-model="localColor"
                label="Couleur"
                outlined
                dense
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                :items="availabilities"
                v-model="localAvailability"
                label="Disponibilité"
                outlined
                dense
              />
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="saveCostume">Créer</v-btn>
        <v-btn text @click="closeModal">Annuler</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { ref, watch } from 'vue';

export default {
  props: {
    isModalOpen: {
      type: Boolean,
      required: true
    },
    name: String,
    type: String,
    description: String,
    size: String,
    epoch: String,
    material: String,
    state: String,
    color: String,
    availability: String
  },
  emits: ['close', 'create-costume'],
  setup(props, { emit }) {
    const internalModalOpen = ref(props.isModalOpen);
    const localName = ref(props.name || '');
    const localType = ref(props.type || '');
    const localDescription = ref(props.description || '');
    const localSize = ref(props.size || '');
    const localEpoch = ref(props.epoch || '');
    const localMaterial = ref(props.material || '');
    const localState = ref(props.state || '');
    const localColor = ref(props.color || '');
    const localAvailability = ref(props.availability || '');

    const types = ['Chemise/Roched', 'Gilet/Jiletenn', 'Veste courte/Chupenn', 'Bragoù Bras', 'Pantalon', 'Ceinture/Gouriz', 'Guêtres', 'Chapeau', 'Jupon', 'Corsage/Jiletenn', 'Corselet/Manchoù', 'Jupe', 'Tablier', 'Tour de cou', 'Collerette', 'Gorgerette', 'Coiffe', 'Chaussure', 'Bonnet', 'Ruban de cérémonie'];
    const sizes = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const epochs = ['1870', '1880', '1890', '1900', '1910', '1920', '1930', '1940'];
    const states = ['Ancien', 'A réparer', 'Usé', 'Bon', 'Moyen', 'Très bon'];
    const colors = ['Blanc', 'Rouge', 'Noir', 'Bleu', 'Vert', 'Jaune', 'Rose'];
    const availabilities = ['Disponible', 'Emprunté', 'Au pressing', 'En réparation'];

    watch(() => props.isModalOpen, (newVal) => {
      internalModalOpen.value = newVal;
      if (!newVal) {
        resetForm();
      }
    });

    const resetForm = () => {
      localName.value = props.name || '';
      localType.value = props.type || '';
      localDescription.value = props.description || '';
      localSize.value = props.size || '';
      localEpoch.value = props.epoch || '';
      localMaterial.value = props.material || '';
      localState.value = props.state || '';
      localColor.value = props.color || '';
      localAvailability.value = props.availability || '';
    };

    const closeModal = () => {
      emit('close');
    };

    const saveCostume = () => {
      emit('create-costume', {
        name: localName.value,
        type: localType.value,
        description: localDescription.value,
        size: localSize.value,
        epoch: localEpoch.value,
        material: localMaterial.value,
        state: localState.value,
        color: localColor.value,
        availability: localAvailability.value
      });
      closeModal();
    };

    return {
      internalModalOpen,
      localName,
      localType,
      localDescription,
      localSize,
      localEpoch,
      localMaterial,
      localState,
      localColor,
      localAvailability,
      types,
      sizes,
      epochs,
      states,
      colors,
      availabilities,
      closeModal,
      saveCostume,
    };
  }
};
</script>

<style scoped>
.v-card {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.v-card-text {
  flex: 1;
}

.v-card-actions {
  justify-content: flex-end;
  padding-bottom: 16px;
}
</style>
