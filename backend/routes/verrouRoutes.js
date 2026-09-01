const express = require('express');
const router = express.Router();
const { creerVerrou, libererVerrou } = require('../controllers/verrouController');

router.post('/', creerVerrou);
router.delete('/:id', libererVerrou);

module.exports = router;
