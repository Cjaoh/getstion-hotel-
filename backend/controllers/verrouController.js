const mongoose = require('mongoose');
const VerrouTemporaire = require('../models/VerrouTemporaire');
const { chambreEstDisponible } = require('./reservationController');

// @desc    Créer un verrou temporaire (panier 15 min)
// @route   POST /api/verrous
exports.creerVerrou = async (req, res) => {
  const { chambre, dateArrivee, dateDepart, sessionId, dureeMinutes } = req.body;
  const debut = new Date(dateArrivee);
  const fin = new Date(dateDepart);

  if (fin <= debut) {
    return res.status(400).json({
      success: false,
      message: "La date de départ doit être postérieure à la date d'arrivée",
    });
  }

  const session = await mongoose.startSession();
  let verrouCree;
  let conflitDetecte = false;

  try {
    await session.withTransaction(async () => {
      const disponible = await chambreEstDisponible(chambre, debut, fin, null, null, session);
      if (!disponible) {
        conflitDetecte = true;
        throw new Error('ABORT_CONTROLE');
      }

      const duree = Math.min(Math.max(parseInt(dureeMinutes) || 15, 1), 15); // jamais > 15 min, jamais < 1 min
      const expireAt = new Date(Date.now() + duree * 60 * 1000);

      const resultats = await VerrouTemporaire.create(
        [
          {
            chambre,
            dateArrivee: debut,
            dateDepart: fin,
            sessionId: sessionId || req.headers['x-session-id'] || 'anonymous',
            expireAt,
          },
        ],
        { session }
      );
      verrouCree = resultats[0];
    });
  } catch (error) {
    if (error.message !== 'ABORT_CONTROLE') {
      await session.endSession();
      return res.status(400).json({ success: false, message: error.message });
    }
  }
  await session.endSession();

  if (conflitDetecte) {
    return res.status(409).json({
      success: false,
      message: "Cette chambre n'est pas disponible pour cette période",
    });
  }

  res.status(201).json({ success: true, data: verrouCree });
};

// @desc    Libérer un verrou temporaire (annulation panier)
// @route   DELETE /api/verrous/:id
exports.libererVerrou = async (req, res) => {
  try {
    const verrou = await VerrouTemporaire.findById(req.params.id);
    if (!verrou) {
      return res.status(404).json({ success: false, message: 'Verrou non trouvé' });
    }

    // NOUVEAU : le demandeur doit prouver qu'il est bien celui qui a posé ce verrou,
    // en fournissant le même sessionId que celui enregistré à la création.
    // Sans ce contrôle, n'importe qui connaissant l'_id du verrou pourrait libérer
    // la chambre d'un autre client en cours de réservation.
    const sessionIdFourni = req.body.sessionId || req.headers['x-session-id'];
    if (!sessionIdFourni || sessionIdFourni !== verrou.sessionId) {
      return res.status(403).json({
        success: false,
        message: "Non autorisé — ce verrou n'appartient pas à cette session",
      });
    }

    await VerrouTemporaire.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};