const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Vérifie qu'un token JWT valide est fourni, attache l'utilisateur à req.user
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Non autorisé — aucun token fourni' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);

    if (!req.user || !req.user.actif) {
      return res.status(401).json({ message: 'Non autorisé — utilisateur introuvable ou désactivé' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Non autorisé — token invalide ou expiré' });
  }
};

// Restreint l'accès à certains rôles : autorize('admin') ou autorize('admin', 'receptionniste')
const autorize = (...rolesAutorises) => {
  return (req, res, next) => {
    if (!req.user || !rolesAutorises.includes(req.user.role)) {
      return res.status(403).json({
        message: `Accès refusé — rôle requis : ${rolesAutorises.join(' ou ')}`,
      });
    }
    next();
  };
};

module.exports = { protect, autorize };