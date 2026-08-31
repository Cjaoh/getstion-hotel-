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

router.route('/').get(getChambres).post(createChambre);
router.route('/:id').get(getChambre).put(updateChambre).delete(deleteChambre);
router.route('/:id/statut').patch(updateStatutChambre);

module.exports = router;
