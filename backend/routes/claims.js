const express = require('express');
const router = express.Router();
const claimsController = require('../controllers/claimsController');

router.get('/', claimsController.getAllClaims);
router.get('/:id', claimsController.getClaim);
router.get('/user/:userId', claimsController.getUserClaims);
router.post('/simulate-trigger', claimsController.simulateTrigger);

module.exports = router;
