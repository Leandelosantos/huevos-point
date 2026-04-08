const { Router } = require('express');
const authController = require('./auth.controller');
const authMiddleware = require('../../middlewares/authMiddleware');
const { validateLogin } = require('../../middlewares/validationMiddleware');

const router = Router();

router.post('/login', validateLogin, authController.login);
router.post('/logout', authMiddleware, authController.logout);
router.post('/auto-login', authController.autoLogin);

module.exports = router;
