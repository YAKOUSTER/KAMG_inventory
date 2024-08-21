import { createStore } from 'vuex';
import storeModule from './modules/store'; // Import du module store

const store = createStore({
  modules: {
    store: storeModule // Ajoutez le module sous un nom de module (par exemple, 'store')
  }
});

export default store;