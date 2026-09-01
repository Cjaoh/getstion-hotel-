const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, 'Le nom est requis'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "L'email est requis"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    motDePasse: {
      type: String,
      required: [true, 'Le mot de passe est requis'],
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'receptionniste'],
      default: 'receptionniste',
    },
    actif: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Hachage du mot de passe avant enregistrement
userSchema.pre('save', async function (next) {
  if (!this.isModified('motDePasse')) return next();
  const salt = await bcrypt.genSalt(10);
  this.motDePasse = await bcrypt.hash(this.motDePasse, salt);
  next();
});

// Méthode de comparaison de mots de passe
userSchema.methods.comparerMotDePasse = async function (motDePasseSaisi) {
  return await bcrypt.compare(motDePasseSaisi, this.motDePasse);
};

module.exports = mongoose.model('User', userSchema);
