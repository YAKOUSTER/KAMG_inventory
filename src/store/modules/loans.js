export default {
    namespaced: true,
    state: {
      loans: [] // Liste des emprunts
    },
    mutations: {
      SET_LOANS(state, loans) {
        state.loans = loans;
      },
      ADD_LOAN(state, loan) {
        state.loans.push(loan);
      }
    },
    getters: {
      allLoans(state) {
        return state.loans;
      }
    },
    actions: {
      async fetchLoans({ commit }) {
        try {
          const response = await fetch('http://localhost:5000/api/loans');
          const data = await response.json();
          commit('SET_LOANS', data);
        } catch (error) {
          console.error('Erreur lors de la récupération des emprunts:', error);
        }
      },
      async addLoan({ commit }, loan) {
        try {
          const response = await fetch('http://localhost:5000/api/loans', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(loan)
          });
          const result = await response.json();
          commit('ADD_LOAN', result);
        } catch (error) {
          console.error('Erreur lors de l\'ajout d\'un emprunt:', error);
        }
      }
    }
  };