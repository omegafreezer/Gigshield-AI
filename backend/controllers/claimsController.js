const { query } = require('../config/database');
const monitoringService = require('../services/monitoringService');
const logger = require('../utils/logger');

class ClaimsController {
    async getAllClaims(req, res) {
        try {
            const result = await query(
                `SELECT c.*, u.name, u.phone_number, u.city, u.zone, p.policy_number
                 FROM claims c JOIN users u ON u.id=c.user_id JOIN policies p ON p.id=c.policy_id
                 ORDER BY c.created_at DESC LIMIT $1 OFFSET $2`,
                [req.query.limit || 50, req.query.offset || 0]
            );
            const countResult = await query('SELECT COUNT(*) FROM claims');
            res.json({ claims: result.rows, total: parseInt(countResult.rows[0].count) });
        } catch (error) {
            logger.error('Get claims error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getClaim(req, res) {
        try {
            const result = await query(
                `SELECT c.*, u.name, u.phone_number, u.city, p.policy_number
                 FROM claims c JOIN users u ON u.id=c.user_id JOIN policies p ON p.id=c.policy_id WHERE c.id=$1`,
                [req.params.id]
            );
            if (result.rows.length === 0) return res.status(404).json({ error: 'Claim not found' });
            res.json(result.rows[0]);
        } catch (error) {
            logger.error('Get claim error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getUserClaims(req, res) {
        try {
            const result = await query(`SELECT * FROM claims WHERE user_id=$1 ORDER BY created_at DESC`, [req.params.userId]);
            res.json(result.rows);
        } catch (error) {
            logger.error('Get user claims error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async simulateTrigger(req, res) {
        try {
            const { city, triggerType, value } = req.body;
            logger.info(`Simulating trigger: ${triggerType} in ${city} with value ${value}`);

            const thresholdResult = await query(`SELECT * FROM trigger_thresholds WHERE peril_type=$1`, [triggerType]);
            if (thresholdResult.rows.length === 0) return res.status(400).json({ error: 'Invalid trigger type' });

            const threshold = thresholdResult.rows[0];
            const tValue = parseFloat(threshold.threshold_value);
            const simValue = value !== undefined ? parseFloat(value) : (tValue + 10);
            
            let isTriggered = false;
            if (['HEAVY_RAIN', 'EXTREME_HEAT', 'POOR_AQI', 'AI_INCOME_DROP'].includes(triggerType)) {
                isTriggered = simValue >= tValue;
            } else if (triggerType === 'TRAFFIC_DISRUPTION') {
                isTriggered = simValue <= tValue;
            }

            const triggerResult = {
                triggered: isTriggered,
                peril_type: triggerType,
                value: simValue,
                threshold: tValue,
                payout: threshold.payout_amount,
                evidence: { simulated: true, city, timestamp: new Date().toISOString(), value: simValue }
            };

            await monitoringService.processTrigger(city, triggerResult);
            res.json({ message: 'Trigger simulated successfully', trigger: triggerResult });
        } catch (error) {
            logger.error('Simulate trigger error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new ClaimsController();
