const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policyController');

router.get('/', policyController.getAllPolicies);
router.get('/:id', policyController.getPolicy);
router.get('/user/:userId', policyController.getUserPolicies);
router.post('/', policyController.createPolicy);
router.patch('/:id/status', policyController.updatePolicyStatus);

module.exports = router;
