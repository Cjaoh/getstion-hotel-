const express = require('express');
const router = express.Router();
const { getDisponibilite } = require('../controllers/disponibiliteController');

router.get('/', getDisponibilite);

module.exports = router;
