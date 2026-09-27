const { query } = require('../config/database');
const logger = require('../utils/logger');

class AdminController {
    async getDashboardStats(req, res) {
        try {
            const stats = {};

            const usersResult = await query(`SELECT COUNT(*) FROM users WHERE onboarding_step='COMPLETED'`);
            stats.totalUsers = parseInt(usersResult.rows[0].count);

            const policiesResult = await query(`SELECT COUNT(*) FROM policies WHERE status='ACTIVE'`);
            stats.activePolicies = parseInt(policiesResult.rows[0].count);

            const claimsResult = await query('SELECT COUNT(*) FROM claims');
            stats.totalClaims = parseInt(claimsResult.rows[0].count);

            const paidClaimsResult = await query(`SELECT COUNT(*), COALESCE(SUM(payout_amount),0) as total FROM claims WHERE status='PAID'`);
            stats.paidClaims = parseInt(paidClaimsResult.rows[0].count);
            stats.totalPayouts = parseFloat(paidClaimsResult.rows[0].total);

            const premiumsResult = await query(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='PREMIUM_PAYMENT' AND status='COMPLETED'`);
            stats.totalPremiums = parseFloat(premiumsResult.rows[0].total);

            stats.lossRatio = stats.totalPremiums > 0
                ? ((stats.totalPayouts / stats.totalPremiums) * 100).toFixed(1) : 0;

            const claimsByType = await query(
                `SELECT trigger_type, COUNT(*) as count, COALESCE(SUM(payout_amount),0) as total
                 FROM claims WHERE status='PAID' GROUP BY trigger_type`
            );
            stats.claimsByType = claimsByType.rows;

            const usersByCity = await query(
                `SELECT city, COUNT(*) as count FROM users WHERE onboarding_step='COMPLETED' GROUP BY city ORDER BY count DESC`
            );
            stats.usersByCity = usersByCity.rows;

            const recentClaims = await query(
                `SELECT c.*, u.name, u.city FROM claims c JOIN users u ON u.id=c.user_id ORDER BY c.created_at DESC LIMIT 10`
            );
            stats.recentClaims = recentClaims.rows;

            const fraudResult = await query(`SELECT COUNT(*) FROM claims WHERE status='FRAUD_FLAGGED'`);
            stats.fraudFlagged = parseInt(fraudResult.rows[0].count);

            // Phase 3: Predictive Analytics for Next Week
            // Fetch per-city risk scores and worker counts
            const cityRiskQuery = await query(
                `SELECT city, AVG(risk_score) as avg_risk, COUNT(*) as workers
                 FROM users WHERE onboarding_step='COMPLETED' GROUP BY city ORDER BY avg_risk DESC`
            );
            const cityRiskData = cityRiskQuery.rows;

            const globalAvgRisk = cityRiskData.reduce((sum, r) => sum + parseFloat(r.avg_risk || 0), 0)
                / (cityRiskData.length || 1);

            // Forecasted claims = active policies * avg risk probability * weather volatility multiplier (1.35)
            const forecastedClaimsCount = Math.ceil(stats.activePolicies * globalAvgRisk * 1.35);
            const forecastedClaimAmount = forecastedClaimsCount * 280; // Avg payout ~₹280

            // Identify high-risk cities (risk > 0.45) and enrich with forecasted claims per city
            const highRiskCities = cityRiskData
                .filter(r => parseFloat(r.avg_risk) > 0.45)
                .map(r => ({
                    city: r.city,
                    riskScore: parseFloat(parseFloat(r.avg_risk).toFixed(3)),
                    workerCount: parseInt(r.workers),
                    forecastedClaims: Math.ceil(parseInt(r.workers) * parseFloat(r.avg_risk) * 1.35)
                }));

            stats.predictiveAnalytics = {
                nextWeekForecastedClaims: forecastedClaimsCount,
                nextWeekForecastedPayouts: forecastedClaimAmount,
                riskTrend: globalAvgRisk > 0.5 ? '🔴 High (Incoming Disruptions)' : globalAvgRisk > 0.35 ? '🟡 Moderate' : '🟢 Stable',
                highRiskCities,
                globalAvgRisk: parseFloat(globalAvgRisk.toFixed(3)),
                forecastGeneratedAt: new Date().toISOString()
            };

            res.json(stats);
        } catch (error) {
            logger.error('Dashboard stats error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getRiskZones(req, res) {
        try {
            const result = await query(
                `SELECT u.city, u.zone,
                    COUNT(u.id) as worker_count,
                    AVG(u.risk_score) as avg_risk,
                    COUNT(DISTINCT c.id) as total_claims,
                    COALESCE(SUM(c.payout_amount),0) as total_payouts
                 FROM users u LEFT JOIN claims c ON c.user_id=u.id AND c.status='PAID'
                 WHERE u.onboarding_step='COMPLETED'
                 GROUP BY u.city, u.zone ORDER BY avg_risk DESC`
            );
            res.json(result.rows);
        } catch (error) {
            logger.error('Risk zones error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getTriggerEvents(req, res) {
        try {
            const result = await query(
                `SELECT * FROM trigger_events WHERE is_triggered=true ORDER BY created_at DESC LIMIT 50`
            );
            res.json(result.rows);
        } catch (error) {
            logger.error('Trigger events error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getFinancialSummary(req, res) {
        try {
            const dailySummary = await query(
                `SELECT DATE(t.created_at) as date,
                    SUM(CASE WHEN t.type='PREMIUM_PAYMENT' THEN t.amount ELSE 0 END) as premiums,
                    SUM(CASE WHEN t.type='CLAIM_PAYOUT' THEN t.amount ELSE 0 END) as payouts
                 FROM transactions t WHERE t.status='COMPLETED' AND t.created_at > CURRENT_DATE - INTERVAL '30 days'
                 GROUP BY DATE(t.created_at) ORDER BY date`
            );
            res.json({ dailySummary: dailySummary.rows });
        } catch (error) {
            logger.error('Financial summary error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new AdminController();
