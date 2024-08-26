// src/services/loanService.js

const API_BASE_URL = 'http://localhost:5000/api';

// Fonction pour récupérer tous les emprunts
export async function fetchLoans() {
  const response = await fetch(`${API_BASE_URL}/loans`);
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des emprunts');
  }
  return response.json();
}

// Fonction pour récupérer tous les membres
export async function fetchMembers() {
  const response = await fetch(`${API_BASE_URL}/members`);
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des membres');
  }
  return response.json();
}