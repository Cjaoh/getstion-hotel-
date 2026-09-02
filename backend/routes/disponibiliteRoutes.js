const express = require('express');
const router = express.Router();
const { getDisponibilite } = require('../controllers/disponibiliteController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getDisponibilite);

module.exports = router;