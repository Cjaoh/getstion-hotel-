const express = require('express');
const router = express.Router();
const {
  getPaiements,
  createPaiement,
  updatePaiement,
  deletePaiement,
} = require('../controllers/paiementController');

router.route('/').get(getPaiements).post(createPaiement);
router.route('/:id').patch(updatePaiement).delete(deletePaiement);

module.exports = router;
