const { Router } = require('express');
const { getPlansHandler, registerHandler, contactHandler } = require('./onboarding.controller');

const router = Router();

// Sin autenticación — endpoints públicos de onboarding
router.get('/plans', getPlansHandler);
router.post('/register', registerHandler);
router.post('/contact', contactHandler);

module.exports = router;
