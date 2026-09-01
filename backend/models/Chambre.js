const mongoose = require('mongoose');

const chambreSchema = new mongoose.Schema(
  {
    numero: {
      type: String,
      required: [true, 'Le numéro de chambre est requis'],
      unique: true,
      trim: true,
    },

    // ── Selon l'occupation et les lits ──────────────────────────
    typeLit: {
      type: String,
      required: true,
      enum: ['Simple', 'Double', 'Twin', 'Triple', 'Quadruple', 'Queen', 'King'],
      default: 'Double',
    },
    capaciteMax: {
      type: Number,
      required: true,
      min: 1,
      default: 2,
      // Simple=1, Double/Twin/Queen/King=2, Triple=3, Quadruple=4
    },

    // ── Selon le niveau de confort et la gamme ──────────────────
    gamme: {
      type: String,
      required: true,
      enum: ['Standard', 'Supérieure', 'Executive'],
      default: 'Standard',
    },

    // ── Suites et logements spéciaux (optionnel, cumulable) ─────
    categorieSpeciale: {
      type: String,
      enum: ['Aucune', 'Suite', 'Communicante', 'Studio'],
      default: 'Aucune',
    },
    chambreLiee: {
      // pour les chambres communicantes : pointe vers l'autre chambre
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chambre',
      default: null,
    },

    vue: {
      type: String,
      enum: ['Cour', 'Parking', 'Rue', 'Jardin', 'Mer', 'Ville', 'Aucune'],
      default: 'Aucune',
    },
    equipements: {
      // ex: ['Wifi haut débit', 'Machine à café', 'Peignoirs', 'Kitchenette', 'Accès Executive Lounge']
      type: [String],
      default: [],
    },

    prixNuitee: {
      type: Number,
      required: [true, 'Le prix de la nuitée est requis'],
      min: 0,
    },
    description: {
      type: String,
      default: '',
    },

    // ── Disponibilité en temps réel (état physique de la chambre) ─
    statutActuel: {
      type: String,
      enum: ['disponible', 'occupe', 'en_nettoyage', 'maintenance'],
      default: 'disponible',
    },
    datesHorsService: [
      {
        dateDebut: { type: Date, required: true },
        dateFin: { type: Date, required: true },
        raison: { type: String, required: true }, // ex: "Fuite d'eau", "Travaux"
      },
    ],
  },
  { timestamps: true }
);

// Virtuals de rétrocompatibilité pour 'statut' et 'type'
chambreSchema
  .virtual('statut')
  .get(function () {
    const map = {
      disponible: 'Disponible',
      occupe: 'Occupée',
      en_nettoyage: 'En cours de nettoyage',
      maintenance: 'Hors service',
    };
    return map[this.statutActuel] || this.statutActuel;
  })
  .set(function (val) {
    const mapReverse = {
      Disponible: 'disponible',
      Occupée: 'occupe',
      'En cours de nettoyage': 'en_nettoyage',
      'Hors service': 'maintenance',
    };
    this.statutActuel = mapReverse[val] || val;
  });

chambreSchema
  .virtual('type')
  .get(function () {
    return this.typeLit;
  })
  .set(function (val) {
    this.typeLit = val;
  });

chambreSchema.set('toJSON', { virtuals: true });
chambreSchema.set('toObject', { virtuals: true });

// Filtres fréquents : type de chambre + gamme + statut + prix
chambreSchema.index({ typeLit: 1, gamme: 1, statutActuel: 1, prixNuitee: 1 });

module.exports = mongoose.model('Chambre', chambreSchema);
