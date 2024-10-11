import { createApp } from 'vue';
import App from './App.vue';
import router from './router/router';
import store from './store'; // Assurez-vous d'importer le store correctement
import './assets/main.css'; // Importer les styles globaux
import vuetify from './plugins/vuetify'; // Assurez-vous de créer ce fichier


const app = createApp(App)
  app.use(vuetify)
  app.use(router)
  app.use(store) // Ajoutez le store à l'application Vue
  app.mount('#app');
