// Exécuter une seule fois : node seedAccueil.js
// Crée un compte réceptionniste ("Accueil") de test pour tes essais.
// Pour créer d'autres comptes accueil ensuite, utilise plutôt
// POST /api/auth/register en étant connecté en tant qu'admin.
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');

const creerCompteAccueil = async () => {
    await connectDB();

    const existe = await User.findOne({ email: 'accueil@hotel.mg' });
    if (existe) {
        console.log('Ce compte accueil existe déjà :', existe.email);
        process.exit(0);
    }

    const accueil = await User.create({
        nom: 'Accueil',
        email: 'accueil@hotel.mg',
        motDePasse: 'ChangeMoi123!', // À changer immédiatement après le premier login
        role: 'receptionniste',
    });

    console.log('Compte accueil créé avec succès :');
    console.log('  Email :', accueil.email);
    console.log('  Mot de passe temporaire : ChangeMoi123!');
    console.log('⚠️  Change ce mot de passe dès la première connexion.');

    await mongoose.connection.close();
    process.exit(0);
};

creerCompteAccueil().catch((err) => {
    console.error('Erreur :', err.message);
    process.exit(1);
});