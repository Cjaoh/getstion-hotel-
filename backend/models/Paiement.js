const mongoose = require('mongoose');

const paiementSchema = new mongoose.Schema(
  {
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      required: true,
    },
    montant: {
      type: Number,
      required: true,
      min: 0,
    },
    modePaiement: {
      type: String,
      enum: ['Espèces', 'Carte', 'En ligne', 'Virement'],
      required: true,
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

module.exports = mongoose.model('Paiement', paiementSchema);
