const Chambre = require('../models/Chambre');

// @desc    Récupérer toutes les chambres
// @route   GET /api/chambres
exports.getChambres = async (req, res) => {
  try {
    const filtre = {};
    if (req.query.statut) filtre.statut = req.query.statut;
    if (req.query.type) filtre.type = req.query.type;

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
    const chambre = await Chambre.findById(req.params.id);
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
    const chambre = await Chambre.create(req.body);
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
    const chambre = await Chambre.findByIdAndUpdate(req.params.id, req.body, {
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
    const { statut } = req.body;
    const statutsValides = ['Disponible', 'Occupée', 'En cours de nettoyage', 'Hors service'];
    if (!statutsValides.includes(statut)) {
      return res.status(400).json({ success: false, message: 'Statut invalide' });
    }
    const chambre = await Chambre.findByIdAndUpdate(
      req.params.id,
      { statut },
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
