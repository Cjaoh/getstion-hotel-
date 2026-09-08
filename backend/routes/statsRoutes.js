const express = require('express');
const router = express.Router();
const {
  getStatsMensuelles,
  getRepartitionStatutChambres,
  getEvolutionCA,
  getRepartitionStatutPaiement,
} = require('../controllers/statsController');
const { protect, autorize } = require('../middleware/authMiddleware');

router.use(protect, autorize('admin')); // données sensibles (revenus) réservées aux admins

router.get('/mensuel', getStatsMensuelles);
router.get('/chambres-statut', getRepartitionStatutChambres);
router.get('/ca-evolution', getEvolutionCA);
router.get('/paiements-statut', getRepartitionStatutPaiement);

module.exports = router;