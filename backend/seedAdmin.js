// Exécuter une seule fois : node seedAdmin.js
// Nécessaire car /api/auth/register est protégé et réservé aux admins —
// il faut donc un premier admin créé directement en base pour pouvoir se connecter.
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');

const creerPremierAdmin = async () => {
  await connectDB();

  const existe = await User.findOne({ role: 'admin' });
  if (existe) {
    console.log('Un compte admin existe déjà :', existe.email);
    process.exit(0);
  }

  const admin = await User.create({
    nom: 'Administrateur',
    email: 'admin@hotel.mg',
    motDePasse: 'ChangeMoi123!', // À changer immédiatement après le premier login
    role: 'admin',
  });

  console.log('Compte admin créé avec succès :');
  console.log('  Email :', admin.email);
  console.log('  Mot de passe temporaire : ChangeMoi123!');
  console.log('⚠️  Change ce mot de passe dès ta première connexion.');

  await mongoose.connection.close();
  process.exit(0);
};

creerPremierAdmin().catch((err) => {
  console.error('Erreur :', err.message);
  process.exit(1);
});