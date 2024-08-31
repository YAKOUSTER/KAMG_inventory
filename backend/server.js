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
  user: 'postgres', 
  host: 'localhost',
  database: 'KAMGgestion',
  password: 'admin', 
  port: 5432,
});

// Middleware pour centraliser la gestion des erreurs
function errorHandler(err, req, res, next) {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
}

app.use(errorHandler);

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Serveur backend en écoute sur le port ${port}`);
});

// Routes API

app.get('/api/costumes', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id AS piece_id, 
        p.code,
        p.type, 
        p.nom AS piece_name,        
        p.description, 
        p.taille_lettre, 
        p.epoque, 
        p.materiau, 
        p.etat, 
        p.couleur, 
        p.disponibilite, 
        p.perle,
        p.broderie,
        p.motif,
        p.longueur, 
        p.tour_taille_min,
        p.tour_taille_max,
        p.longueur_dos,
        p.longueur_avant,
        p.tour_jupe,
        p.longueur_epaule_epaule,
        p.longueur_manche,
        p.tour_tete,
        p.longueur_de_la_variable,
        p.variable,
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
    next(error);
  }
});

app.get('/api/members', async (req, res, next) => {
  try {
    const members = await pool.query('SELECT * FROM membres');
    res.json(members.rows);
  } catch (err) {
    next(err);
  }
});

app.get('/api/costumes/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM pieces WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Costume non trouvé' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.get('/api/type-de-pieces', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM type_de_pieces');
    res.status(200).json(result.rows);
  } catch (err) {
    next(err);
  }
});

app.get('/api/costumes/:id/history', async (req, res, next) => {
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
  } catch (error) {
    next(error);
  }
});

app.get('/api/loans', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        l.id AS loan_id, 
        l.loan_date, 
        l.return_date, 
        m.nom AS member_name, 
        l.status
      FROM 
        loans l
      JOIN 
        membres m ON l.member_id = m.id
      ORDER BY 
        l.loan_date DESC
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

app.get('/api/loans/:id', async (req, res, next) => {
  const { id } = req.params;

  try {
    const loanResult = await pool.query(`
      SELECT 
        l.id AS loan_id, 
        l.loan_date, 
        l.return_date, 
        m.nom AS member_name
      FROM 
        loans l
      JOIN 
        membres m ON l.member_id = m.id
      WHERE 
        l.id = $1
    `, [id]);

    if (loanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Emprunt non trouvé' });
    }

    const loan = loanResult.rows[0];

    const itemsResult = await pool.query(`
      SELECT 
        p.id AS piece_id, 
        p.name AS piece_name, 
        li.comment, 
        p.disponibilite AS status
      FROM 
        loan_items li
      JOIN 
        pieces p ON li.pieces_id = p.id
      WHERE 
        li.loan_id = $1
    `, [id]);

    res.status(200).json({
      ...loan,
      items: itemsResult.rows
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/costumes', async (req, res, next) => {
  const {
    code,
    type,
    nom,
    description,
    taille_lettre,
    epoque,
    materiau,
    etat,
    couleur,
    disponibilite,
    perle,
    broderie,
    motif,
    longueur, 
    tour_taille_min,
    tour_taille_max,
    longueur_dos,
    longueur_avant,
    tour_jupe,
    longueur_epaule_epaule,
    longueur_manche,
    tour_tete,
    longueur_de_la_variable,
    variable
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO pieces (code,
        type,
        nom,
        description,
        taille_lettre,
        epoque,
        materiau,
        etat,
        couleur,
        disponibilite,
        perle,
        broderie,
        motif,
        longueur, 
        tour_taille_min,
        tour_taille_max,
        longueur_dos,
        longueur_avant,
        tour_jupe,
        longueur_epaule_epaule,
        longueur_manche,
        tour_tete,
        longueur_de_la_variable,
        variable) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24) 
       RETURNING *`,
      [code,
        type,
        nom,
        description,
        taille_lettre,
        epoque,
        materiau,
        etat,
        couleur,
        disponibilite,
        perle,
        broderie,
        motif,
        longueur, 
        tour_taille_min,
        tour_taille_max,
        longueur_dos,
        longueur_avant,
        tour_jupe,
        longueur_epaule_epaule,
        longueur_manche,
        tour_tete,
        longueur_de_la_variable,
        variable]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

app.post('/api/type-de-pieces', async (req, res, next) => {
  const { nom, description } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO type_de_pieces (nom, description) VALUES ($1, $2) RETURNING *',
      [nom, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

app.put('/api/costumes/:id', async (req, res, next) => {
  const { id } = req.params;
  const { code, type, name, description, taille, epoque, materiau, etat, couleur, disponibilite } = req.body;

  try {
    const result = await pool.query(
      'UPDATE pieces SET code = $1, type = $2, name = $3, description = $4, taille = $5, epoque = $6, materiau = $7, etat = $8, couleur = $9, disponibilite = $10 WHERE id = $11 RETURNING *',
      [code, type, name, description, taille, epoque, materiau, etat, couleur, disponibilite, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Costume non trouvé' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

app.post('/api/loans', async (req, res, next) => {
  const { memberId, cartItems, comments } = req.body;
  
  console.log('Requête reçue:', { memberId, cartItems, comments });

  try {
    const result = await pool.query(
      'INSERT INTO loans (member_id) VALUES ($1) RETURNING id',
      [memberId]
    );
    const loanId = result.rows[0].id;

    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      const comment = comments[i] || '';

      console.log(`Traitement de l'item: ${item.id} avec commentaire: ${comment}`);

      await pool.query(
        'INSERT INTO loan_items (loan_id, pieces_id, comment) VALUES ($1, $2, $3)',
        [loanId, item.id, comment]
      );

      await pool.query(
        'UPDATE pieces SET disponibilite = $1 WHERE id = $2',
        ['Emprunté', item.id]
      );

      await pool.query(
        'INSERT INTO comments_piece (piece_id, loan_id, comment) VALUES ($1, $2, $3)',
        [item.id, loanId, comment]
      );
    }

    res.status(200).json({ message: 'Emprunt créé avec succès' });
  } catch (error) {
    next(error);
  }
});

// Route pour retourner toutes les pièces d'un emprunt
app.put('/api/loans/:id/return-all', async (req, res) => {
  const { id } = req.params;

  try {
    // Marquer toutes les pièces de cet emprunt comme "Disponible"
    await pool.query(`
      UPDATE pieces
      SET disponibilite = 'Disponible'
      WHERE id IN (
        SELECT pieces_id FROM loan_items WHERE loan_id = $1
      )
    `, [id]);

    // Mettre à jour l'emprunt au statut "Retourné"
    await pool.query(`
      UPDATE loans
      SET status = 'Retourné', return_date = NOW()
      WHERE id = $1
    `, [id]);

    res.status(200).json({ message: 'Toutes les pièces ont été retournées avec succès.' });
  } catch (error) {
    console.error('Erreur lors du retour des pièces:', error);
    res.status(500).json({ error: 'Erreur lors du retour des pièces.' });
  }
});

// Route pour retourner quelques pièces d'un emprunt
app.put('/api/loans/:id/return-partial', async (req, res) => {
  const { id } = req.params;
  const { returnedItems } = req.body;

  try {
    // Marquer les pièces retournées comme "Disponible"
    for (const itemId of returnedItems) {
      await pool.query(`
        UPDATE pieces
        SET disponibilite = 'Disponible'
        WHERE id = $1
      `, [itemId]);
    }

    // Vérifier si toutes les pièces ont été retournées ou non
    const remainingItems = await pool.query(`
      SELECT COUNT(*) 
      FROM loan_items li
      JOIN pieces p ON li.pieces_id = p.id
      WHERE li.loan_id = $1 AND p.disponibilite != 'Disponible'
    `, [id]);

    const status = remainingItems.rows[0].count > 0 ? 'Retour en cours' : 'Retourné';

    // Mettre à jour l'emprunt au statut correspondant
    await pool.query(`
      UPDATE loans
      SET status = $1, return_date = CASE WHEN $1 = 'Retourné' THEN NOW() ELSE NULL END
      WHERE id = $2
    `, [status, id]);

    res.status(200).json({ message: 'Les pièces sélectionnées ont été retournées avec succès.' });
  } catch (error) {
    console.error('Erreur lors du retour partiel des pièces:', error);
    res.status(500).json({ error: 'Erreur lors du retour partiel des pièces.' });
  }
});
