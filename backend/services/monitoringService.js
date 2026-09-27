const { query } = require('../config/database');
const weatherService = require('./weatherService');
const aqiService = require('./aqiService');
const { GuidewireService } = require('./guidewireService');
const payoutService = require('./payoutService');
const { sendWhatsAppMessage } = require('../utils/whatsappMessenger');
const { WHATSAPP_MESSAGES, CITIES } = require('../utils/constants');
const logger = require('../utils/logger');
const axios = require('axios');

class MonitoringService {
    async checkAllTriggers() {
        const cities = Object.keys(CITIES);
        for (const city of cities) {
            try {
                const rainResult = await weatherService.checkRainTrigger(city);
                if (rainResult && rainResult.triggered) await this.processTrigger(city, rainResult);

                const heatResult = await weatherService.checkHeatTrigger(city);
                if (heatResult && heatResult.triggered) await this.processTrigger(city, heatResult);

                const aqiResult = await aqiService.checkAqiTrigger(city);
                if (aqiResult && aqiResult.triggered) await this.processTrigger(city, aqiResult);

                await this.checkAIIncomeDrop(city);
            } catch (error) {
                logger.error(`Monitoring error for ${city}:`, error.message);
            }
        }
    }

    async processTrigger(city, triggerResult) {
        logger.info(`🚨 Trigger in ${city}: ${triggerResult.peril_type} = ${triggerResult.value}`);

        await query(
            `INSERT INTO trigger_events (city, event_type, event_value, threshold, is_triggered, data_source, raw_data, event_start)
             VALUES ($1,$2,$3,$4,true,'auto_monitoring',$5,CURRENT_TIMESTAMP)`,
            [city, triggerResult.peril_type, triggerResult.value, triggerResult.threshold, JSON.stringify(triggerResult.evidence)]
        );

        // Prevent duplicate claims for same trigger today
        const existingClaim = await query(
            `SELECT id FROM claims WHERE trigger_type=$1 AND created_at>CURRENT_DATE
             AND user_id IN (SELECT id FROM users WHERE city=$2) LIMIT 1`,
            [triggerResult.peril_type, city]
        );
        if (existingClaim.rows.length > 0 && !triggerResult.evidence?.simulated) {
            logger.info(`Claim already filed for ${triggerResult.peril_type} in ${city} today`);
            return;
        }

        const affectedUsers = await query(
            `SELECT u.*, p.id as policy_id, p.policy_number, p.coverage_daily, p.coverage_weekly_max, p.total_claims_paid
             FROM users u JOIN policies p ON p.user_id=u.id
             WHERE u.city=$1 AND p.status='ACTIVE' AND u.is_active=true`,
            [city]
        );

        logger.info(`Found ${affectedUsers.rows.length} affected users in ${city}`);
        for (const user of affectedUsers.rows) {
            await this.createAutoClaim(user, triggerResult);
        }
    }

    async createAutoClaim(user, triggerResult) {
        try {
            // Check weekly claim limit
            const weeklyClaimsResult = await query(
                `SELECT COUNT(*) as count FROM claims WHERE user_id=$1
                 AND created_at>CURRENT_DATE-INTERVAL '7 days' AND status IN ('APPROVED','PAID')`,
                [user.id]
            );
            const maxWeeklyClaims = parseInt(process.env.MAX_WEEKLY_CLAIMS) || 3;
            if (parseInt(weeklyClaimsResult.rows[0].count) >= maxWeeklyClaims && !triggerResult.evidence?.simulated) {
                logger.info(`User ${user.id} reached weekly claim limit`);
                return;
            }

            // Check weekly coverage cap
            const weeklyPayoutsResult = await query(
                `SELECT COALESCE(SUM(payout_amount),0) as total FROM claims WHERE user_id=$1
                 AND created_at>CURRENT_DATE-INTERVAL '7 days' AND status IN ('APPROVED','PAID')`,
                [user.id]
            );
            const weeklyTotal = parseFloat(weeklyPayoutsResult.rows[0].total);
            if (weeklyTotal >= user.coverage_weekly_max && !triggerResult.evidence?.simulated) {
                logger.info(`User ${user.id} reached weekly coverage cap`);
                return;
            }

            const remainingCoverage = triggerResult.evidence?.simulated ? user.coverage_daily : (user.coverage_weekly_max - weeklyTotal);
            const payoutAmount = Math.min(triggerResult.payout, remainingCoverage, user.coverage_daily);

            // Fraud check
            let fraudScore = 0.1;
            try {
                const fraudResult = await axios.post(
                    `${process.env.ML_SERVICE_URL}/predict/fraud`,
                    {
                        user_id: user.id,
                        city: user.city,
                        zone: user.zone,
                        trigger_type: triggerResult.peril_type,
                        claim_amount: payoutAmount,
                        weekly_claim_count: parseInt(weeklyClaimsResult.rows[0].count)
                    },
                    { timeout: 3000 }
                );
                fraudScore = fraudResult.data.fraud_score;
            } catch (e) {
                logger.debug('ML fraud check skipped:', e.message);
            }

            // If the simulation did not meet the weather threshold, flag it as a fraudulent attempt!
            if (!triggerResult.triggered && triggerResult.evidence?.simulated) {
                fraudScore = 0.95; // Force high fraud score because weather doesn't justify claim
                logger.info(`Claim forced to FRAUD! Weather condition not met (Value: ${triggerResult.value} vs Threshold: ${triggerResult.threshold})`);
            }

            const fraudThreshold = parseFloat(process.env.FRAUD_SCORE_THRESHOLD) || 0.7;
            const claimStatus = fraudScore >= fraudThreshold ? 'FRAUD_FLAGGED' : 'APPROVED';
            const claimNumber = 'GS-CLM-' + Date.now().toString().slice(-8);

            const claimResult = await query(
                `INSERT INTO claims (policy_id, user_id, claim_number, trigger_type, trigger_value, trigger_threshold,
                 trigger_evidence, predicted_income_loss, payout_amount, status, fraud_score)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
                [user.policy_id, user.id, claimNumber, triggerResult.peril_type, triggerResult.value,
                 triggerResult.threshold, JSON.stringify(triggerResult.evidence), payoutAmount, payoutAmount, claimStatus, fraudScore]
            );
            const claim = claimResult.rows[0];

            // Log to Guidewire
            await GuidewireService.createClaim({
                claimNumber, policyNumber: user.policy_number,
                triggerType: triggerResult.peril_type,
                triggerDate: new Date().toISOString(),
                amount: payoutAmount, evidence: triggerResult.evidence
            });

            if (claimStatus === 'APPROVED') {
                const payoutResult = await payoutService.processPayout(user.id, claim.id, payoutAmount);
                if (payoutResult.success) {
                    await sendWhatsAppMessage(user.phone_number, WHATSAPP_MESSAGES.CLAIM_NOTIFICATION({
                        trigger_type: triggerResult.peril_type,
                        trigger_value: triggerResult.value,
                        trigger_threshold: triggerResult.threshold,
                        payout_amount: payoutAmount,
                        claim_number: claimNumber
                    }));
                    setTimeout(async () => {
                        await sendWhatsAppMessage(user.phone_number, WHATSAPP_MESSAGES.PAYOUT_CONFIRMATION(payoutAmount, payoutResult.reference));
                    }, 3000);
                }
            } else {
                logger.warn(`Claim ${claimNumber} flagged for fraud (score: ${fraudScore})`);
            }
        } catch (error) {
            logger.error(`Auto-claim error for user ${user.id}:`, error);
        }
    }

    async checkAIIncomeDrop(city) {
        try {
            const response = await axios.post(
                `${process.env.ML_SERVICE_URL}/predict/income-anomaly`,
                { city },
                { timeout: 5000 }
            );
            if (response.data.anomaly_detected) {
                logger.info(`AI income drop detected in ${city}: ${response.data.drop_percentage}%`);
                await this.processTrigger(city, {
                    peril_type: 'AI_INCOME_DROP',
                    value: response.data.drop_percentage,
                    threshold: 40,
                    payout: response.data.suggested_payout || 200,
                    evidence: response.data
                });
            }
        } catch (error) {
            logger.debug(`AI income check skipped for ${city}: ${error.message}`);
        }
    }
}

module.exports = new MonitoringService();
