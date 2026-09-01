const Reservation = require('../models/Reservation');
const Chambre = require('../models/Chambre');
const VerrouTemporaire = require('../models/VerrouTemporaire');

// ── Logique de disponibilité à 3 niveaux ──────────────────────
async function chambreEstDisponible(chambreId, dateArrivee, dateDepart, reservationIdAExclure = null) {
  // 1. Vérification de la chambre (état physique & dates hors service)
  const chambre = await Chambre.findById(chambreId);
  if (!chambre || chambre.statutActuel === 'maintenance') return false;

  const conflitHorsService =
    chambre.datesHorsService &&
    chambre.datesHorsService.some(
      (periode) => periode.dateDebut < dateDepart && periode.dateFin > dateArrivee
    );
  if (conflitHorsService) return false;

  // 2. Conflit avec une réservation active (confirmee, en_attente_paiement, check_in_fait)
  const filtreReservation = {
    chambre: chambreId,
    statutReservation: { $in: ['confirmee', 'en_attente_paiement', 'check_in_fait'] },
    dateArrivee: { $lt: dateDepart },
    dateDepart: { $gt: dateArrivee },
  };
  if (reservationIdAExclure) {
    filtreReservation._id = { $ne: reservationIdAExclure };
  }
  const conflitReservation = await Reservation.findOne(filtreReservation);
  if (conflitReservation) return false;

  // 3. Conflit avec un verrou temporaire actif
  const conflitVerrou = await VerrouTemporaire.findOne({
    chambre: chambreId,
    dateArrivee: { $lt: dateDepart },
    dateDepart: { $gt: dateArrivee },
  });
  if (conflitVerrou) return false;

  return true;
}

// Map statut legacy ou anglais/français vers statutReservation standard
function normaliserStatutReservation(statut) {
  if (!statut) return undefined;
  const map = {
    Confirmée: 'confirmee',
    confirmée: 'confirmee',
    confirmee: 'confirmee',
    'En attente': 'en_attente_paiement',
    en_attente_paiement: 'en_attente_paiement',
    Annulée: 'annulee',
    annulée: 'annulee',
    annulee: 'annulee',
    'En cours': 'check_in_fait',
    check_in_fait: 'check_in_fait',
    Terminée: 'check_out_fait',
    check_out_fait: 'check_out_fait',
  };
  return map[statut] || statut;
}

exports.chambreEstDisponible = chambreEstDisponible;

// @desc    Récupérer toutes les réservations
// @route   GET /api/reservations
exports.getReservations = async (req, res) => {
  try {
    const filtre = {};
    if (req.query.statut) {
      const st = normaliserStatutReservation(req.query.statut);
      filtre.statutReservation = st;
    }
    if (req.query.statutReservation) {
      filtre.statutReservation = req.query.statutReservation;
    }
    if (req.query.chambre) filtre.chambre = req.query.chambre;
    if (req.query.client) filtre.client = req.query.client;

    const reservations = await Reservation.find(filtre)
      .populate('client', 'nom prenom telephone email cin')
      .populate('chambre', 'numero typeLit mevn gamme prixNuitee statutActuel')
      .populate('creePar', 'nom email role')
      .sort({ dateArrivee: 1 });

    res.status(200).json({ success: true, count: reservations.length, data: reservations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Récupérer une réservation par ID
// @route   GET /api/reservations/:id
exports.getReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('client')
      .populate('chambre')
      .populate('creePar', 'nom email role')
      .populate('paiements');

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Réservation non trouvée' });
    }
    res.status(200).json({ success: true, data: reservation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Créer une réservation (avec figeage du prix et contrôle de disponibilité)
// @route   POST /api/reservations
exports.createReservation = async (req, res) => {
  try {
    const {
      client,
      chambre,
      dateArrivee,
      dateDepart,
      nombreAdultes,
      nombreEnfants,
      nomsOccupants,
      remise,
      devise,
      preferences,
      notesInternes,
      statutReservation,
      statut,
      creePar,
    } = req.body;

    const debut = new Date(dateArrivee);
    const fin = new Date(dateDepart);

    if (fin <= debut) {
      return res.status(400).json({
        success: false,
        message: "La date de départ doit être postérieure à la date d'arrivée",
      });
    }

    const chambreExiste = await Chambre.findById(chambre);
    if (!chambreExiste) {
      return res.status(404).json({ success: false, message: 'Chambre non trouvée' });
    }
    if (chambreExiste.statutActuel === 'maintenance') {
      return res.status(400).json({ success: false, message: 'Cette chambre est en maintenance / hors service' });
    }

    const disponible = await chambreEstDisponible(chambre, debut, fin);
    if (!disponible) {
      return res.status(409).json({
        success: false,
        message: 'Cette chambre n\'est pas disponible sur cette période (réservée, bloquée ou hors service)',
      });
    }

    // Calcul des durées et figeage du prix au moment de la réservation
    const nombreNuitsFacture = Math.ceil((fin - debut) / (1000 * 60 * 60 * 24));
    const prixNuiteeAuMoment = chambreExiste.prixNuitee;
    const montantRemise = Number(remise) || 0;
    const montantTotal = Math.max(0, prixNuiteeAuMoment * nombreNuitsFacture - montantRemise);

    const statutFinal = normaliserStatutReservation(statutReservation || statut) || 'confirmee';

    const reservation = await Reservation.create({
      client,
      chambre,
      creePar: creePar || req.user?._id,
      dateArrivee: debut,
      dateDepart: fin,
      nombreAdultes: nombreAdultes || 1,
      nombreEnfants: nombreEnfants || 0,
      nomsOccupants: nomsOccupants || [],
      prixNuiteeAuMoment,
      nombreNuitsFacture,
      remise: montantRemise,
      montantTotal,
      devise: devise || 'MGA',
      statutReservation: statutFinal,
      preferences: preferences || '',
      notesInternes: notesInternes || '',
    });

    // Synchronisation du statut physique de la chambre si check-in immédiat
    if (statutFinal === 'check_in_fait') {
      await Chambre.findByIdAndUpdate(chambre, { statutActuel: 'occupe' });
    }

    const reservationPeuplee = await reservation.populate(['client', 'chambre']);
    res.status(201).json({ success: true, data: reservationPeuplee });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Modifier une réservation (dates, chambre, statut) avec re-contrôle
// @route   PUT /api/reservations/:id
exports.updateReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Réservation non trouvée' });
    }

    const chambreId = req.body.chambre || reservation.chambre;
    const debut = req.body.dateArrivee ? new Date(req.body.dateArrivee) : reservation.dateArrivee;
    const fin = req.body.dateDepart ? new Date(req.body.dateDepart) : reservation.dateDepart;

    if (fin <= debut) {
      return res.status(400).json({
        success: false,
        message: "La date de départ doit être postérieure à la date d'arrivée",
      });
    }

    // Vérification de disponibilité si dates ou chambre ont changé
    const disponible = await chambreEstDisponible(chambreId, debut, fin, reservation._id);
    if (!disponible) {
      return res.status(409).json({
        success: false,
        message: 'Cette chambre est déjà réservée sur cette période',
      });
    }

    reservation.chambre = chambreId;
    reservation.dateArrivee = debut;
    reservation.dateDepart = fin;

    if (req.body.nombreAdultes !== undefined) reservation.nombreAdultes = req.body.nombreAdultes;
    if (req.body.nombreEnfants !== undefined) reservation.nombreEnfants = req.body.nombreEnfants;
    if (req.body.nomsOccupants !== undefined) reservation.nomsOccupants = req.body.nomsOccupants;
    if (req.body.remise !== undefined) reservation.remise = req.body.remise;
    if (req.body.preferences !== undefined) reservation.preferences = req.body.preferences;
    if (req.body.notesInternes !== undefined) reservation.notesInternes = req.body.notesInternes;

    // Mise à jour de la facturation basée sur la durée et le tarif figé
    reservation.nombreNuitsFacture = Math.ceil((fin - debut) / (1000 * 60 * 60 * 24));
    reservation.montantTotal = Math.max(
      0,
      reservation.prixNuiteeAuMoment * reservation.nombreNuitsFacture - (reservation.remise || 0)
    );

    const nouveauStatut = normaliserStatutReservation(req.body.statutReservation || req.body.statut);
    if (nouveauStatut) {
      reservation.statutReservation = nouveauStatut;

      if (nouveauStatut === 'check_in_fait') {
        if (!reservation.dateCheckInReel) reservation.dateCheckInReel = new Date();
        await Chambre.findByIdAndUpdate(chambreId, { statutActuel: 'occupe' });
      } else if (nouveauStatut === 'check_out_fait') {
        if (!reservation.dateCheckOutReel) reservation.dateCheckOutReel = new Date();
        await Chambre.findByIdAndUpdate(chambreId, { statutActuel: 'disponible' });
      } else if (nouveauStatut === 'annulee') {
        await Chambre.findByIdAndUpdate(chambreId, { statutActuel: 'disponible' });
      }
    }

    await reservation.save();
    const reservationPeuplee = await reservation.populate(['client', 'chambre']);
    res.status(200).json({ success: true, data: reservationPeuplee });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Annuler une réservation
// @route   PATCH /api/reservations/:id/annuler
exports.annulerReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Réservation non trouvée' });
    }

    reservation.statutReservation = 'annulee';
    if (req.body.motifAnnulation) {
      reservation.motifAnnulation = req.body.motifAnnulation;
    }
    await reservation.save();

    // Libère la chambre physiquement
    await Chambre.findByIdAndUpdate(reservation.chambre, { statutActuel: 'disponible' });

    res.status(200).json({ success: true, data: reservation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Supprimer une réservation
// @route   DELETE /api/reservations/:id
exports.deleteReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndDelete(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Réservation non trouvée' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
