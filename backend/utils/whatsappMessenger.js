const twilio = require('twilio');
const logger = require('./logger');

let _twilioClient = null;

function getTwilioClient() {
    if (_twilioClient) return _twilioClient;
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token || sid.startsWith('your_') || token.startsWith('your_')) {
        logger.warn('Twilio credentials not configured — running in simulation mode');
        return null;
    }
    try {
        _twilioClient = twilio(sid, token);
        return _twilioClient;
    } catch (err) {
        logger.error('Failed to initialize Twilio client:', err.message);
        return null;
    }
}

const sendWhatsAppMessage = async (to, body) => {
    const client = getTwilioClient();
    const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    if (!client) {
        // No valid Twilio client — log message and return success for dev/demo
        logger.info(`[SIMULATION] WhatsApp to ${toNumber}:\n${body}`);
        return { success: true, messageSid: 'sim-' + Date.now(), simulated: true };
    }

    try {
        const message = await client.messages.create({
            body: body,
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            to: toNumber
        });
        logger.info(`WhatsApp message sent: ${message.sid} to ${to}`);
        return { success: true, messageSid: message.sid };
    } catch (error) {
        logger.error('WhatsApp send error:', { to, error: error.message });
        // Graceful fallback — log and continue, never crash the webhook
        logger.info(`[FALLBACK] Message to ${toNumber}:\n${body}`);
        return { success: true, messageSid: 'fallback-' + Date.now(), fallback: true };
    }
};

module.exports = { sendWhatsAppMessage };
