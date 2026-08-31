const express = require('express');
const router = express.Router();
const {
  getStatsMensuelles,
  getRepartitionStatutChambres,
  getEvolutionCA,
} = require('../controllers/statsController');

router.get('/mensuel', getStatsMensuelles);
router.get('/chambres-statut', getRepartitionStatutChambres);
router.get('/ca-evolution', getEvolutionCA);

module.exports = router;
