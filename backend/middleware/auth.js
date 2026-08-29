const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_lifeguard_key_2026';

module.exports = (req, res, next) => {
  // Récupérer le token depuis l'en-tête Authorization (ex: "Bearer eyJhb...")
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Accès refusé. Aucun token fourni.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Vérifier le token
    const decoded = jwt.verify(token, JWT_SECRET);
    // Ajouter l'ID de l'utilisateur à la requête pour les prochaines routes
    req.user = decoded; // { userId: "..." }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
};
