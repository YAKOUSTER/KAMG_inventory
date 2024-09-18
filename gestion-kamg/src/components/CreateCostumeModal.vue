<template>
  <v-dialog v-model="internalModalOpen" fullscreen overlay-color="rgba(0, 0, 0, 0.6)"
    transition="dialog-bottom-transition">
    <v-card>
      <v-toolbar dense flat color="primary" dark>
        <v-toolbar-title>{{ isEdit ? 'Modifier' : 'Créer' }} une pièce de costume</v-toolbar-title>        <v-spacer></v-spacer>
        <v-btn icon @click="closeModal">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text>
        <v-container>
          <v-form ref="form" @submit.prevent="saveCostume">
            <v-row class="bg-kamg zone">
              <v-col cols="12">
                <v-card-title>
                  1. Description de la pièce
                </v-card-title>

              </v-col>

              <v-col cols="12">
                <v-select :items="types" :rules="[rules.required]" v-model="localType" label="Type de pièce" outlined
                  density="comfortable" @change="handleTypeChange" required />
              </v-col>
              <v-col cols="12" sm="3">
                <v-text-field v-model="localCode" label="Code" outlined density="comfortable" :rules="[rules.required]"
                  required />
              </v-col>
              <v-col cols="12" sm="9">
                <v-text-field v-model="localName" label="Nom de la pièce" outlined density="comfortable"
                  :rules="[rules.required]" required />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select :items="epochs" v-model="localEpoch" label="Époque" outlined density="comfortable" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select :items="sizes" v-model="localSize" label="Taille générale" outlined density="comfortable" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select :items="states" v-model="localState" label="État" outlined density="comfortable" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select :items="availabilities" v-model="localAvailability" label="Disponibilité" outlined
                  density="comfortable" />
              </v-col>
            </v-row>


            <VAutocomplete
                v-model="linkedPiecesId"
                :items="piecesOptions"
                item-title="code"
                item-value="id"
                label="Pièce(s) de costume liée(s)"
                placeholder="Choisir une ou des code(s) de pièce"
                multiple
                chips
              ></VAutocomplete>



            <v-row class="bg-kamg zone">
              <v-col cols="12">
                <v-card-title>
                  2. Détails de la pièces
                </v-card-title>

              </v-col>
              <v-col cols="12">
                <v-textarea v-model="localDescription" label="Description" outlined density="comfortable" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="localMaterial" label="Matériau" outlined density="comfortable" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select :items="colors" v-model="localColor" label="Couleur" outlined density="comfortable" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-checkbox v-model="localPerle" label="Perle" @change="handlePerleOrBrodeChange" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-checkbox v-model="localBroderie" label="Brodé" @change="handlePerleOrBrodeChange" />
              </v-col>
              <!-- Champ Motif affiché si Perle ou Brodé est coché -->
              <v-col cols="12" v-if="localPerle || localBroderie">
                <v-text-field v-model="localMotif" label="Motif" outlined density="comfortable" />
              </v-col>
            </v-row>

            <!-- Zone des dimensions -->


            <v-row class="bg-kamg zone">
              <v-col cols="12">
                <v-card-title>
                  3. Toutes les dimensions de la pièce de costume
                </v-card-title>

              </v-col>
              <!-- Longueur générale -->
              <v-col cols="12" v-if="shouldShowLength">
                <v-text-field v-model="localLength" label="Longueur (cm)" outlined density="comfortable"
                  type="number" />
              </v-col>
              <!-- Longueur dos et avant pour certains types -->
              <v-col cols="12" v-if="shouldShowBackFrontLength">
                <v-text-field v-model="localBackLength" label="Longueur dos (cm)" outlined density="comfortable"
                  type="number" />
              </v-col>
              <v-col cols="12" v-if="shouldShowBackFrontLength">
                <v-text-field v-model="localFrontLength" label="Longueur avant (cm)" outlined density="comfortable"
                  type="number" />
              </v-col>
              <!-- Tour de taille min et max -->
              <v-col cols="12" v-if="shouldShowWaist">
                <v-text-field v-model="localWaistMin" label="Tour de taille min (cm)" outlined density="comfortable"
                  type="number" />
              </v-col>
              <v-col cols="12" v-if="shouldShowWaist">
                <v-text-field v-model="localWaistMax" label="Tour de taille max (cm)" outlined density="comfortable"
                  type="number" />
              </v-col>
              <!-- Tour de jupe -->
              <v-col cols="12" v-if="shouldShowSkirtWaist">
                <v-text-field v-model="localSkirtWaist" label="Tour de jupe (cm)" outlined density="comfortable"
                  type="number" />
              </v-col>
              <!-- Longueur épaule à épaule -->
              <v-col cols="12" v-if="shouldShowShoulderLength">
                <v-text-field v-model="localShoulderLength" label="Longueur épaule à épaule (cm)" outlined
                  density="comfortable" type="number" />
              </v-col>
              <!-- Longueur de manche -->
              <v-col cols="12" v-if="shouldShowSleeveLength">
                <v-text-field v-model="localSleeveLength" label="Longueur de manche (cm)" outlined density="comfortable"
                  type="number" />
              </v-col>
              <!-- Tour de tête -->
              <v-col cols="12" v-if="shouldShowHeadCircumference">
                <v-text-field v-model="localHeadCircumference" label="Tour de tête (cm)" outlined density="comfortable"
                  type="number" />
              </v-col>
              <v-row>
                <v-col cols="12" sm="2">
                  <v-text-field v-model="localVariableLength" label="Longueur de " outlined density="comfortable"
                    type="number" />
                </v-col>
                <v-col cols="12" sm="10">
                  <v-text-field v-model="localVariable" label="Variable (velour, moire, dentelle,...)" outlined
                    density="comfortable" type="text" />
                </v-col>
              </v-row>
            </v-row>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn color="primary" type="submit">{{ isEdit ? 'Modifier' : 'Créer' }}</v-btn>
              <v-btn text @click="closeModal">Annuler</v-btn>
            </v-card-actions>
          </v-form>
        </v-container>
      </v-card-text>
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
    isEdit: {  // Nouvel ajout pour indiquer si la modale est en mode édition
      type: Boolean,
      default: false,
    },
    pieces: {
      type: Array,
      default: () => [],
    },
    id: String,
    nom: String,
    code: String,
    type: String,
    description: String,
    taille_lettre: String,
    epoque: String,
    materiau: String,
    etat: String,
    couleur: String,
    disponibilite: String,
    perle: Boolean,
    broderie: Boolean,
    motif: String,
    longueur: Number,
    longueur_dos: Number,
    longueur_avant: Number,
    tour_taille_min: Number,
    tour_taille_max: Number,
    tour_jupe: Number,
    longueur_epaule_epaule: Number,
    longueur_manche: Number,
    tour_tete: Number,
    variable: String,
    longueur_de_la_variable: Number,
  },
  emits: ['close', 'create-costume', 'update-costume'],  // Ajout des deux événements séparés
  setup(props, { emit }) {
    const internalModalOpen = ref(props.isModalOpen);
    const form = ref(null);
    const linkedPiecesId = ref([]);
    const isValid = ref(false);

   // Valeurs locales initiales
  const localType = ref('');
  const localName = ref('');
  const localCode = ref('');
  const localDescription = ref('');
  const localSize = ref('');
  const localEpoch = ref('');
  const localMaterial = ref('');
  const localState = ref('');
  const localColor = ref('');
  const localAvailability = ref('');
  const localPerle = ref(false);
  const localBroderie = ref(false);
  const localMotif = ref('');
  const localLength = ref(null);
  const localBackLength = ref(null);
  const localFrontLength = ref(null);
  const localWaistMin = ref(null);
  const localWaistMax = ref(null);
  const localSkirtWaist = ref(null);
  const localShoulderLength = ref(null);
  const localSleeveLength = ref(null);
  const localHeadCircumference = ref(null);
  const localVariable = ref('');
  const localVariableLength = ref(null);

  // Fonction pour remplir les valeurs locales à partir des props
  const fillLocalValues = () => {
    localType.value = props.type || '';
    localName.value = props.nom || '';
    localCode.value = props.code || '';
    localDescription.value = props.description || '';
    localSize.value = props.taille_lettre || '';
    localEpoch.value = props.epoque || '';
    localMaterial.value = props.materiau || '';
    localState.value = props.etat || '';
    localColor.value = props.couleur || '';
    localAvailability.value = props.disponibilite || '';
    localPerle.value = props.perle || false;
    localBroderie.value = props.broderie || false;
    localMotif.value = props.motif || '';
    localLength.value = props.longueur || null;
    localBackLength.value = props.longueur_dos || null;
    localFrontLength.value = props.longueur_avant || null;
    localWaistMin.value = props.tour_taille_min || null;
    localWaistMax.value = props.tour_taille_max || null;
    localSkirtWaist.value = props.tour_jupe || null;
    localShoulderLength.value = props.longueur_epaule_epaule || null;
    localSleeveLength.value = props.longueur_manche || null;
    localHeadCircumference.value = props.tour_tete || null;
    localVariable.value = props.variable || '';
    localVariableLength.value = props.longueur_de_la_variable || null;
  };


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

    // Génère les options pour le multiselect à partir des pièces passées en prop
    const piecesOptions = computed(() =>

    props.pieces.map(costume => ({
        id: costume.piece_id,
        code: costume.code,
      }))
    );

   

    // Computed properties to show/hide specific fields based on the type of piece
    const shouldShowLength = computed(() => !['Chemise/Roched', 'Gilet/Jiletenn', 'Veste courte/Chupenn', 'Corsage/Jiletenn', 'Corselet/Manchoù'].includes(localType.value));
    const shouldShowBackFrontLength = computed(() => ['Chemise/Roched', 'Gilet/Jiletenn', 'Veste courte/Chupenn', 'Corsage/Jiletenn', 'Corselet/Manchoù'].includes(localType.value));
    const shouldShowWaist = computed(() => ['Jupe', 'Jupon', 'Bragoù Bras', 'Pantalon', 'Ceinture/Gouriz', 'Tablier'].includes(localType.value));
    const shouldShowSkirtWaist = computed(() => ['Jupe', 'Jupon', 'Tablier'].includes(localType.value));
    const shouldShowShoulderLength = computed(() => ['Chemise/Roched', 'Gilet/Jiletenn', 'Veste courte/Chupenn', 'Corsage/Jiletenn', 'Corselet/Manchoù'].includes(localType.value));
    const shouldShowSleeveLength = computed(() => ['Chemise/Roched', 'Gilet/Jiletenn', 'Veste courte/Chupenn', 'Corsage/Jiletenn', 'Corselet/Manchoù'].includes(localType.value));
    const shouldShowHeadCircumference = computed(() => localType.value === 'Chapeau');



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
    };

    const handlePerleOrBrodeChange = () => {
      if (!localPerle.value && !localBroderie.value) {
        localMotif.value = '';
      }
    };

    // Règles de validation
    const rules = {
      required: (v) => !!v || 'Ce champ est requis',
    };

    const closeModal = () => {
      emit('close');
    };





    const saveCostume = async () => {
      // Ensure the form exists and is validated
      if (form.value) {
        console.log('Validating form...');
        // Validate the form; if invalid, do not proceed
        const isValid = await form.value.validate();
        console.log('Form validation result:', isValid);
        if (!isValid.valid) {
          // Form is invalid, so do not close the modal
          console.log('Form validation failed. Please fill in the required fields.');
          return; // Exit the function to keep the modal open
        }

        // If form is valid, emit the event and close the modal
        
        
        const costumeData = {
          nom: localName.value,
          code: localCode.value,
          type: localType.value,
          description: localDescription.value,
          taille_lettre: localSize.value,
          epoque: localEpoch.value,
          materiau: localMaterial.value,
          etat: localState.value,
          couleur: localColor.value,
          disponibilite: localAvailability.value,
          perle: localPerle.value,
          broderie: localBroderie.value,
          motif: localMotif.value,
          longueur: localLength.value,
          longueur_dos: localBackLength.value,
          longueur_avant: localFrontLength.value,
          tour_taille_min: localWaistMin.value,
          tour_taille_max: localWaistMax.value,
          tour_jupe: localSkirtWaist.value,
          longueur_epaule_epaule: localShoulderLength.value,
          longueur_manche: localSleeveLength.value,
          tour_tete: localHeadCircumference.value,
          variable: localVariable.value,
          longueur_de_la_variable: localVariableLength.value,
          pieces_liees_id: linkedPiecesId.value,
        };

        if (props.isEdit) {
          emit('update-costume', costumeData);  // Émet l'événement update-costume pour PUT
        } else {
          emit('create-costume', costumeData);  // Émet l'événement create-costume pour POST
        }
        closeModal();
      }
    };

    watch(
      () => props.isModalOpen, 
      (newVal) => {
      internalModalOpen.value = newVal;
      if (newVal && props.isEdit) {
        fillLocalValues(); // Remplit les champs avec les valeurs existantes pour la modification
      } else if (newVal && !props.isEdit) {
        // Si la modale est en mode création, on vide les champs
        localType.value = '';
        localName.value = '';
        localCode.value = '';
        localDescription.value = '';
        localSize.value = '';
        localEpoch.value = '';
        localMaterial.value = '';
        localState.value = '';
        localColor.value = '';
        localAvailability.value = '';
        localPerle.value = false;
        localBroderie.value = false;
        localMotif.value = '';
        localLength.value = null;
        localBackLength.value = null;
        localFrontLength.value = null;
        localWaistMin.value = null;
        localWaistMax.value = null;
        localSkirtWaist.value = null;
        localShoulderLength.value = null;
        localSleeveLength.value = null;
        localHeadCircumference.value = null;
        localVariable.value = '';
        localVariableLength.value = null;
      }
      else if (!newVal) {
        // Reset form and validation state when modal is closed
        if (form.value) {
          form.value.reset();             // Reset the form fields
          form.value.resetValidation();   // Reset the validation states
        }
      }
      console.log(piecesOptions);
    });


    return {
      internalModalOpen,
      form,
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
      isValid,
      piecesOptions,
      linkedPiecesId,
      rules,
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

.zone {
  padding: 2rem;
  margin-bottom: 2rem;
}
</style>