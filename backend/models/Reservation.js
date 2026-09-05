const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    // ── Identifiants (liaisons / références) ────────────────────
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    chambre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chambre',
      required: true,
    },
    creePar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // ── NOUVEAU : regroupement de réservations créées en une seule soumission ──
    groupeReservationId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    // NOUVEAU : true tant qu'un admin n'a pas validé/réassigné manuellement
    // l'assignation automatique (cas d'une demande spéciale non vide)
    enAttenteValidation: {
      type: Boolean,
      default: false,
    },

    // ── Dates et durées ──────────────────────────────────────────
    dateArrivee: {
      type: Date,
      required: [true, "La date d'arrivée est requise"],
    },
    dateDepart: {
      type: Date,
      required: [true, 'La date de départ est requise'],
      validate: {
        validator: function (value) {
          return value > this.dateArrivee;
        },
        message: "La date de départ doit être postérieure à la date d'arrivée",
      },
    },

    // ── Occupants ────────────────────────────────────────────────
    nombreAdultes: { type: Number, required: true, min: 1, default: 1 },
    nombreEnfants: { type: Number, min: 0, default: 0 },
    nomsOccupants: { type: [String], default: [] },

    // ── Suivi financier (historique figé) ─────────────────────────
    prixNuiteeAuMoment: { type: Number, required: true, min: 0 },
    nombreNuitsFacture: { type: Number, required: true, min: 1 },
    remise: { type: Number, default: 0, min: 0 },
    montantTotal: { type: Number, required: true, min: 0 },
    devise: { type: String, default: 'MGA' },

    // ── Gestion des paiements ─────────────────────────────────────
    montantPaye: { type: Number, default: 0, min: 0 },
    statutPaiement: {
      type: String,
      enum: ['Non payé', 'Partiel', 'Payé', 'Remboursé'],
      default: 'Non payé',
    },
    paiements: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Paiement',
      },
    ],

    // ── Cycle de vie et suivi réel ─────────────────────────────────
    statutReservation: {
      type: String,
      enum: [
        'confirmee',
        'en_attente_paiement',
        'annulee',
        'check_in_fait',
        'check_out_fait',
      ],
      default: 'en_attente_paiement',
    },
    dateCheckInReel: { type: Date, default: null },
    dateCheckOutReel: { type: Date, default: null },
    motifAnnulation: { type: String, default: '' },

    // ── Préférences et notes ─────────────────────────────────────
    preferences: { type: String, default: '' },
    notesInternes: { type: String, default: '' },
  },
  { timestamps: true }
);

reservationSchema.virtual('nombreNuits').get(function () {
  const diff = this.dateDepart - this.dateArrivee;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

reservationSchema
  .virtual('statut')
  .get(function () {
    const map = {
      confirmee: 'Confirmée',
      en_attente_paiement: 'En attente',
      annulee: 'Annulée',
      check_in_fait: 'En cours',
      check_out_fait: 'Terminée',
    };
    return map[this.statutReservation] || this.statutReservation;
  })
  .set(function (val) {
    const mapReverse = {
      Confirmée: 'confirmee',
      'En attente': 'en_attente_paiement',
      Annulée: 'annulee',
      'En cours': 'check_in_fait',
      Terminée: 'check_out_fait',
    };
    this.statutReservation = mapReverse[val] || val;
  });

reservationSchema.set('toJSON', { virtuals: true });
reservationSchema.set('toObject', { virtuals: true });

// ── Indexes ──────────────────────────────────────────────────────
reservationSchema.index({ chambre: 1, statutReservation: 1 });
reservationSchema.index({ dateArrivee: 1, dateDepart: 1 });
reservationSchema.index({ client: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);