const jwt = require('jsonwebtoken');
const User = require('../models/User');

const genererToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, motDePasse } = req.body;

    if (!email || !motDePasse) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    // .select('+motDePasse') car le champ est exclu par défaut (select: false dans le modèle)
    const user = await User.findOne({ email }).select('+motDePasse');

    if (!user || !user.actif) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    const motDePasseValide = await user.comparerMotDePasse(motDePasse);
    if (!motDePasseValide) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    res.json({
      _id: user._id,
      nom: user.nom,
      email: user.email,
      role: user.role,
      token: genererToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/register — réservé aux admins, pour créer un compte réceptionniste/admin
const register = async (req, res, next) => {
  try {
    const { nom, email, motDePasse, role } = req.body;

    const existe = await User.findOne({ email });
    if (existe) {
      return res.status(400).json({ message: 'Un utilisateur avec cet email existe déjà' });
    }

    const user = await User.create({ nom, email, motDePasse, role });

    res.status(201).json({
      _id: user._id,
      nom: user.nom,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me — profil de l'utilisateur connecté
const getProfil = async (req, res, next) => {
  try {
    res.json({
      _id: req.user._id,
      nom: req.user.nom,
      email: req.user.email,
      role: req.user.role,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, register, getProfil };