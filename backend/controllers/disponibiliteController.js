const Chambre = require('../models/Chambre');
const Reservation = require('../models/Reservation');
const VerrouTemporaire = require('../models/VerrouTemporaire');

// @desc    Vue calendrier: pour chaque chambre, liste des périodes occupées ou verrouillées
//          entre dateDebut et dateFin
// @route   GET /api/disponibilite?dateDebut=2026-08-01&dateFin=2026-08-31
exports.getDisponibilite = async (req, res) => {
  try {
    const dateDebut = req.query.dateDebut ? new Date(req.query.dateDebut) : new Date();
    const dateFin = req.query.dateFin
      ? new Date(req.query.dateFin)
      : new Date(dateDebut.getFullYear(), dateDebut.getMonth() + 1, 0);

    const chambres = await Chambre.find().sort({ numero: 1 });

    const reservations = await Reservation.find({
      statutReservation: { $in: ['confirmee', 'en_attente_paiement', 'check_in_fait'] },
      dateArrivee: { $lte: dateFin },
      dateDepart: { $gte: dateDebut },
    }).populate('client', 'nom prenom');

    const verrous = await VerrouTemporaire.find({
      expireAt: { $gt: new Date() },
      dateArrivee: { $lte: dateFin },
      dateDepart: { $gte: dateDebut },
    });

    const data = chambres.map((chambre) => {
      const periodesOccupees = reservations
        .filter((r) => r.chambre.toString() === chambre._id.toString())
        .map((r) => ({
          reservationId: r._id,
          dateArrivee: r.dateArrivee,
          dateDepart: r.dateDepart,
          statutReservation: r.statutReservation,
          client: r.client ? `${r.client.prenom || ''} ${r.client.nom}`.trim() : 'N/A',
        }));

      const verrousActifs = verrous
        .filter((v) => v.chambre.toString() === chambre._id.toString())
        .map((v) => ({
          verrouId: v._id,
          dateArrivee: v.dateArrivee,
          dateDepart: v.dateDepart,
          expireAt: v.expireAt,
        }));

      return {
        chambre: {
          _id: chambre._id,
          numero: chambre.numero,
          typeLit: chambre.typeLit,
          type: chambre.type, // virtual
          statutActuel: chambre.statutActuel,
          statut: chambre.statut, // virtual
          prixNuitee: chambre.prixNuitee,
        },
        periodesOccupees,
        verrousActifs,
      };
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
