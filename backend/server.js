require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');
const fs = require('fs');
const logger = require('./utils/logger');

// Ensure logs directory exists
if (!fs.existsSync('logs')) fs.mkdirSync('logs');

const whatsappRoutes = require('./routes/whatsapp');
const policyRoutes = require('./routes/policy');
const claimsRoutes = require('./routes/claims');
const adminRoutes = require('./routes/admin');

const { startWeatherMonitoring } = require('./jobs/weatherMonitor');
const { startAqiMonitoring } = require('./jobs/aqiMonitor');
const { startClaimProcessing } = require('./jobs/claimProcessor');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'gigshield-backend', timestamp: new Date().toISOString() });
});

app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/claims', claimsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/guidewire-sim', require('./services/guidewireService').router);

app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error', message: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

const MONITOR_INTERVAL = process.env.MONITORING_INTERVAL_MINUTES || 30;

cron.schedule(`*/${MONITOR_INTERVAL} * * * *`, () => {
    logger.info('Running weather monitoring job');
    startWeatherMonitoring();
});

cron.schedule('*/10 * * * *', () => {
    logger.info('Running claim processing job');
    startClaimProcessing();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info(`GigShield Backend running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info(`Monitoring interval: ${MONITOR_INTERVAL} minutes`);
});

module.exports = app;
