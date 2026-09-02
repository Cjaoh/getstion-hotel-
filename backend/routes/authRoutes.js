const express = require('express');
const router = express.Router();
const { login, register, getProfil } = require('../controllers/authController');
const { protect, autorize } = require('../middleware/authMiddleware');

router.post('/login', login);

// Seul un admin déjà connecté peut créer un nouveau compte employé
router.post('/register', protect, autorize('admin'), register);

router.get('/me', protect, getProfil);

module.exports = router;