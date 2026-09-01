const Chambre = require('../models/Chambre');
const Reservation = require('../models/Reservation');
const Paiement = require('../models/Paiement');

// @desc    Taux d'occupation et CA du mois (par défaut le mois courant)
// @route   GET /api/stats/mensuel?mois=8&annee=2026
exports.getStatsMensuelles = async (req, res) => {
  try {
    const now = new Date();
    const mois = parseInt(req.query.mois) || now.getMonth() + 1; // 1-12
    const annee = parseInt(req.query.annee) || now.getFullYear();

    const debutMois = new Date(annee, mois - 1, 1);
    const finMois = new Date(annee, mois, 0, 23, 59, 59);
    const nbJoursMois = finMois.getDate();

    const totalChambres = await Chambre.countDocuments();

    // Réservations actives qui chevauchent le mois
    const reservations = await Reservation.find({
      $or: [
        { statutReservation: { $in: ['confirmee', 'check_in_fait', 'check_out_fait'] } },
        { statut: { $in: ['Confirmée', 'En cours', 'Terminée'] } },
      ],
      dateArrivee: { $lte: finMois },
      dateDepart: { $gte: debutMois },
    });

    // Calcul des nuits occupées dans le mois (bornées au mois demandé)
    let nuitsOccupees = 0;
    reservations.forEach((r) => {
      const debut = r.dateArrivee < debutMois ? debutMois : r.dateArrivee;
      const fin = r.dateDepart > finMois ? finMois : r.dateDepart;
      const nuits = Math.max(0, Math.ceil((fin - debut) / (1000 * 60 * 60 * 24)));
      nuitsOccupees += nuits;
    });

    const capaciteTotale = totalChambres * nbJoursMois;
    const tauxOccupation = capaciteTotale > 0 ? (nuitsOccupees / capaciteTotale) * 100 : 0;

    // Chiffre d'affaires: somme des paiements "Payé" dont la réservation touche le mois
    const reservationIds = reservations.map((r) => r._id);
    const paiements = await Paiement.find({
      reservation: { $in: reservationIds },
      statut: 'Payé',
    });
    const chiffreAffaires = paiements.reduce((sum, p) => sum + p.montant, 0);

    res.status(200).json({
      success: true,
      data: {
        mois,
        annee,
        totalChambres,
        tauxOccupation: Math.round(tauxOccupation * 100) / 100,
        chiffreAffaires,
        nombreReservations: reservations.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Répartition des chambres par statut (pour le dashboard)
// @route   GET /api/stats/chambres-statut
exports.getRepartitionStatutChambres = async (req, res) => {
  try {
    const repartition = await Chambre.aggregate([
      { $group: { _id: '$statutActuel', total: { $sum: 1 } } },
    ]);

    // Formatage convivial des noms de statuts
    const map = {
      disponible: 'Disponible',
      occupe: 'Occupée',
      en_nettoyage: 'En cours de nettoyage',
      maintenance: 'Hors service / Maintenance',
    };

    const formatted = repartition.map((item) => ({
      _id: map[item._id] || item._id,
      total: item.total,
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    CA par mois sur les N derniers mois (pour graphique d'évolution)
// @route   GET /api/stats/ca-evolution?mois=6
exports.getEvolutionCA = async (req, res) => {
  try {
    const nbMois = parseInt(req.query.mois) || 6;
    const resultats = [];
    const now = new Date();

    for (let i = nbMois - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const debutMois = new Date(date.getFullYear(), date.getMonth(), 1);
      const finMois = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const reservations = await Reservation.find({
        dateArrivee: { $lte: finMois },
        dateDepart: { $gte: debutMois },
      }).select('_id');

      const paiements = await Paiement.find({
        reservation: { $in: reservations.map((r) => r._id) },
        statut: 'Payé',
      });
      const total = paiements.reduce((sum, p) => sum + p.montant, 0);

      resultats.push({
        mois: date.getMonth() + 1,
        annee: date.getFullYear(),
        chiffreAffaires: total,
      });
    }

    res.status(200).json({ success: true, data: resultats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
