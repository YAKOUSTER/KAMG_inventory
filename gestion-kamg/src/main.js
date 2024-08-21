import { createApp } from 'vue';
import App from './App.vue';
import router from './router/router';
import store from './store'; // Assurez-vous d'importer le store correctement
import './assets/main.css'; // Importer les styles globaux
import vuetify from './plugins/vuetify'; // Assurez-vous de créer ce fichier


createApp(App)
  .use(vuetify)
  .use(router)
  .use(store) // Ajoutez le store à l'application Vue
  .mount('#app');
