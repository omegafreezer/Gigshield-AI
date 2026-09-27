const monitoringService = require('../services/monitoringService');
const logger = require('../utils/logger');

async function startWeatherMonitoring() {
    try {
        logger.info('🌤️ Starting weather monitoring cycle');
        await monitoringService.checkAllTriggers();
        logger.info('✅ Weather monitoring cycle complete');
    } catch (error) {
        logger.error('Weather monitoring job error:', error);
    }
}

module.exports = { startWeatherMonitoring };
