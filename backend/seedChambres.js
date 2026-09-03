// Exécuter une seule fois : node seedChambres.js
// Génère 80 chambres : 001-020 Simple (20), puis 10 par catégorie ensuite.
// Prix indicatifs à ajuster toi-même dans le catalogue une fois généré.
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Chambre = require('./models/Chambre');

// Ordre des catégories et plage de numéros correspondante
const PLAN = [
    { typeLit: 'Simple', debut: 1, fin: 20, capaciteMax: 1, prixNuitee: 50000 },
    { typeLit: 'Double', debut: 21, fin: 30, capaciteMax: 2, prixNuitee: 75000 },
    { typeLit: 'Twin', debut: 31, fin: 40, capaciteMax: 2, prixNuitee: 75000 },
    { typeLit: 'Triple', debut: 41, fin: 50, capaciteMax: 3, prixNuitee: 100000 },
    { typeLit: 'Quadruple', debut: 51, fin: 60, capaciteMax: 4, prixNuitee: 130000 },
    { typeLit: 'Queen', debut: 61, fin: 70, capaciteMax: 2, prixNuitee: 90000 },
    { typeLit: 'King', debut: 71, fin: 80, capaciteMax: 2, prixNuitee: 110000 },
];

const genererChambres = async () => {
    await connectDB();

    const existantes = await Chambre.countDocuments();
    if (existantes > 0) {
        console.log(`${existantes} chambres existent déjà en base — script arrêté pour éviter les doublons.`);
        console.log("Supprime-les d'abord si tu veux régénérer, ou adapte le script.");
        process.exit(0);
    }

    const chambresACreer = [];

    for (const categorie of PLAN) {
        for (let n = categorie.debut; n <= categorie.fin; n++) {
            chambresACreer.push({
                numero: String(n).padStart(3, '0'), // "001", "021", ...
                typeLit: categorie.typeLit,
                capaciteMax: categorie.capaciteMax,
                gamme: 'Standard',
                categorieSpeciale: 'Aucune',
                vue: 'Aucune',
                prixNuitee: categorie.prixNuitee,
                statutActuel: 'disponible',
            });
        }
    }

    await Chambre.insertMany(chambresACreer);

    console.log(`${chambresACreer.length} chambres créées avec succès :`);
    PLAN.forEach((c) => {
        console.log(
            `  ${String(c.debut).padStart(3, '0')} à ${String(c.fin).padStart(3, '0')} — ${c.typeLit} (${c.fin - c.debut + 1} chambres, ${c.prixNuitee} Ar/nuit)`
        );
    });

    await mongoose.connection.close();
    process.exit(0);
};

genererChambres().catch((err) => {
    console.error('Erreur :', err.message);
    process.exit(1);
});