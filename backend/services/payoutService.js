const logger = require('../utils/logger');
const { query } = require('../config/database');

class PayoutService {
    constructor() {
        try {
            if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'your_razorpay_key_id') {
                const Razorpay = require('razorpay');
                this.razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
            } else {
                this.razorpay = null;
                logger.warn('Razorpay not configured — using simulation mode');
            }
        } catch (error) {
            this.razorpay = null;
        }
    }

    async createPaymentLink(userId, amount, description) {
        if (!this.razorpay) {
            return { id: 'sim_' + Date.now(), short_url: `https://gigshield.ai/pay/sim_${Date.now()}`, amount: amount * 100, simulated: true };
        }
        try {
            return await this.razorpay.paymentLink.create({
                amount: amount * 100,
                currency: 'INR',
                description,
                notify: { sms: false, email: false }
            });
        } catch (error) {
            logger.error('Razorpay payment link error:', error);
            return { id: 'sim_' + Date.now(), short_url: `https://gigshield.ai/pay/sim_${Date.now()}`, simulated: true };
        }
    }

    async processPayout(userId, claimId, amount) {
        const now = new Date();
        const dateStamp = now.toISOString().slice(0,10).replace(/-/g,'');
        const uniqueSuffix = Math.random().toString(36).substring(2,6).toUpperCase();
        const reference = `GS-UPI-${dateStamp}-${uniqueSuffix}`;
        try {
            await query(
                `INSERT INTO transactions (user_id, claim_id, type, amount, status, payment_method, payment_reference)
                 VALUES ($1,$2,'CLAIM_PAYOUT',$3,'COMPLETED','UPI',$4)`,
                [userId, claimId, amount, reference]
            );
            await query(
                `UPDATE claims SET status='PAID', payout_reference=$2, payout_timestamp=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=$1`,
                [claimId, reference]
            );
            await query(
                `UPDATE policies SET total_claims_paid=total_claims_paid+$2, updated_at=CURRENT_TIMESTAMP
                 WHERE id=(SELECT policy_id FROM claims WHERE id=$1)`,
                [claimId, amount]
            );
            logger.info(`Payout processed via Mock UPI Gateway: ${reference} for ₹${amount}`);
            return {
                success: true,
                reference,
                amount,
                gateway: 'GigShield Mock UPI Gateway',
                receiptUrl: `https://mock-gateway.gigshield.ai/receipt/${reference}`,
                settledAt: now.toISOString()
            };
        } catch (error) {
            logger.error('Payout error:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new PayoutService();
