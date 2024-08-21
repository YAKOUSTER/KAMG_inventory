const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// Configuration de la connexion PostgreSQL
const pool = new Pool({
  user: 'postgres', // Remplacez par votre nom d'utilisateur PostgreSQL
  host: 'localhost',
  database: 'KAMGgestion',
  password: 'admin', // Remplacez par votre mot de passe PostgreSQL
  port: 5432,
});

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Serveur backend en écoute sur le port ${port}`);
});

app.get('/api/costumes', async (req, res) => {
  try {
      const result = await pool.query(`
          SELECT 
              p.id AS piece_id, 
              p.name AS piece_name, 
              p.code, 
              p.type, 
              p.description, 
              p.taille, 
              p.epoque, 
              p.materiau, 
              p.etat, 
              p.couleur, 
              p.disponibilite, 
              m.nom AS borrower_name, 
              l.loan_date, 
              l.return_date, 
              l.status
          FROM 
              pieces p
          LEFT JOIN 
              loan_items li ON p.id = li.pieces_id
          LEFT JOIN 
              loans l ON li.loan_id = l.id
          LEFT JOIN 
              membres m ON l.member_id = m.id;
      `);

      res.status(200).json(result.rows);
  } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la récupération des pièces' });
  }
});

// Route pour récupérer tous les membres
app.get('/api/members', async (req, res) => {
  try {
    const members = await pool.query('SELECT * FROM membres');
    res.json(members.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération des membres.' });
  }
});



// Route pour obtenir un costume par ID
app.get('/api/costumes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM pieces WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Costume not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching costume:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route pour récupérer tous les types de pièces
app.get('/api/type-de-pieces', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM type_de_pieces');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération des types de pièces' });
  }
});


// Route pour ajouter un nouveau costume
app.post('/api/costumes', async (req, res) => {
  const {
    code,
    type,
    name,
    description,
    taille,
    epoque,
    materiau,
    etat,
    couleur,
    disponibilite,
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO pieces (code, type, name, description, taille, epoque, materiau, etat, couleur, disponibilite) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING *`,
      [code, type, name, description, taille, epoque, materiau, etat, couleur, disponibilite]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du costume' });
  }
});

// Route pour ajouter un nouveau type de pièce
app.post('/api/type-de-pieces', async (req, res) => {
  const { nom, description } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO type_de_pieces (nom, description) VALUES ($1, $2) RETURNING *',
      [nom, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du type de pièce' });
  }
});


// Route pour mettre à jour une pièce de costume
app.put('/api/costumes/:id', async (req, res) => {
  const { id } = req.params;
  const { code, type, name, description, taille, epoque, materiau, etat, couleur, disponibilite } = req.body;

  try {
    const result = await pool.query(
      'UPDATE pieces SET code = $1, type = $2, name = $3, description = $4, taille = $5, epoque = $6, materiau = $7, etat = $8, couleur = $9, disponibilite = $10 WHERE id = $11 RETURNING *',
      [code, type, name, description, taille, epoque, materiau, etat, couleur, disponibilite, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Costume not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Erreur lors de la mise à jour du costume:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du costume' });
  }
});
app.post('/api/loans', async (req, res) => {
  const { memberId, cartItems, comments } = req.body;
  
  console.log('Requête reçue:', { memberId, cartItems, comments }); // Log des données reçues

  try {
    // Crée un nouvel emprunt
    const result = await pool.query(
      'INSERT INTO loans (member_id) VALUES ($1) RETURNING id',
      [memberId]
    );
    const loanId = result.rows[0].id;

    // Associe les items du panier à cet emprunt
    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      const comment = comments[i] || '';

      console.log(`Traitement de l'item: ${item.id} avec commentaire: ${comment}`); // Log de chaque item

      // Associe les items au prêt
      await pool.query(
        'INSERT INTO loan_items (loan_id, pieces_id, comment) VALUES ($1, $2, $3)',
        [loanId, item.id, comment]
      );

      // Marque le costume comme indisponible
      await pool.query(
        'UPDATE pieces SET disponibilite = false WHERE id = $1',
        [item.id]
      );

      // Ajouter un commentaire général sur l'état du costume
      await pool.query(
        'INSERT INTO comments_piece (piece_id, loan_id, comment) VALUES ($1, $2, $3)',
        [item.id, loanId, comment]
      );
    }

    res.status(200).json({ message: 'Emprunt créé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la création de l\'emprunt:', error); // Log de l'erreur
    res.status(500).json({ error: 'Erreur serveur' });
  }
});




app.get('/api/costumes/:id/history', async (req, res) => {
  const costumeId = req.params.id;

  try {
    const history = await pool.query(
      `SELECT l.id AS loan_id, l.loan_date, l.return_date, li.comment, m.nom AS member_name
       FROM loans l
       JOIN loan_items li ON l.id = li.loan_id
       JOIN membres m ON l.member_id = m.id
       WHERE li.pieces_id = $1
       ORDER BY l.loan_date DESC`,
      [costumeId]
    );

    res.status(200).json(history.rows);
  }  catch (error) {
    console.error(`Erreur lors de la récupération de l'historique des emprunts pour le costume ID ${costumeId}:`, error);
    res.status(500).json({ error: `Erreur serveur: ${error.message}` });
  }
});

