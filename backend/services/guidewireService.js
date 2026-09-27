const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// Guidewire simulation endpoints
router.post('/policies', (req, res) => {
    const gwPolicyId = 'GW-POL-' + uuidv4().slice(0, 8).toUpperCase();
    logger.info(`[Guidewire Sim] Policy created: ${gwPolicyId}`);
    res.json({ id: gwPolicyId, status: 'ACTIVE', policyNumber: req.body.policyNumber, createdAt: new Date().toISOString() });
});

router.get('/policies/:id', (req, res) => {
    res.json({ id: req.params.id, status: 'ACTIVE', message: 'Simulated Guidewire PolicyCenter response' });
});

router.post('/claims', (req, res) => {
    const gwClaimId = 'GW-CLM-' + uuidv4().slice(0, 8).toUpperCase();
    logger.info(`[Guidewire Sim] Claim created: ${gwClaimId}`);
    res.json({ id: gwClaimId, claimNumber: req.body.claimNumber, status: 'OPEN', adjudicationResult: 'AUTO_APPROVED', createdAt: new Date().toISOString() });
});

router.patch('/claims/:id', (req, res) => {
    logger.info(`[Guidewire Sim] Claim ${req.params.id} updated: ${req.body.status}`);
    res.json({ id: req.params.id, status: req.body.status, updatedAt: new Date().toISOString() });
});

router.post('/billing/payments', (req, res) => {
    const paymentId = 'GW-PAY-' + uuidv4().slice(0, 8).toUpperCase();
    logger.info(`[Guidewire Sim] Payment recorded: ${paymentId}`);
    res.json({ id: paymentId, amount: req.body.amount, status: 'PROCESSED', createdAt: new Date().toISOString() });
});

class GuidewireService {
    constructor() {
        this.baseUrl = process.env.GUIDEWIRE_BASE_URL;
    }

    async createPolicy(policyData) {
        try {
            const axios = require('axios');
            const response = await axios.post(`${this.baseUrl}/policies`, policyData);
            return response.data;
        } catch (error) {
            logger.error('Guidewire createPolicy error:', error.message);
            return { id: 'GW-POL-SIM-' + Date.now(), status: 'ACTIVE', simulated: true };
        }
    }

    async createClaim(claimData) {
        try {
            const axios = require('axios');
            const response = await axios.post(`${this.baseUrl}/claims`, claimData);
            return response.data;
        } catch (error) {
            logger.error('Guidewire createClaim error:', error.message);
            return { id: 'GW-CLM-SIM-' + Date.now(), status: 'OPEN', adjudicationResult: 'AUTO_APPROVED', simulated: true };
        }
    }

    async updateClaimStatus(claimId, status) {
        try {
            const axios = require('axios');
            const response = await axios.patch(`${this.baseUrl}/claims/${claimId}`, { status });
            return response.data;
        } catch (error) {
            return { id: claimId, status, simulated: true };
        }
    }
}

module.exports = { router, GuidewireService: new GuidewireService() };
