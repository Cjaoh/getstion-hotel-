const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
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
        message: 'La date de départ doit être postérieure à la date d\'arrivée',
      },
    },
    statut: {
      type: String,
      enum: ['Confirmée', 'Annulée', 'Terminée', 'En cours'],
      default: 'Confirmée',
    },
  },
  { timestamps: true }
);

// Nombre de nuits (champ virtuel)
reservationSchema.virtual('nombreNuits').get(function () {
  const diff = this.dateDepart - this.dateArrivee;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

reservationSchema.set('toJSON', { virtuals: true });
reservationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Reservation', reservationSchema);
