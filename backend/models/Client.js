const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, 'Le nom du client est requis'],
      trim: true,
    },
    prenom: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    telephone: {
      type: String,
      required: [true, 'Le téléphone est requis'],
      trim: true,
    },
    cin: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// NOUVEAU : le CIN sert de clé d'identification pour retrouver/créer un client
// à la volée. "sparse" = les clients sans CIN renseigné n'entrent pas en conflit
// entre eux (seuls les CIN réellement présents doivent être uniques).
clientSchema.index({ cin: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Client', clientSchema);