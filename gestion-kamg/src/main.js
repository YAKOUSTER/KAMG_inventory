import { createApp } from 'vue';
import App from './App.vue';
import router from './router/router';
import store from './store'; // Assurez-vous d'importer le store correctement


createApp(App)
  .use(router)
  .use(store) // Ajoutez le store à l'application Vue
  .mount('#app');
