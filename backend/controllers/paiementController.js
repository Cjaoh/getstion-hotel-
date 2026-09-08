const mongoose = require('mongoose');
const Paiement = require('../models/Paiement');
const Reservation = require('../models/Reservation');

// Helper — recalcule montantPaye/statutPaiement sur la réservation à partir de
// TOUS ses paiements en base (source de vérité unique, pas d'incrémentation manuelle
// qui pourrait dériver en cas d'erreur ailleurs).
async function mettreAJourStatutPaiementReservation(reservationId, session) {
  const paiements = await Paiement.find({ reservation: reservationId }).session(session);
  const paiementsPayes = paiements.filter((p) => p.statut === 'Payé');
  const montantPaye = paiementsPayes.reduce((sum, p) => sum + p.montant, 0);

  const reservation = await Reservation.findById(reservationId).session(session);
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

  await reservation.save({ session });
  return reservation;
}

// @desc    Récupérer tous les paiements
// @route   GET /api/paiements
exports.getPaiements = async (req, res) => {
  try {
    const filtre = {};
    if (req.query.statut) filtre.statut = req.query.statut;
    if (req.query.reservation) filtre.reservation = req.query.reservation;

    const paiements = await Paiement.find(filtre)
      .populate({
        path: 'reservation',
        populate: ['client', 'chambre'],
      })
      .populate('encaissePar', 'nom email role')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: paiements.length, data: paiements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Créer un paiement — montant par défaut = SOLDE RESTANT (montantTotal - montantPaye déjà versé)
// @route   POST /api/paiements
exports.createPaiement = async (req, res) => {
  const { reservation: reservationId, modePaiement, statut, montant, encaissePar } = req.body;

  const session = await mongoose.startSession();
  let paiementCree;
  let reservationIntrouvable = false;
  let montantInvalide = null;

  try {
    await session.withTransaction(async () => {
      const reservation = await Reservation.findById(reservationId).populate('chambre').session(session);
      if (!reservation) {
        reservationIntrouvable = true;
        throw new Error('ABORT_CONTROLE');
      }

      // Solde restant = ce qu'il reste réellement à payer, en tenant compte des
      // acomptes déjà encaissés (reservation.montantPaye est toujours à jour car
      // recalculé après chaque paiement — voir mettreAJourStatutPaiementReservation)
      const soldeRestant = Math.max(0, reservation.montantTotal - reservation.montantPaye);

      let montantPaiement = montant;
      if (montantPaiement === undefined || montantPaiement === null || montantPaiement === '') {
        montantPaiement = soldeRestant;
      }
      montantPaiement = Number(montantPaiement);

      if (!montantPaiement || montantPaiement <= 0) {
        montantInvalide = { raison: 'Le montant doit être supérieur à 0' };
        throw new Error('ABORT_CONTROLE');
      }
      // Marge de tolérance de 1 Ar pour éviter les faux positifs d'arrondi flottant
      if (montantPaiement > soldeRestant + 1) {
        montantInvalide = {
          raison: `Le montant dépasse le solde restant (${soldeRestant} ${reservation.devise || 'Ar'})`,
          soldeRestant,
        };
        throw new Error('ABORT_CONTROLE');
      }

      const statutPaiement = statut || 'En attente';

      const resultats = await Paiement.create(
        [
          {
            reservation: reservationId,
            montant: montantPaiement,
            modePaiement: modePaiement || 'Espèces',
            statut: statutPaiement,
            encaissePar: encaissePar || req.user?._id,
            datePaiement: statutPaiement === 'Payé' ? new Date() : undefined,
          },
        ],
        { session }
      );
      paiementCree = resultats[0];

      await mettreAJourStatutPaiementReservation(reservationId, session);
    });
  } catch (error) {
    if (error.message !== 'ABORT_CONTROLE') {
      await session.endSession();
      return res.status(400).json({ success: false, message: error.message });
    }
  }
  await session.endSession();

  if (reservationIntrouvable) {
    return res.status(404).json({ success: false, message: 'Réservation non trouvée' });
  }
  if (montantInvalide) {
    return res.status(400).json({ success: false, ...montantInvalide });
  }

  const paiementPeuple = await paiementCree.populate({
    path: 'reservation',
    populate: ['client', 'chambre'],
  });

  res.status(201).json({ success: true, data: paiementPeuple });
};

// Champs autorisés en modification — évite le mass assignment (ex: changer `reservation`
// ou `encaissePar` via une requête modifiée, ce qui désynchroniserait les totaux).
const CHAMPS_MODIFIABLES_PAIEMENT = ['statut', 'modePaiement', 'montant', 'datePaiement'];

// @desc    Mettre à jour le statut d'un paiement (ex: marquer comme Payé ou Remboursé)
// @route   PATCH /api/paiements/:id
exports.updatePaiement = async (req, res) => {
  const session = await mongoose.startSession();
  let paiementModifie;
  let paiementIntrouvable = false;

  try {
    await session.withTransaction(async () => {
      const paiement = await Paiement.findById(req.params.id).session(session);
      if (!paiement) {
        paiementIntrouvable = true;
        throw new Error('ABORT_CONTROLE');
      }

      for (const champ of CHAMPS_MODIFIABLES_PAIEMENT) {
        if (req.body[champ] !== undefined) {
          paiement[champ] = req.body[champ];
        }
      }
      if (paiement.statut === 'Payé' && !paiement.datePaiement) {
        paiement.datePaiement = new Date();
      }

      await paiement.save({ session });
      await mettreAJourStatutPaiementReservation(paiement.reservation, session);
      paiementModifie = paiement;
    });
  } catch (error) {
    if (error.message !== 'ABORT_CONTROLE') {
      await session.endSession();
      return res.status(400).json({ success: false, message: error.message });
    }
  }
  await session.endSession();

  if (paiementIntrouvable) {
    return res.status(404).json({ success: false, message: 'Paiement non trouvé' });
  }

  const paiementPeuple = await paiementModifie.populate({
    path: 'reservation',
    populate: ['client', 'chambre'],
  });

  res.status(200).json({ success: true, data: paiementPeuple });
};

// @desc    Supprimer un paiement — UNIQUEMENT s'il est encore "En attente" (erreur de saisie).
//          Un paiement déjà "Payé" doit être traité via un remboursement (PATCH statut=Remboursé),
//          jamais supprimé, pour conserver une trace financière complète.
// @route   DELETE /api/paiements/:id
exports.deletePaiement = async (req, res) => {
  try {
    const paiement = await Paiement.findById(req.params.id);
    if (!paiement) {
      return res.status(404).json({ success: false, message: 'Paiement non trouvé' });
    }

    if (paiement.statut !== 'En attente') {
      return res.status(400).json({
        success: false,
        message:
          'Seul un paiement "En attente" peut être supprimé. Pour un paiement déjà payé, utilisez le remboursement.',
      });
    }

    await Paiement.findByIdAndDelete(req.params.id);
    await mettreAJourStatutPaiementReservation(paiement.reservation);

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};