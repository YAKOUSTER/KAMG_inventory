// plugins/vuetify.js
import 'vuetify/styles';
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
          primary: '#1976D2', // Couleur primaire
          secondary: '#424242', // Couleur secondaire
          accent: '#82B1FF', // Couleur d'accentuation
          error: '#FF5252', // Couleur d'erreur
          info: '#2196F3', // Couleur d'information
          success: '#4CAF50', // Couleur de succès
          warning: '#FFC107', // Couleur d'avertissement
        },
      },
    },
  },
  icons: {
    defaultSet: 'mdi', // Pour définir un set d'icônes par défaut
  },
});

export default vuetify;