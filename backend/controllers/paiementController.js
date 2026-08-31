const Paiement = require('../models/Paiement');
const Reservation = require('../models/Reservation');

// @desc    Récupérer tous les paiements
// @route   GET /api/paiements
exports.getPaiements = async (req, res) => {
  try {
    const filtre = {};
    if (req.query.statut) filtre.statut = req.query.statut;

    const paiements = await Paiement.find(filtre).populate({
      path: 'reservation',
      populate: ['client', 'chambre'],
    });
    res.status(200).json({ success: true, count: paiements.length, data: paiements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Créer un paiement — montant calculé automatiquement (nuits × prix chambre)
// @route   POST /api/paiements
exports.createPaiement = async (req, res) => {
  try {
    const { reservation: reservationId, modePaiement, statut } = req.body;

    const reservation = await Reservation.findById(reservationId).populate('chambre');
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Réservation non trouvée' });
    }

    const nombreNuits = Math.ceil(
      (reservation.dateDepart - reservation.dateArrivee) / (1000 * 60 * 60 * 24)
    );
    const montant = nombreNuits * reservation.chambre.prixNuitee;

    const paiement = await Paiement.create({
      reservation: reservationId,
      montant,
      modePaiement,
      statut: statut || 'En attente',
      datePaiement: statut === 'Payé' ? new Date() : undefined,
    });

    res.status(201).json({ success: true, data: paiement });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Mettre à jour le statut d'un paiement (ex: marquer comme Payé)
// @route   PATCH /api/paiements/:id
exports.updatePaiement = async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.statut === 'Payé') {
      updateData.datePaiement = new Date();
    }
    const paiement = await Paiement.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!paiement) {
      return res.status(404).json({ success: false, message: 'Paiement non trouvé' });
    }
    res.status(200).json({ success: true, data: paiement });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Supprimer un paiement
// @route   DELETE /api/paiements/:id
exports.deletePaiement = async (req, res) => {
  try {
    const paiement = await Paiement.findByIdAndDelete(req.params.id);
    if (!paiement) {
      return res.status(404).json({ success: false, message: 'Paiement non trouvé' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
