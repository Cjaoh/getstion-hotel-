const Chambre = require('../models/Chambre');

// Helper pour calculer la capacité maximale selon le type de lit si non fournie
function calculerCapaciteMax(typeLit) {
  switch (typeLit) {
    case 'Simple':
      return 1;
    case 'Double':
    case 'Twin':
    case 'Queen':
    case 'King':
      return 2;
    case 'Triple':
      return 3;
    case 'Quadruple':
      return 4;
    default:
      return 2;
  }
}

// @desc    Récupérer toutes les chambres
// @route   GET /api/chambres
exports.getChambres = async (req, res) => {
  try {
    const filtre = {};
    if (req.query.statutActuel) filtre.statutActuel = req.query.statutActuel;
    else if (req.query.statut) {
      const mapReverse = {
        Disponible: 'disponible',
        Occupée: 'occupe',
        'En cours de nettoyage': 'en_nettoyage',
        'Hors service': 'maintenance',
      };
      filtre.statutActuel = mapReverse[req.query.statut] || req.query.statut;
    }

    if (req.query.typeLit) filtre.typeLit = req.query.typeLit;
    else if (req.query.type) filtre.typeLit = req.query.type;

    if (req.query.gamme) filtre.gamme = req.query.gamme;

    const chambres = await Chambre.find(filtre).sort({ numero: 1 });
    res.status(200).json({ success: true, count: chambres.length, data: chambres });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Récupérer une chambre par ID
// @route   GET /api/chambres/:id
exports.getChambre = async (req, res) => {
  try {
    const chambre = await Chambre.findById(req.params.id).populate('chambreLiee');
    if (!chambre) {
      return res.status(404).json({ success: false, message: 'Chambre non trouvée' });
    }
    res.status(200).json({ success: true, data: chambre });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Créer une chambre
// @route   POST /api/chambres
exports.createChambre = async (req, res) => {
  try {
    const payload = { ...req.body };

    // Support des champs legacy 'type' et 'statut'
    if (payload.type && !payload.typeLit) {
      payload.typeLit = payload.type;
    }
    if (payload.statut && !payload.statutActuel) {
      const mapReverse = {
        Disponible: 'disponible',
        Occupée: 'occupe',
        'En cours de nettoyage': 'en_nettoyage',
        'Hors service': 'maintenance',
      };
      payload.statutActuel = mapReverse[payload.statut] || payload.statut;
    }

    // Fixer la capacité max selon le type de lit si non spécifiée
    if (!payload.capaciteMax && payload.typeLit) {
      payload.capaciteMax = calculerCapaciteMax(payload.typeLit);
    }

    const chambre = await Chambre.create(payload);
    res.status(201).json({ success: true, data: chambre });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Ce numéro de chambre existe déjà' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Modifier une chambre
// @route   PUT /api/chambres/:id
exports.updateChambre = async (req, res) => {
  try {
    const payload = { ...req.body };

    if (payload.type && !payload.typeLit) {
      payload.typeLit = payload.type;
    }
    if (payload.statut && !payload.statutActuel) {
      const mapReverse = {
        Disponible: 'disponible',
        Occupée: 'occupe',
        'En cours de nettoyage': 'en_nettoyage',
        'Hors service': 'maintenance',
      };
      payload.statutActuel = mapReverse[payload.statut] || payload.statut;
    }

    if (!payload.capaciteMax && payload.typeLit) {
      payload.capaciteMax = calculerCapaciteMax(payload.typeLit);
    }

    const chambre = await Chambre.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    if (!chambre) {
      return res.status(404).json({ success: false, message: 'Chambre non trouvée' });
    }
    res.status(200).json({ success: true, data: chambre });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Changer uniquement le statut d'une chambre
// @route   PATCH /api/chambres/:id/statut
exports.updateStatutChambre = async (req, res) => {
  try {
    const { statut, statutActuel } = req.body;
    let targetStatut = statutActuel;

    if (!targetStatut && statut) {
      const mapReverse = {
        Disponible: 'disponible',
        Occupée: 'occupe',
        'En cours de nettoyage': 'en_nettoyage',
        'Hors service': 'maintenance',
      };
      targetStatut = mapReverse[statut] || statut;
    }

    const statutsValides = ['disponible', 'occupe', 'en_nettoyage', 'maintenance'];
    if (!statutsValides.includes(targetStatut)) {
      return res.status(400).json({ success: false, message: 'Statut invalide' });
    }

    const chambre = await Chambre.findByIdAndUpdate(
      req.params.id,
      { statutActuel: targetStatut },
      { new: true, runValidators: true }
    );
    if (!chambre) {
      return res.status(404).json({ success: false, message: 'Chambre non trouvée' });
    }
    res.status(200).json({ success: true, data: chambre });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Ajouter une période hors service (maintenance/travaux) pour une chambre
// @route   POST /api/chambres/:id/hors-service
exports.ajouterDateHorsService = async (req, res) => {
  try {
    const { dateDebut, dateFin, raison } = req.body;
    if (!dateDebut || !dateFin || !raison) {
      return res.status(400).json({ success: false, message: 'dateDebut, dateFin et raison sont requis' });
    }

    const chambre = await Chambre.findById(req.params.id);
    if (!chambre) {
      return res.status(404).json({ success: false, message: 'Chambre non trouvée' });
    }

    chambre.datesHorsService.push({
      dateDebut: new Date(dateDebut),
      dateFin: new Date(dateFin),
      raison,
    });
    await chambre.save();

    res.status(200).json({ success: true, data: chambre });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Supprimer une chambre
// @route   DELETE /api/chambres/:id
exports.deleteChambre = async (req, res) => {
  try {
    const chambre = await Chambre.findByIdAndDelete(req.params.id);
    if (!chambre) {
      return res.status(404).json({ success: false, message: 'Chambre non trouvée' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
