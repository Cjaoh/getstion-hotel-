const Chambre = require('../models/Chambre');
const Reservation = require('../models/Reservation');

// @desc    Vue calendrier: pour chaque chambre, liste des périodes occupées
//          entre dateDebut et dateFin (utilisé pour le calendrier interactif du frontend)
// @route   GET /api/disponibilite?dateDebut=2026-08-01&dateFin=2026-08-31
exports.getDisponibilite = async (req, res) => {
  try {
    const dateDebut = req.query.dateDebut ? new Date(req.query.dateDebut) : new Date();
    const dateFin = req.query.dateFin
      ? new Date(req.query.dateFin)
      : new Date(dateDebut.getFullYear(), dateDebut.getMonth() + 1, 0);

    const chambres = await Chambre.find().sort({ numero: 1 });

    const reservations = await Reservation.find({
      statut: { $in: ['Confirmée', 'En cours'] },
      dateArrivee: { $lte: dateFin },
      dateDepart: { $gte: dateDebut },
    }).populate('client', 'nom prenom');

    const data = chambres.map((chambre) => {
      const periodesOccupees = reservations
        .filter((r) => r.chambre.toString() === chambre._id.toString())
        .map((r) => ({
          reservationId: r._id,
          dateArrivee: r.dateArrivee,
          dateDepart: r.dateDepart,
          client: r.client ? `${r.client.prenom || ''} ${r.client.nom}`.trim() : 'N/A',
        }));

      return {
        chambre: {
          _id: chambre._id,
          numero: chambre.numero,
          type: chambre.type,
          statut: chambre.statut,
        },
        periodesOccupees,
      };
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
