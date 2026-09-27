const axios = require('axios');
const logger = require('../utils/logger');

class RiskEngine {
    async assessRisk(userData) {
        try {
            const mlResult = await this.getMLRiskScore(userData);
            return this.calculatePremium(mlResult.risk_score, userData.average_daily_income);
        } catch (error) {
            logger.warn('ML service unavailable, using fallback:', error.message);
            const riskScore = this.calculateRuleBasedRisk(userData);
            return this.calculatePremium(riskScore, userData.average_daily_income);
        }
    }

    async getMLRiskScore(userData) {
        const response = await axios.post(
            `${process.env.ML_SERVICE_URL}/predict/risk`,
            {
                city: userData.city,
                zone: userData.zone,
                delivery_type: userData.delivery_type,
                working_hours_start: parseInt((userData.working_hours.start || '09:00').split(':')[0]),
                working_hours_end: parseInt((userData.working_hours.end || '21:00').split(':')[0]),
                average_daily_income: userData.average_daily_income
            },
            { timeout: 5000 }
        );
        return response.data;
    }

    calculateRuleBasedRisk(userData) {
        let riskScore = 0.5;
        const cityRisk = { 'Mumbai': 0.15, 'Delhi': 0.18, 'Bangalore': 0.08, 'Hyderabad': 0.10, 'Chennai': 0.12 };
        riskScore += cityRisk[userData.city] || 0.10;
        const deliveryRisk = { 'food_delivery': 0.10, 'grocery_delivery': 0.08, 'parcel_delivery': 0.05, 'ride_hailing': 0.12 };
        riskScore += deliveryRisk[userData.delivery_type] || 0.08;
        const startHour = parseInt((userData.working_hours.start || '09:00').split(':')[0]);
        const endHour = parseInt((userData.working_hours.end || '21:00').split(':')[0]);
        const totalHours = endHour > startHour ? endHour - startHour : (24 - startHour + endHour);
        if (totalHours > 10) riskScore += 0.08;
        if (startHour < 8 || endHour > 22) riskScore += 0.05;
        if (startHour <= 14 && endHour >= 12) riskScore += 0.05;
        return Math.min(Math.max(riskScore, 0.1), 0.95);
    }

    calculatePremium(riskScore, dailyIncome) {
        const baseRate = 20;
        const riskMultiplier = 1 + (riskScore * 1.5);
        const incomeFactor = Math.max(dailyIncome / 1000, 0.5);
        const premiumWeekly = Math.round(baseRate * riskMultiplier * incomeFactor);
        const coverageDaily = Math.round(dailyIncome * 0.45);
        const coverageWeeklyMax = coverageDaily * 5;
        return {
            risk_score: parseFloat(riskScore.toFixed(4)),
            premium_weekly: Math.max(premiumWeekly, 25),
            coverage_daily: coverageDaily,
            coverage_weekly_max: coverageWeeklyMax,
            risk_level: riskScore > 0.7 ? 'HIGH' : riskScore > 0.5 ? 'MEDIUM' : 'LOW'
        };
    }

    getDefaultRisk(dailyIncome) {
        return this.calculatePremium(0.55, dailyIncome);
    }
}

module.exports = new RiskEngine();
