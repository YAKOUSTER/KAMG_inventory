// loanService.js

import axios from 'axios';

export const fetchLoans = async () => {
  try {
    const response = await axios.get('http://localhost:5000/api/loans');
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des emprunts:', error);
    throw error;
  }
};

export const fetchMembers = async () => {
  try {
    const response = await axios.get('http://localhost:5000/api/members');
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des membres:', error);
    throw error;
  }
};

// Nouvelle fonction pour récupérer les détails d'un emprunt spécifique
export const fetchLoanDetails = async (loanId) => {
  try {
    const response = await axios.get(`http://localhost:5000/api/loans/${loanId}`);
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de la récupération des détails de l'emprunt ${loanId}:`, error);
    throw error;
  }
};
