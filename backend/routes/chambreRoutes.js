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

router.use(protect); // toutes les routes chambres nécessitent d'être connecté

router.route('/').get(getChambres).post(createChambre);
router.route('/:id').get(getChambre).put(updateChambre).delete(autorize('admin'), deleteChambre);
router.route('/:id/statut').patch(updateStatutChambre);

module.exports = router;