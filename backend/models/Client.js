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

module.exports = mongoose.model('Client', clientSchema);
