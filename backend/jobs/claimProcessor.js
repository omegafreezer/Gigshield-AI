const { query } = require('../config/database');
const payoutService = require('../services/payoutService');
const { sendWhatsAppMessage } = require('../utils/whatsappMessenger');
const { WHATSAPP_MESSAGES } = require('../utils/constants');
const logger = require('../utils/logger');

async function startClaimProcessing() {
    try {
        const pendingClaims = await query(
            `SELECT c.*, u.phone_number FROM claims c JOIN users u ON u.id=c.user_id
             WHERE c.status='APPROVED' AND c.payout_reference IS NULL ORDER BY c.created_at ASC`
        );

        for (const claim of pendingClaims.rows) {
            const result = await payoutService.processPayout(claim.user_id, claim.id, claim.payout_amount);
            if (result.success) {
                await sendWhatsAppMessage(claim.phone_number, WHATSAPP_MESSAGES.PAYOUT_CONFIRMATION(claim.payout_amount, result.reference));
            }
        }

        if (pendingClaims.rows.length > 0) {
            logger.info(`Processed ${pendingClaims.rows.length} pending claims`);
        }
    } catch (error) {
        logger.error('Claim processor error:', error);
    }
}

module.exports = { startClaimProcessing };
