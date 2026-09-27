const axios = require('axios');
const logger = require('../utils/logger');
const { query } = require('../config/database');
const { CITIES } = require('../utils/constants');

class AqiService {
    async getCurrentAqi(city) {
        try {
            const cityData = CITIES[city];
            if (!cityData) throw new Error(`Unknown city: ${city}`);

            const response = await axios.get('https://api.openweathermap.org/data/2.5/air_pollution', {
                params: { lat: cityData.lat, lon: cityData.lon, appid: process.env.OPENWEATHER_API_KEY },
                timeout: 5000
            });

            const data = response.data;
            const aqiMapping = { 1: 50, 2: 100, 3: 150, 4: 250, 5: 400 };
            const aqi = aqiMapping[data.list[0].main.aqi] || 100;
            return { city, aqi, raw_data: data };
        } catch (error) {
            logger.warn(`AQI API error for ${city}: ${error.message}. Using simulated data.`);
            return { city, aqi: this.getSimulatedAqi(city), simulated: true };
        }
    }

    getSimulatedAqi(city) {
        const baseAqi = { 'Delhi': 250, 'Mumbai': 120, 'Bangalore': 80, 'Hyderabad': 100, 'Chennai': 90 };
        const base = baseAqi[city] || 100;
        return Math.round(base + (Math.random() - 0.5) * 80);
    }

    async checkAqiTrigger(city) {
        const aqiData = await this.getCurrentAqi(city);
        if (!aqiData) return null;
        const thresholdResult = await query(`SELECT * FROM trigger_thresholds WHERE peril_type='POOR_AQI' AND is_active=true`);
        const threshold = thresholdResult.rows[0];
        if (aqiData.aqi >= threshold.threshold_value) {
            return { triggered: true, peril_type: 'POOR_AQI', value: aqiData.aqi, threshold: threshold.threshold_value, payout: threshold.payout_amount, evidence: aqiData };
        }
        return { triggered: false };
    }
}

module.exports = new AqiService();
