const mongoose = require('mongoose');

const paiementSchema = new mongoose.Schema(
  {
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      required: true,
    },
    reference: {
      // Référence lisible pour le client et la comptabilité, ex: TT-20260908-4F2A
      type: String,
      unique: true,
    },
    montant: {
      type: Number,
      required: true,
      min: [0.01, 'Le montant du paiement doit être supérieur à 0'],
    },
    modePaiement: {
      type: String,
      enum: ['Espèces', 'Carte', 'En ligne', 'Virement'],
      required: true,
    },
    // Pour les paiements par carte : les 4 derniers chiffres uniquement — jamais le
    // numéro complet, ni la date d'expiration, ni le cryptogramme (aucune donnée
    // sensible de porteur de carte ne transite ni n'est stockée par cette application).
    carteMasquee: {
      type: String,
      default: null,
    },
    statut: {
      type: String,
      enum: ['En attente', 'Payé', 'Remboursé'],
      default: 'En attente',
    },
    encaissePar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    datePaiement: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Génère la référence avant la validation, pas seulement avant la sauvegarde,
// pour qu'elle soit garantie présente au moment où `unique` est vérifié.
paiementSchema.pre('validate', function (next) {
  if (!this.reference) {
    const horodatage = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const alea = Math.random().toString(16).slice(2, 6).toUpperCase();
    this.reference = `TT-${horodatage}-${alea}`;
  }
  next();
});

// Filtre fréquent : tous les paiements d'une réservation donnée
paiementSchema.index({ reservation: 1 });

module.exports = mongoose.model('Paiement', paiementSchema);