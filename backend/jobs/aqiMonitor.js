const aqiService = require('../services/aqiService');
const { CITIES } = require('../utils/constants');
const logger = require('../utils/logger');

async function startAqiMonitoring() {
    try {
        logger.info('🫁 Starting AQI monitoring cycle');
        const cities = Object.keys(CITIES);
        for (const city of cities) {
            const aqiData = await aqiService.getCurrentAqi(city);
            logger.info(`AQI for ${city}: ${aqiData.aqi}`);
        }
        logger.info('✅ AQI monitoring cycle complete');
    } catch (error) {
        logger.error('AQI monitoring job error:', error);
    }
}

module.exports = { startAqiMonitoring };
