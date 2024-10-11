export async function fetchMembers() {
    try {
      const response = await fetch('http://localhost:5000/api/members'); // L'URL doit correspondre à votre backend
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des membres');
      }
      return await response.json();
    } catch (error) {
      console.error('Erreur dans fetchMembers:', error);
      throw error; // Renvoyer l'erreur pour que le composant puisse la gérer
    }
  }