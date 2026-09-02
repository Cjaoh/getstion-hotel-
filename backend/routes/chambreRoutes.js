const express = require('express');
const router = express.Router();
const {
  getChambres,
  getChambre,
  createChambre,
  updateChambre,
  updateStatutChambre,
  deleteChambre,
} = require('../controllers/chambreController');
const { protect, autorize } = require('../middleware/authMiddleware');

router.use(protect);

// Lecture : admin ET receptionniste (l'accueil doit voir les chambres et leur disponibilité)
router.get('/', getChambres);
router.get('/:id', getChambre);

// Écriture (créer/modifier/changer le statut/supprimer une chambre) : admin uniquement.
// L'accueil ne gère pas le catalogue de chambres, seulement les réservations.
router.post('/', autorize('admin'), createChambre);
router.put('/:id', autorize('admin'), updateChambre);
router.patch('/:id/statut', autorize('admin'), updateStatutChambre);
router.delete('/:id', autorize('admin'), deleteChambre);

module.exports = router;