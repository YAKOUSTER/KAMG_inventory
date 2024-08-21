import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Fonction pour récupérer tous les types de pièces
export const fetchTypeDePieces = async () => {
  try {
    const response = await axios.get(`${API_URL}/type-de-pieces`);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des types de pièces :", error);
    throw error;
  }
};

// Fonction pour ajouter un nouveau type de pièce
export const addTypeDePiece = async (typeDePiece) => {
  try {
    const response = await axios.post(`${API_URL}/type-de-pieces`, typeDePiece);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de l'ajout du type de pièce :", error);
    throw error;
  }
};
