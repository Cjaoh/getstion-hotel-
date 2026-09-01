const mongoose = require('mongoose');

/**
 * Empêche deux clients de réserver la même chambre pour les mêmes dates
 * pendant qu'un client remplit ses coordonnées bancaires.
 *
 * Collection séparée de Chambre : un index TTL supprime le DOCUMENT ENTIER
 * à expiration — s'il était sur Chambre, la chambre elle-même disparaîtrait !
 * Ici, seul le verrou disparaît automatiquement ; la chambre n'est jamais touchée.
 */
const verrouTemporaireSchema = new mongoose.Schema({
  chambre: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chambre',
    required: true,
  },
  dateArrivee: { type: Date, required: true },
  dateDepart: { type: Date, required: true },
  sessionId: {
    type: String,
    required: true, // identifiant de session du client qui bloque la chambre
  },
  expireAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 15 * 60 * 1000), // +15 min
  },
});

// Index TTL : MongoDB supprime automatiquement le document dès que expireAt est dépassé
verrouTemporaireSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

// Recherche rapide des verrous actifs pour une chambre donnée
verrouTemporaireSchema.index({ chambre: 1 });

module.exports = mongoose.model('VerrouTemporaire', verrouTemporaireSchema);
