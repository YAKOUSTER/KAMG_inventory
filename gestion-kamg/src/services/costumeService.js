const API_URL = 'http://localhost:5000/api/costumes';

export const fetchCostumes = async () => {
  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error('Network response was not ok.');
  }
  return response.json();
};

// Exemple de fonction pour obtenir un costume par ID
export async function fetchCostumeById(id) {
  console.log(`Fetching costume with ID: ${id}`);
  try {
    const response = await fetch(`http://localhost:5000/api/costumes/${id}`);
    if (!response.ok) {
      console.error(`Failed to fetch costume. Status: ${response.status}`);
      throw new Error('Network response was not ok.');
    }
    const data = await response.json();
    console.log('Fetched costume data:', data);
    return data;
  } catch (error) {
    console.error('Error fetching costume:', error);
    throw error; // Rejeter la promesse pour que l'appelant puisse gérer l'erreur
  }
}

export const createCostume = async (costume) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(costume)
  });
  if (!response.ok) {
    throw new Error('Network response was not ok.');
  }
  return response.json();
};
