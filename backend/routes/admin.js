const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/dashboard', adminController.getDashboardStats);
router.get('/risk-zones', adminController.getRiskZones);
router.get('/trigger-events', adminController.getTriggerEvents);
router.get('/financial-summary', adminController.getFinancialSummary);

module.exports = router;
