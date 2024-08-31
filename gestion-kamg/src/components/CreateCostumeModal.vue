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
          
      
          <v-row class="bg-kamg zone">
            <v-col cols = "12" sm="12">
              <v-card-title>
                1. Description de la pièce
      </v-card-title>
             
            </v-col>
            
            <v-col cols="12" sm="12">
              <v-select
                :items="types"
                v-model="localType"
                label="Type de pièce"
                outlined
                density="comfortable"
                @change="handleTypeChange"
              />
            </v-col>
            <v-col cols="12" sm="3">
              <v-text-field
                v-model="localCode"
                label="Code"
                outlined
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" sm="9">
              <v-text-field
                v-model="localName"
                label="Nom de la pièce"
                outlined
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                :items="epochs"
                v-model="localEpoch"
                label="Époque"
                outlined
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                :items="sizes"
                v-model="localSize"
                label="Taille générale"
                outlined
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                :items="states"
                v-model="localState"
                label="État"
                outlined
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                :items="availabilities"
                v-model="localAvailability"
                label="Disponibilité"
                outlined
                density="comfortable"
              />
            </v-col>
          </v-row>

          <v-row class="bg-kamg zone">
            <v-col cols = "12" sm="12">
              <v-card-title>
                2. Détails de la pièces
      </v-card-title>
             
            </v-col>
            <v-col cols="12" sm="12">
              <v-textarea
                v-model="localDescription"
                label="Description"
                outlined
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="localMaterial"
                label="Matériau"
                outlined
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                :items="colors"
                v-model="localColor"
                label="Couleur"
                outlined
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-checkbox
                v-model="localPerle"
                label="Perle"
                @change="handlePerleOrBrodeChange"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-checkbox
                v-model="localBroderie"
                label="Brodé"
                @change="handlePerleOrBrodeChange"
              />
            </v-col>
            <!-- Champ Motif affiché si Perle ou Brodé est coché -->
            <v-col cols="12" sm="12" v-if="localPerle || localBroderie">
              <v-text-field
                v-model="localMotif"
                label="Motif"
                outlined
                density="comfortable"
              />
            </v-col>
          </v-row>

          <!-- Zone des dimensions -->

          
          <v-row class="bg-kamg zone">
            <v-col cols = "12" sm="12">
              <v-card-title>
                3. Toutes les dimensions de la pièce de costume
      </v-card-title>
             
            </v-col>
            <!-- Longueur générale -->
            <v-col cols="12" sm="6" v-if="shouldShowLength">
              <v-text-field
                v-model="localLength"
                label="Longueur (cm)"
                outlined
                density="comfortable"
                type="number"
              />
            </v-col>
            <!-- Longueur dos et avant pour certains types -->
            <v-col cols="12" sm="6" v-if="shouldShowBackFrontLength">
              <v-text-field
                v-model="localBackLength"
                label="Longueur dos (cm)"
                outlined
                density="comfortable"
                type="number"
              />
            </v-col>
            <v-col cols="12" sm="6" v-if="shouldShowBackFrontLength">
              <v-text-field
                v-model="localFrontLength"
                label="Longueur avant (cm)"
                outlined
                density="comfortable"
                type="number"
              />
            </v-col>
            <!-- Tour de taille min et max -->
            <v-col cols="12" sm="6" v-if="shouldShowWaist">
              <v-text-field
                v-model="localWaistMin"
                label="Tour de taille min (cm)"
                outlined
                density="comfortable"
                type="number"
              />
            </v-col>
            <v-col cols="12" sm="6" v-if="shouldShowWaist">
              <v-text-field
                v-model="localWaistMax"
                label="Tour de taille max (cm)"
                outlined
                density="comfortable"
                type="number"
              />
            </v-col>
            <!-- Tour de jupe -->
            <v-col cols="12" sm="6" v-if="shouldShowSkirtWaist">
              <v-text-field
                v-model="localSkirtWaist"
                label="Tour de jupe (cm)"
                outlined
                density="comfortable"
                type="number"
              />
            </v-col>
            <!-- Longueur épaule à épaule -->
            <v-col cols="12" sm="6" v-if="shouldShowShoulderLength">
              <v-text-field
                v-model="localShoulderLength"
                label="Longueur épaule à épaule (cm)"
                outlined
                density="comfortable"
                type="number"
              />
            </v-col>
            <!-- Longueur de manche -->
            <v-col cols="12" sm="6" v-if="shouldShowSleeveLength">
              <v-text-field
                v-model="localSleeveLength"
                label="Longueur de manche (cm)"
                outlined
                density="comfortable"
                type="number"
              />
            </v-col>
            <!-- Tour de tête -->
            <v-col cols="12" sm="6" v-if="shouldShowHeadCircumference">
              <v-text-field
                v-model="localHeadCircumference"
                label="Tour de tête (cm)"
                outlined
                density="comfortable"
                type="number"
              />
            </v-col>
            <!-- Longueur de la variable avec "cm" concaténée -->
            <v-col cols="12" sm="6" v-if="shouldShowVariableLength">
              <v-text-field
                v-model="localVariableLength"
                :label="Longueur "
                outlined
                density="comfortable"
                type="number"
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
import { ref, computed, watch } from 'vue';

export default {
  props: {
    isModalOpen: {
      type: Boolean,
      required: true,
    },
    name: String,
    code: String,
    type: String,
    description: String,
    size: String,
    epoch: String,
    material: String,
    state: String,
    color: String,
    availability: String,
    perle: Boolean,
    broderie: Boolean,
    motif: String,
    length: Number,
    backLength: Number,
    frontLength: Number,
    waistMin: Number,
    waistMax: Number,
    skirtWaist: Number,
    shoulderLength: Number,
    sleeveLength: Number,
    headCircumference: Number,
    variable: String,
    variableLength: Number,
  },
  emits: ['close', 'create-costume'],
  setup(props, { emit }) {
    const internalModalOpen = ref(props.isModalOpen);
    const localName = ref(props.name || '');
    const localCode = ref(props.code || '');
    const localType = ref(props.type || '');
    const localDescription = ref(props.description || '');
    const localSize = ref(props.size || '');
    const localEpoch = ref(props.epoch || '');
    const localMaterial = ref(props.material || '');
    const localState = ref(props.state || '');
    const localColor = ref(props.color || '');
    const localAvailability = ref(props.availability || '');
    const localPerle = ref(props.perle || false);
    const localBroderie = ref(props.broderie || false);
    const localMotif = ref(props.motif || '');
    const localLength = ref(props.length || null);
    const localBackLength = ref(props.backLength || null);
    const localFrontLength = ref(props.frontLength || null);
    const localWaistMin = ref(props.waistMin || null);
    const localWaistMax = ref(props.waistMax || null);
    const localSkirtWaist = ref(props.skirtWaist || null);
    const localShoulderLength = ref(props.shoulderLength || null);
    const localSleeveLength = ref(props.sleeveLength || null);
    const localHeadCircumference = ref(props.headCircumference || null);
    const localVariable = ref(props.variable || '');
    const localVariableLength = ref(props.variableLength || null);

    const types = [
      'Chemise/Roched', 'Gilet/Jiletenn', 'Veste courte/Chupenn', 'Bragoù Bras',
      'Pantalon', 'Ceinture/Gouriz', 'Guêtres', 'Chapeau', 'Jupon', 'Corsage/Jiletenn',
      'Corselet/Manchoù', 'Jupe', 'Tablier', 'Tour de cou', 'Collerette', 'Gorgerette',
      'Coiffe', 'Chaussure', 'Bonnet', 'Ruban de cérémonie'
    ];
    const sizes = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const epochs = ['1870', '1880', '1890', '1900', '1910', '1920', '1930', '1940'];
    const states = ['Ancien', 'A réparer', 'Usé', 'Bon', 'Moyen', 'Très bon'];
    const colors = ['Blanc', 'Rouge', 'Noir', 'Bleu', 'Vert', 'Jaune', 'Rose'];
    const availabilities = ['Disponible', 'Emprunté', 'Au pressing', 'En réparation'];

    // Computed properties to show/hide specific fields based on the type of piece
    const shouldShowLength = computed(() => !['Chemise/Roched', 'Gilet/Jiletenn', 'Veste courte/Chupenn', 'Corsage/Jiletenn', 'Corselet/Manchoù'].includes(localType.value));
    const shouldShowBackFrontLength = computed(() => ['Chemise/Roched', 'Gilet/Jiletenn', 'Veste courte/Chupenn', 'Corsage/Jiletenn', 'Corselet/Manchoù'].includes(localType.value));
    const shouldShowWaist = computed(() => ['Jupe', 'Jupon', 'Bragoù Bras', 'Pantalon', 'Ceinture/Gouriz', 'Tablier'].includes(localType.value));
    const shouldShowSkirtWaist = computed(() => ['Jupe', 'Jupon', 'Tablier'].includes(localType.value));
    const shouldShowShoulderLength = computed(() => ['Chemise/Roched', 'Gilet/Jiletenn', 'Veste courte/Chupenn', 'Corsage/Jiletenn', 'Corselet/Manchoù'].includes(localType.value));
    const shouldShowSleeveLength = computed(() => ['Chemise/Roched', 'Gilet/Jiletenn', 'Veste courte/Chupenn', 'Corsage/Jiletenn', 'Corselet/Manchoù'].includes(localType.value));
    const shouldShowHeadCircumference = computed(() => localType.value === 'Chapeau');
    const shouldShowVariableLength = computed(() => localVariable.value && localVariableLength.value !== null);

    watch(() => props.isModalOpen, (newVal) => {
      internalModalOpen.value = newVal;
      if (!newVal) {
        resetForm();
      }
    });

    const resetForm = () => {
      localName.value = props.name || '';
      localCode.value = props.code || '';
      localType.value = props.type || '';
      localDescription.value = props.description || '';
      localSize.value = props.size || '';
      localEpoch.value = props.epoch || '';
      localMaterial.value = props.material || '';
      localState.value = props.state || '';
      localColor.value = props.color || '';
      localAvailability.value = props.availability || '';
      localPerle.value = props.perle || false;
      localBroderie.value = props.broderie || false;
      localMotif.value = props.motif || '';
      localLength.value = props.length || null;
      localBackLength.value = props.backLength || null;
      localFrontLength.value = props.frontLength || null;
      localWaistMin.value = props.waistMin || null;
      localWaistMax.value = props.waistMax || null;
      localSkirtWaist.value = props.skirtWaist || null;
      localShoulderLength.value = props.shoulderLength || null;
      localSleeveLength.value = props.sleeveLength || null;
      localHeadCircumference.value = props.headCircumference || null;
      localVariable.value = props.variable || '';
      localVariableLength.value = props.variableLength || null;
    };

    const handleTypeChange = () => {
      // Reset specific fields if the type changes
      localLength.value = null;
      localBackLength.value = null;
      localFrontLength.value = null;
      localWaistMin.value = null;
      localWaistMax.value = null;
      localSkirtWaist.value = null;
      localShoulderLength.value = null;
      localSleeveLength.value = null;
      localHeadCircumference.value = null;
      localVariableLength.value = null;
    };

    const handlePerleOrBrodeChange = () => {
      if (!localPerle.value && !localBroderie.value) {
        localMotif.value = '';
      }
    };

    const closeModal = () => {
      emit('close');
    };

    const saveCostume = () => {
      emit('create-costume', {
        name: localName.value,
        code: localCode.value,
        type: localType.value,
        description: localDescription.value,
        size: localSize.value,
        epoch: localEpoch.value,
        material: localMaterial.value,
        state: localState.value,
        color: localColor.value,
        availability: localAvailability.value,
        perle: localPerle.value,
        broderie: localBroderie.value,
        motif: localMotif.value,
        length: localLength.value,
        backLength: localBackLength.value,
        frontLength: localFrontLength.value,
        waistMin: localWaistMin.value,
        waistMax: localWaistMax.value,
        skirtWaist: localSkirtWaist.value,
        shoulderLength: localShoulderLength.value,
        sleeveLength: localSleeveLength.value,
        headCircumference: localHeadCircumference.value,
        variable: localVariable.value,
        variableLength: localVariableLength.value,
      });
      closeModal();
    };

    return {
      internalModalOpen,
      localName,
      localCode,
      localType,
      localDescription,
      localSize,
      localEpoch,
      localMaterial,
      localState,
      localColor,
      localAvailability,
      localPerle,
      localBroderie,
      localMotif,
      localLength,
      localBackLength,
      localFrontLength,
      localWaistMin,
      localWaistMax,
      localSkirtWaist,
      localShoulderLength,
      localSleeveLength,
      localHeadCircumference,
      localVariable,
      localVariableLength,
      types,
      sizes,
      epochs,
      states,
      colors,
      availabilities,
      closeModal,
      saveCostume,
      shouldShowLength,
      shouldShowBackFrontLength,
      shouldShowWaist,
      shouldShowSkirtWaist,
      shouldShowShoulderLength,
      shouldShowSleeveLength,
      shouldShowHeadCircumference,
      shouldShowVariableLength,
      handleTypeChange,
      handlePerleOrBrodeChange,
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

.zone{
  padding:2rem;
  margin-bottom: 2rem;
}

</style>