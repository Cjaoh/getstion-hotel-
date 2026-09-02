const express = require('express');
const router = express.Router();
const { creerVerrou, libererVerrou } = require('../controllers/verrouController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', creerVerrou);
router.delete('/:id', libererVerrou);

module.exports = router;