const mongoose = require('mongoose');

const chambreSchema = new mongoose.Schema(
  {
    numero: {
      type: String,
      required: [true, 'Le numéro de chambre est requis'],
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['Simple', 'Double', 'Suite'],
    },
    prixNuitee: {
      type: Number,
      required: [true, 'Le prix de la nuitée est requis'],
      min: 0,
    },
    statut: {
      type: String,
      enum: ['Disponible', 'Occupée', 'En cours de nettoyage', 'Hors service'],
      default: 'Disponible',
    },
    description: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Chambre', chambreSchema);
