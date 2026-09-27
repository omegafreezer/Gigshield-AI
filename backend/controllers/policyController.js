const { query } = require('../config/database');
const logger = require('../utils/logger');

class PolicyController {
    async getAllPolicies(req, res) {
        try {
            const result = await query(
                `SELECT p.*, u.name, u.phone_number, u.city, u.zone FROM policies p
                 JOIN users u ON u.id=p.user_id ORDER BY p.created_at DESC LIMIT $1 OFFSET $2`,
                [req.query.limit || 50, req.query.offset || 0]
            );
            const countResult = await query('SELECT COUNT(*) FROM policies');
            res.json({ policies: result.rows, total: parseInt(countResult.rows[0].count) });
        } catch (error) {
            logger.error('Get policies error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getPolicy(req, res) {
        try {
            const result = await query(
                `SELECT p.*, u.name, u.phone_number, u.city, u.zone,
                    (SELECT COUNT(*) FROM claims c WHERE c.policy_id=p.id) as claim_count
                 FROM policies p JOIN users u ON u.id=p.user_id WHERE p.id=$1`,
                [req.params.id]
            );
            if (result.rows.length === 0) return res.status(404).json({ error: 'Policy not found' });
            res.json(result.rows[0]);
        } catch (error) {
            logger.error('Get policy error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getUserPolicies(req, res) {
        try {
            const result = await query(`SELECT * FROM policies WHERE user_id=$1 ORDER BY created_at DESC`, [req.params.userId]);
            res.json(result.rows);
        } catch (error) {
            logger.error('Get user policies error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async createPolicy(req, res) {
        try {
            const { userId, premiumWeekly, coverageDaily, coverageWeeklyMax, riskScore } = req.body;
            const policyNumber = 'GS-' + Date.now().toString().slice(-6);
            const result = await query(
                `INSERT INTO policies (user_id,policy_number,status,premium_weekly,coverage_daily,coverage_weekly_max,risk_score_at_creation,start_date,end_date)
                 VALUES ($1,$2,'ACTIVE',$3,$4,$5,$6,CURRENT_DATE,CURRENT_DATE+INTERVAL '30 days') RETURNING *`,
                [userId, policyNumber, premiumWeekly, coverageDaily, coverageWeeklyMax, riskScore]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            logger.error('Create policy error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async updatePolicyStatus(req, res) {
        try {
            const result = await query(
                `UPDATE policies SET status=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`,
                [req.params.id, req.body.status]
            );
            res.json(result.rows[0]);
        } catch (error) {
            logger.error('Update policy error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new PolicyController();
