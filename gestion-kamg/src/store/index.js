import { createStore } from 'vuex';
import storeModule from './modules/cart'; // Import du module store
import loansModule from './modules/loans'; // Nouveau module


const store = createStore({
  modules: {
    store: storeModule, // Ajoutez le module sous un nom de module (par exemple, 'store')
    loans: loansModule // Ajoutez le module sous un nom de module (par exemple, 'store')

  }
});

export default store;