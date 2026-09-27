const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
    logger.info('Database connected');
});

pool.on('error', (err) => {
    logger.error('Database error:', err);
    process.exit(-1);
});

const query = async (text, params) => {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        logger.debug(`Query executed in ${duration}ms`);
        return result;
    } catch (error) {
        logger.error('Query error:', { text: text.substring(0, 80), error: error.message });
        throw error;
    }
};

module.exports = { pool, query };
