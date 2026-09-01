const VerrouTemporaire = require('../models/VerrouTemporaire');
const { chambreEstDisponible } = require('./reservationController');

// @desc    Créer un verrou temporaire (panier 15 min)
// @route   POST /api/verrous
exports.creerVerrou = async (req, res) => {
  try {
    const { chambre, dateArrivee, dateDepart, sessionId, dureeMinutes } = req.body;

    const debut = new Date(dateArrivee);
    const fin = new Date(dateDepart);

    if (fin <= debut) {
      return res.status(400).json({
        success: false,
        message: "La date de départ doit être postérieure à la date d'arrivée",
      });
    }

    const disponible = await chambreEstDisponible(chambre, debut, fin);
    if (!disponible) {
      return res.status(409).json({
        success: false,
        message: 'Cette chambre n\'est pas disponible pour cette période',
      });
    }

    const duree = parseInt(dureeMinutes) || 15;
    const expireAt = new Date(Date.now() + duree * 60 * 1000);

    const verrou = await VerrouTemporaire.create({
      chambre,
      dateArrivee: debut,
      dateDepart: fin,
      sessionId: sessionId || req.headers['x-session-id'] || 'anonymous',
      expireAt,
    });

    res.status(201).json({ success: true, data: verrou });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Libérer un verrou temporaire (annulation panier)
// @route   DELETE /api/verrous/:id
exports.libererVerrou = async (req, res) => {
  try {
    const verrou = await VerrouTemporaire.findByIdAndDelete(req.params.id);
    if (!verrou) {
      return res.status(404).json({ success: false, message: 'Verrou non trouvé' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
