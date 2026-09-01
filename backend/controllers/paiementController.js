const Paiement = require('../models/Paiement');
const Reservation = require('../models/Reservation');

// Helper pour mettre à jour le statut et le total des paiements sur une réservation
async function mettreAJourStatutPaiementReservation(reservationId) {
  const paiements = await Paiement.find({ reservation: reservationId });
  const paiementsPayes = paiements.filter((p) => p.statut === 'Payé');
  const montantPaye = paiementsPayes.reduce((sum, p) => sum + p.montant, 0);

  const reservation = await Reservation.findById(reservationId);
  if (!reservation) return;

  reservation.montantPaye = montantPaye;
  reservation.paiements = paiements.map((p) => p._id);

  if (montantPaye >= reservation.montantTotal && reservation.montantTotal > 0) {
    reservation.statutPaiement = 'Payé';
  } else if (montantPaye > 0) {
    reservation.statutPaiement = 'Partiel';
  } else {
    reservation.statutPaiement = 'Non payé';
  }

  await reservation.save();
}

// @desc    Récupérer tous les paiements
// @route   GET /api/paiements
exports.getPaiements = async (req, res) => {
  try {
    const filtre = {};
    if (req.query.statut) filtre.statut = req.query.statut;

    const paiements = await Paiement.find(filtre)
      .populate({
        path: 'reservation',
        populate: ['client', 'chambre'],
      })
      .populate('encaissePar', 'nom email role');

    res.status(200).json({ success: true, count: paiements.length, data: paiements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Créer un paiement — montant basé sur le tarif figé prixNuiteeAuMoment ou le restant à payer
// @route   POST /api/paiements
exports.createPaiement = async (req, res) => {
  try {
    const { reservation: reservationId, modePaiement, statut, montant, encaissePar } = req.body;

    const reservation = await Reservation.findById(reservationId).populate('chambre');
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Réservation non trouvée' });
    }

    // Si le montant n'est pas spécifié, on utilise le montant total de la réservation ou le prix calculé
    let montantPaiement = montant;
    if (montantPaiement === undefined || montantPaiement === null) {
      if (reservation.montantTotal !== undefined) {
        montantPaiement = reservation.montantTotal;
      } else {
        const nombreNuits = Math.ceil(
          (reservation.dateDepart - reservation.dateArrivee) / (1000 * 60 * 60 * 24)
        );
        const prixNuitee = reservation.prixNuiteeAuMoment || reservation.chambre?.prixNuitee || 0;
        montantPaiement = nombreNuits * prixNuitee;
      }
    }

    const statutPaiement = statut || 'En attente';

    const paiement = await Paiement.create({
      reservation: reservationId,
      montant: montantPaiement,
      modePaiement: modePaiement || 'Espèces',
      statut: statutPaiement,
      encaissePar: encaissePar || req.user?._id,
      datePaiement: statutPaiement === 'Payé' ? new Date() : undefined,
    });

    await mettreAJourStatutPaiementReservation(reservationId);

    const paiementPeuple = await paiement.populate({
      path: 'reservation',
      populate: ['client', 'chambre'],
    });

    res.status(201).json({ success: true, data: paiementPeuple });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Mettre à jour le statut d'un paiement (ex: marquer comme Payé ou Remboursé)
// @route   PATCH /api/paiements/:id
exports.updatePaiement = async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.statut === 'Payé' && !updateData.datePaiement) {
      updateData.datePaiement = new Date();
    }

    const paiement = await Paiement.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!paiement) {
      return res.status(404).json({ success: false, message: 'Paiement non trouvé' });
    }

    await mettreAJourStatutPaiementReservation(paiement.reservation);

    const paiementPeuple = await paiement.populate({
      path: 'reservation',
      populate: ['client', 'chambre'],
    });

    res.status(200).json({ success: true, data: paiementPeuple });
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

    await mettreAJourStatutPaiementReservation(paiement.reservation);

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
