export default {
  namespaced: true,
  state: {
    cart: []
  },
  mutations: {
    ADD_TO_CART(state, item) {
      console.log('Avant ajout:', state.cart);
      state.cart.push(item);
      console.log('Après ajout:', state.cart);
    },
    CLEAR_CART(state) {
      state.cart = []; // Vider le panier après validation
    },
    REMOVE_FROM_CART(state, itemId) {
      state.cart = state.cart.filter(item => item.id !== itemId);
    }
  },
  getters: {
    cartItems(state) {
      return state.cart;
    }
  },
  actions: {
    addToCart({ commit }, item) {
      commit('ADD_TO_CART', item);
    },
    removeFromCart({ commit }, itemId) {
      commit('REMOVE_FROM_CART', itemId);
    },
    async validateCart({ commit }, { memberId, cartItems, comments }) {
      try {

        // Convertir les commentaires en tableau
        const commentsArray = cartItems.map(item => comments[item.id] || '');

        // Appeler l'API pour créer un emprunt
        const response = await fetch('http://localhost:5000/api/loans', { // Assurez-vous que l'URL est correcte, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ memberId, cartItems, comments: commentsArray  })
        });

        if (!response.ok) {
          const errorText = await response.text(); // Récupère le texte d'erreur
          console.error('Erreur lors de la validation du panier:', errorText);
          throw new Error('Erreur lors de la validation du panier après tentative');
        }

        const result = await response.json();
        console.log(result.message); // Optionnel, pour le débogage

        commit('CLEAR_CART'); // Vider le panier localement

      } catch (error) {
        console.error('Erreur lors de la validation du panier:', error);
      }
    }
  }
};
