export default {
  namespaced: true,
  state: {
    cart: []
  },
  mutations: {
    ADD_TO_CART(state, item) {
      state.cart.push(item);
    },
    CLEAR_CART(state) {
      state.cart = [];
    },
    REMOVE_FROM_CART(state, itemId) {
      state.cart = state.cart.filter(item => item.id !== itemId);
    },
    SET_CART(state, cartItems) {
      state.cart = cartItems;
    }
  },
  getters: {
    cartItems(state) {
      return state.cart;
    },
    isInCart: (state) => (itemId) => {
      return state.cart.some(item => item.id === itemId);
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
        const commentsArray = cartItems.map(item => comments[item.id] || '');
        const response = await fetch('http://localhost:5000/api/loans', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ memberId, cartItems, comments: commentsArray })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Erreur lors de la validation du panier:', errorText);
          throw new Error('Erreur lors de la validation du panier après tentative');
        }

        const result = await response.json();
        console.log(result.message);

        commit('CLEAR_CART');

      } catch (error) {
        console.error('Erreur lors de la validation du panier:', error);
      }
    },
    async fetchCart({ commit }) {
      try {
        const response = await fetch('http://localhost:5000/api/cart');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération du panier');
        }
        const cartItems = await response.json();
        commit('SET_CART', cartItems);
        return cartItems;
      } catch (error) {
        console.error('Erreur lors de la récupération du panier:', error);
        throw error;
      }
    }
  }
};
