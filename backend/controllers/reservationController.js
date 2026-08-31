const Reservation = require('../models/Reservation');
const Chambre = require('../models/Chambre');

// Vérifie si une chambre a déjà une réservation active qui chevauche la période demandée
async function chambreEstDisponible(chambreId, dateArrivee, dateDepart, reservationIdAExclure = null) {
  const filtre = {
    chambre: chambreId,
    statut: { $in: ['Confirmée', 'En cours'] },
    // chevauchement de périodes: (debutA < finB) && (finA > debutB)
    dateArrivee: { $lt: dateDepart },
    dateDepart: { $gt: dateArrivee },
  };
  if (reservationIdAExclure) {
    filtre._id = { $ne: reservationIdAExclure };
  }
  const chevauchement = await Reservation.findOne(filtre);
  return !chevauchement;
}

// @desc    Récupérer toutes les réservations
// @route   GET /api/reservations
exports.getReservations = async (req, res) => {
  try {
    const filtre = {};
    if (req.query.statut) filtre.statut = req.query.statut;
    if (req.query.chambre) filtre.chambre = req.query.chambre;

    const reservations = await Reservation.find(filtre)
      .populate('client', 'nom prenom telephone email')
      .populate('chambre', 'numero type prixNuitee')
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
      .populate('chambre');
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Réservation non trouvée' });
    }
    res.status(200).json({ success: true, data: reservation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Créer une réservation (avec contrôle des doublons)
// @route   POST /api/reservations
exports.createReservation = async (req, res) => {
  try {
    const { client, chambre, dateArrivee, dateDepart } = req.body;

    const debut = new Date(dateArrivee);
    const fin = new Date(dateDepart);

    if (fin <= debut) {
      return res.status(400).json({
        success: false,
        message: 'La date de départ doit être postérieure à la date d\'arrivée',
      });
    }

    const chambreExiste = await Chambre.findById(chambre);
    if (!chambreExiste) {
      return res.status(404).json({ success: false, message: 'Chambre non trouvée' });
    }
    if (chambreExiste.statut === 'Hors service') {
      return res.status(400).json({ success: false, message: 'Cette chambre est hors service' });
    }

    const disponible = await chambreEstDisponible(chambre, debut, fin);
    if (!disponible) {
      return res.status(409).json({
        success: false,
        message: 'Cette chambre est déjà réservée sur cette période',
      });
    }

    const reservation = await Reservation.create({
      client,
      chambre,
      dateArrivee: debut,
      dateDepart: fin,
    });

    // Met à jour le statut de la chambre si le séjour commence aujourd'hui
    const aujourdHui = new Date();
    if (debut <= aujourdHui && fin > aujourdHui) {
      await Chambre.findByIdAndUpdate(chambre, { statut: 'Occupée' });
    }

    const reservationPeuplee = await reservation.populate(['client', 'chambre']);
    res.status(201).json({ success: true, data: reservationPeuplee });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Modifier une réservation (dates, chambre) avec re-contrôle des doublons
// @route   PUT /api/reservations/:id
exports.updateReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Réservation non trouvée' });
    }

    const chambre = req.body.chambre || reservation.chambre;
    const debut = req.body.dateArrivee ? new Date(req.body.dateArrivee) : reservation.dateArrivee;
    const fin = req.body.dateDepart ? new Date(req.body.dateDepart) : reservation.dateDepart;

    if (fin <= debut) {
      return res.status(400).json({
        success: false,
        message: 'La date de départ doit être postérieure à la date d\'arrivée',
      });
    }

    const disponible = await chambreEstDisponible(chambre, debut, fin, reservation._id);
    if (!disponible) {
      return res.status(409).json({
        success: false,
        message: 'Cette chambre est déjà réservée sur cette période',
      });
    }

    reservation.chambre = chambre;
    reservation.dateArrivee = debut;
    reservation.dateDepart = fin;
    if (req.body.statut) reservation.statut = req.body.statut;

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
    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { statut: 'Annulée' },
      { new: true }
    );
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Réservation non trouvée' });
    }

    // Libère la chambre si elle était marquée occupée pour cette réservation
    await Chambre.findByIdAndUpdate(reservation.chambre, { statut: 'Disponible' });

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
