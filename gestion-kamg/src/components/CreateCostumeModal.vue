<template>
  <v-dialog
    v-bind:show="isModalOpen"
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
                :value="localName"
                @input="updateName"
                label="Nom"
                outlined
                dense
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                :value="localType"
                @input="updateType"
                label="Type"
                outlined
                dense
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                :value="localDescription"
                @input="updateDescription"
                label="Description"
                outlined
                dense
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                :items="sizes"
                :value="localSize"
                @input="updateSize"
                label="Taille"
                outlined
                dense
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                :items="epochs"
                :value="localEpoch"
                @input="updateEpoch"
                label="Époque"
                outlined
                dense
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                :value="localMaterial"
                @input="updateMaterial"
                label="Matériau"
                outlined
                dense
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                :items="states"
                :value="localState"
                @input="updateState"
                label="État"
                outlined
                dense
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                :items="colors"
                :value="localColor"
                @input="updateColor"
                label="Couleur"
                outlined
                dense
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                :items="availabilities"
                :value="localAvailability"
                @input="updateAvailability"
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
  emits: ['close', 'update:name', 'update:type', 'update:description', 'update:size', 'update:epoch', 'update:material', 'update:state', 'update:color', 'update:availability', 'create-costume'],
  setup(props, { emit }) {
    const localName = ref(props.name || '');
    const localType = ref(props.type || '');
    const localDescription = ref(props.description || '');
    const localSize = ref(props.size || '');
    const localEpoch = ref(props.epoch || '');
    const localMaterial = ref(props.material || '');
    const localState = ref(props.state || '');
    const localColor = ref(props.color || '');
    const localAvailability = ref(props.availability || '');

    const sizes = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const epochs = ['1870', '1880', '1890', '1900', '1910', '1920', '1930', '1940'];
    const states = ['Ancien', 'A réparer', 'Usé', 'Bon', 'Moyen', 'Très bon'];
    const colors = ['Blanc', 'Rouge', 'Noir', 'Bleu', 'Vert', 'Jaune', 'Rose'];
    const availabilities = ['Disponible', 'Emprunté', 'Au pressing', 'En réparation'];

    watch(() => props.isModalOpen, (newVal) => {
      if (!newVal) {
        localName.value = props.name || '';
        localType.value = props.type || '';
        localDescription.value = props.description || '';
        localSize.value = props.size || '';
        localEpoch.value = props.epoch || '';
        localMaterial.value = props.material || '';
        localState.value = props.state || '';
        localColor.value = props.color || '';
        localAvailability.value = props.availability || '';
      }
    });

    const closeModal = () => {
      emit('close');
    };

    const updateName = (value) => {
      localName.value = value;
      emit('update:name', value);
    };

    const updateType = (value) => {
      localType.value = value;
      emit('update:type', value);
    };

    const updateDescription = (value) => {
      localDescription.value = value;
      emit('update:description', value);
    };

    const updateSize = (value) => {
      localSize.value = value;
      emit('update:size', value);
    };

    const updateEpoch = (value) => {
      localEpoch.value = value;
      emit('update:epoch', value);
    };

    const updateMaterial = (value) => {
      localMaterial.value = value;
      emit('update:material', value);
    };

    const updateState = (value) => {
      localState.value = value;
      emit('update:state', value);
    };

    const updateColor = (value) => {
      localColor.value = value;
      emit('update:color', value);
    };

    const updateAvailability = (value) => {
      localAvailability.value = value;
      emit('update:availability', value);
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
      localName,
      localType,
      localDescription,
      localSize,
      localEpoch,
      localMaterial,
      localState,
      localColor,
      localAvailability,
      sizes,
      epochs,
      states,
      colors,
      availabilities,
      closeModal,
      saveCostume,
      updateName,
      updateType,
      updateDescription,
      updateSize,
      updateEpoch,
      updateMaterial,
      updateState,
      updateColor,
      updateAvailability
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
