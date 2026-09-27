const axios = require('axios');
const logger = require('../utils/logger');
const { query } = require('../config/database');
const { CITIES } = require('../utils/constants');

class WeatherService {
    async getCurrentWeather(city) {
        try {
            const cityData = CITIES[city];
            if (!cityData) throw new Error(`Unknown city: ${city}`);

            const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
                params: { lat: cityData.lat, lon: cityData.lon, appid: process.env.OPENWEATHER_API_KEY, units: 'metric' },
                timeout: 5000
            });

            const data = response.data;
            const weather = {
                city,
                temperature: data.main.temp,
                humidity: data.main.humidity,
                rainfall_mm: data.rain ? (data.rain['1h'] || data.rain['3h'] || 0) : 0,
                wind_speed: data.wind.speed,
                weather_condition: data.weather[0].main,
                raw_data: data
            };

            await this.cacheWeatherData(weather);
            return weather;
        } catch (error) {
            logger.warn(`Weather API error for ${city}: ${error.message}. Using simulated data.`);
            return this.getSimulatedWeather(city);
        }
    }

    getSimulatedWeather(city) {
        const baseTempMap = { 'Mumbai': 30, 'Delhi': 38, 'Bangalore': 26, 'Hyderabad': 35, 'Chennai': 33 };
        const baseTemp = baseTempMap[city] || 32;
        return {
            city,
            temperature: baseTemp + (Math.random() * 6 - 3),
            humidity: 60 + Math.random() * 30,
            rainfall_mm: Math.random() > 0.85 ? Math.random() * 80 : 0,
            wind_speed: Math.random() * 20,
            weather_condition: 'Clouds',
            simulated: true
        };
    }

    async cacheWeatherData(weather) {
        try {
            await query(
                `INSERT INTO weather_cache (city, temperature, humidity, rainfall_mm, wind_speed, weather_condition, raw_data)
                 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                [weather.city, weather.temperature, weather.humidity, weather.rainfall_mm, weather.wind_speed, weather.weather_condition, JSON.stringify(weather.raw_data || {})]
            );
        } catch (error) {
            logger.error('Weather cache error:', error.message);
        }
    }

    async checkRainTrigger(city) {
        const weather = await this.getCurrentWeather(city);
        if (!weather) return null;
        const thresholdResult = await query(`SELECT * FROM trigger_thresholds WHERE peril_type='HEAVY_RAIN' AND is_active=true`);
        const threshold = thresholdResult.rows[0];
        if (weather.rainfall_mm >= threshold.threshold_value) {
            return { triggered: true, peril_type: 'HEAVY_RAIN', value: weather.rainfall_mm, threshold: threshold.threshold_value, payout: threshold.payout_amount, evidence: weather };
        }
        return { triggered: false };
    }

    async checkHeatTrigger(city) {
        const weather = await this.getCurrentWeather(city);
        if (!weather) return null;
        const thresholdResult = await query(`SELECT * FROM trigger_thresholds WHERE peril_type='EXTREME_HEAT' AND is_active=true`);
        const threshold = thresholdResult.rows[0];
        if (weather.temperature >= threshold.threshold_value) {
            return { triggered: true, peril_type: 'EXTREME_HEAT', value: weather.temperature, threshold: threshold.threshold_value, payout: threshold.payout_amount, evidence: weather };
        }
        return { triggered: false };
    }
}

module.exports = new WeatherService();
