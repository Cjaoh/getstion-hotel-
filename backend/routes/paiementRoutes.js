const express = require('express');
const router = express.Router();
const {
  getPaiements,
  createPaiement,
  updatePaiement,
  deletePaiement,
} = require('../controllers/paiementController');
const { protect, autorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/').get(getPaiements).post(createPaiement);
router.route('/:id').patch(updatePaiement).delete(autorize('admin'), deletePaiement);

module.exports = router;