// plugins/vuetify.js
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { VListItem, VListItemContent, VListItemTitle, VListItemSubtitle, VListItemAction } from 'vuetify/components';


const vuetify = createVuetify({
  components,
  directives,

  theme: {
    defaultTheme: 'myCustomTheme',
    themes: {
      myCustomTheme: {
        dark: false, // ou true pour un thème sombre
        colors: {
          primary: '#6A8C69', // Couleur primaire
          secondary: '#53736A', // Couleur secondaire
          kamg: '#edede5',
          accent: '#82B1FF', // Couleur d'accentuation
          error: '#A8B545', // Couleur d'erreur
          info: '#C2C0A6', // Couleur d'information
          success: '#4CAF50', // Couleur de succès
          warning: '#A8B545', // Couleur d'avertissement
        },
      },
    },
  },
  icons: {
    defaultSet: 'mdi', // Pour définir un set d'icônes par défaut
  },
});

export default vuetify;