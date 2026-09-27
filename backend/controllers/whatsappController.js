const { query } = require('../config/database');
const { sendWhatsAppMessage } = require('../utils/whatsappMessenger');
const { CITIES, DELIVERY_TYPES, ONBOARDING_STEPS, WHATSAPP_MESSAGES } = require('../utils/constants');
const riskEngine = require('../services/riskEngine');
const payoutService = require('../services/payoutService');
const logger = require('../utils/logger');
const moment = require('moment');

class WhatsAppController {

    async handleIncoming(req, res) {
        try {
            const from = req.body.From;
            const body = (req.body.Body || '').trim();
            const phoneNumber = from.replace('whatsapp:', '');

            logger.info(`Incoming message from ${phoneNumber}: ${body}`);

            let userResult = await query('SELECT * FROM users WHERE phone_number = $1', [phoneNumber]);
            let user = userResult.rows[0];

            if (!user) {
                const startCommands = ['hi', 'hello', 'start', 'hey', 'begin'];
                if (startCommands.includes(body.toLowerCase())) {
                    user = await createNewUser(phoneNumber);
                    await handleOnboarding(user, body, from);
                } else {
                    await sendWhatsAppMessage(from, WHATSAPP_MESSAGES.NOT_REGISTERED);
                }
            } else if (user.onboarding_step !== ONBOARDING_STEPS.COMPLETED) {
                await handleOnboarding(user, body, from);
            } else {
                await handleCommand(user, body, from);
            }

            res.status(200).send('OK');
        } catch (error) {
            logger.error('WhatsApp webhook error:', error);
            res.status(200).send('OK');
        }
    }

    async handleStatus(req, res) {
        const { MessageSid, MessageStatus } = req.body;
        logger.info(`Message ${MessageSid} status: ${MessageStatus}`);
        res.status(200).send('OK');
    }

    async sendMessage(req, res) {
        try {
            const { to, message } = req.body;
            const result = await sendWhatsAppMessage(to, message);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

async function createNewUser(phoneNumber) {
    const result = await query(
        `INSERT INTO users (phone_number, onboarding_step, onboarding_data)
         VALUES ($1, $2, $3) RETURNING *`,
        [phoneNumber, ONBOARDING_STEPS.CITY_SELECTION, '{}']
    );
    return result.rows[0];
}

async function handleOnboarding(user, body, from) {
    const step = user.onboarding_step;
    const cities = Object.keys(CITIES);

    switch (step) {
        case ONBOARDING_STEPS.START:
        case ONBOARDING_STEPS.CITY_SELECTION: {
            if (['hi', 'hello', 'start', 'hey', 'begin'].includes(body.toLowerCase())) {
                await sendWhatsAppMessage(from, WHATSAPP_MESSAGES.WELCOME);
                await sendWhatsAppMessage(from, WHATSAPP_MESSAGES.CITY_OPTIONS(cities));
                await updateOnboardingStep(user.id, ONBOARDING_STEPS.CITY_SELECTION);
                return;
            }
            const cityIndex = parseInt(body) - 1;
            if (isNaN(cityIndex) || cityIndex < 0 || cityIndex >= cities.length) {
                await sendWhatsAppMessage(from, `❌ Invalid choice. Please reply with a number (1-${cities.length}).`);
                await sendWhatsAppMessage(from, WHATSAPP_MESSAGES.CITY_OPTIONS(cities));
                return;
            }
            const selectedCity = cities[cityIndex];
            const zones = CITIES[selectedCity].zones;
            await updateOnboardingData(user.id, { city: selectedCity });
            await updateOnboardingStep(user.id, ONBOARDING_STEPS.ZONE_SELECTION);
            await sendWhatsAppMessage(from, WHATSAPP_MESSAGES.ZONE_OPTIONS(selectedCity, zones));
            break;
        }

        case ONBOARDING_STEPS.ZONE_SELECTION: {
            const onboardingData = user.onboarding_data || {};
            const city = onboardingData.city;
            const zones = CITIES[city]?.zones || [];
            const zoneIndex = parseInt(body) - 1;
            if (isNaN(zoneIndex) || zoneIndex < 0 || zoneIndex >= zones.length) {
                await sendWhatsAppMessage(from, `❌ Invalid choice. Please reply with a number (1-${zones.length}).`);
                return;
            }
            const selectedZone = zones[zoneIndex];
            await updateOnboardingData(user.id, { ...onboardingData, zone: selectedZone });
            await updateOnboardingStep(user.id, ONBOARDING_STEPS.DELIVERY_TYPE);
            await sendWhatsAppMessage(from, WHATSAPP_MESSAGES.DELIVERY_TYPE_OPTIONS);
            break;
        }

        case ONBOARDING_STEPS.DELIVERY_TYPE: {
            const dtIndex = parseInt(body) - 1;
            if (isNaN(dtIndex) || dtIndex < 0 || dtIndex >= DELIVERY_TYPES.length) {
                await sendWhatsAppMessage(from, `❌ Invalid choice. Please reply with a number (1-4).`);
                return;
            }
            const onboardingData = user.onboarding_data || {};
            const selectedType = DELIVERY_TYPES[dtIndex];
            await updateOnboardingData(user.id, { ...onboardingData, delivery_type: selectedType });
            await updateOnboardingStep(user.id, ONBOARDING_STEPS.WORKING_HOURS);
            await sendWhatsAppMessage(from, WHATSAPP_MESSAGES.WORKING_HOURS);
            break;
        }

        case ONBOARDING_STEPS.WORKING_HOURS: {
            const parsed = parseWorkingHours(body);
            if (!parsed) {
                await sendWhatsAppMessage(from, `❌ Invalid format. Please reply like: 9AM-9PM or 09:00-21:00`);
                return;
            }
            const onboardingData = user.onboarding_data || {};
            await updateOnboardingData(user.id, { ...onboardingData, working_hours_start: parsed.start, working_hours_end: parsed.end });
            await updateOnboardingStep(user.id, ONBOARDING_STEPS.INCOME_INPUT);
            await sendWhatsAppMessage(from, WHATSAPP_MESSAGES.INCOME_INPUT);
            break;
        }

        case ONBOARDING_STEPS.INCOME_INPUT: {
            const income = parseFloat(body.replace(/[₹,\s]/g, ''));
            if (isNaN(income) || income < 100 || income > 10000) {
                await sendWhatsAppMessage(from, `❌ Please enter a valid daily income between ₹100 and ₹10,000.`);
                return;
            }
            const onboardingData = user.onboarding_data || {};
            const fullData = { ...onboardingData, average_daily_income: income };

            await query(
                `UPDATE users SET city=$2, zone=$3, delivery_type=$4, working_hours_start=$5, working_hours_end=$6,
                 average_daily_income=$7, onboarding_data=$8, onboarding_step=$9, updated_at=CURRENT_TIMESTAMP WHERE id=$1`,
                [user.id, fullData.city, fullData.zone, fullData.delivery_type, fullData.working_hours_start,
                 fullData.working_hours_end, income, JSON.stringify(fullData), ONBOARDING_STEPS.RISK_ASSESSMENT]
            );

            await sendWhatsAppMessage(from, `🧠 Analyzing your risk profile with AI...\nPlease wait a moment.`);

            try {
                const riskResult = await riskEngine.assessRisk({
                    city: fullData.city,
                    zone: fullData.zone,
                    delivery_type: fullData.delivery_type,
                    working_hours: { start: fullData.working_hours_start, end: fullData.working_hours_end },
                    average_daily_income: income
                });

                await query('UPDATE users SET risk_score=$2 WHERE id=$1', [user.id, riskResult.risk_score]);
                await sendWhatsAppMessage(from, WHATSAPP_MESSAGES.RISK_ASSESSMENT({
                    risk_score: riskResult.risk_score,
                    city: fullData.city,
                    zone: fullData.zone,
                    delivery_type: fullData.delivery_type.replace(/_/g, ' '),
                    premium: riskResult.premium_weekly,
                    coverage_daily: riskResult.coverage_daily,
                    coverage_weekly: riskResult.coverage_weekly_max
                }));
                await updateOnboardingData(user.id, { ...fullData, risk_result: riskResult });
                await updateOnboardingStep(user.id, ONBOARDING_STEPS.POLICY_OFFER);
            } catch (error) {
                logger.error('Risk assessment error:', error);
                const fallbackResult = riskEngine.getDefaultRisk(income);
                await sendWhatsAppMessage(from, WHATSAPP_MESSAGES.RISK_ASSESSMENT({
                    risk_score: fallbackResult.risk_score,
                    city: fullData.city,
                    zone: fullData.zone,
                    delivery_type: fullData.delivery_type.replace(/_/g, ' '),
                    premium: fallbackResult.premium_weekly,
                    coverage_daily: fallbackResult.coverage_daily,
                    coverage_weekly: fallbackResult.coverage_weekly_max
                }));
                await updateOnboardingData(user.id, { ...fullData, risk_result: fallbackResult });
                await updateOnboardingStep(user.id, ONBOARDING_STEPS.POLICY_OFFER);
            }
            break;
        }

        case ONBOARDING_STEPS.POLICY_OFFER: {
            if (body.toUpperCase() === 'BUY') {
                const onboardingData = user.onboarding_data;
                const riskResult = onboardingData.risk_result;
                try {
                    const paymentResult = await payoutService.createPaymentLink(user.id, riskResult.premium_weekly, `GigShield Weekly Premium`);
                    await updateOnboardingStep(user.id, ONBOARDING_STEPS.PAYMENT);
                    await sendWhatsAppMessage(from, WHATSAPP_MESSAGES.PAYMENT_LINK(riskResult.premium_weekly, paymentResult.short_url || 'https://gigshield.ai/pay'));
                } catch (error) {
                    await updateOnboardingStep(user.id, ONBOARDING_STEPS.PAYMENT);
                    await sendWhatsAppMessage(from, `💳 *Complete Payment*\n\nAmount: ₹${riskResult.premium_weekly}\n\nFor demo: Reply *DONE* to simulate payment.`);
                }
            } else if (body.toUpperCase() === 'SKIP') {
                await sendWhatsAppMessage(from, `No problem! Type *START* anytime to get protected. Stay safe! 🙏`);
                await updateOnboardingStep(user.id, ONBOARDING_STEPS.START);
            } else {
                await sendWhatsAppMessage(from, `Reply *BUY* to purchase or *SKIP* to skip.`);
            }
            break;
        }

        case ONBOARDING_STEPS.PAYMENT: {
            if (body.toUpperCase() === 'DONE' || body.toUpperCase() === 'PAID') {
                const onboardingData = user.onboarding_data;
                const riskResult = onboardingData.risk_result;
                const policyNumber = 'GS-' + Date.now().toString().slice(-6);
                const startDate = moment().format('YYYY-MM-DD');
                const endDate = moment().add(30, 'days').format('YYYY-MM-DD');
                const renewalDate = moment().add(7, 'days').format('YYYY-MM-DD');

                const policyResult = await query(
                    `INSERT INTO policies (user_id, policy_number, status, premium_weekly, coverage_daily, coverage_weekly_max,
                     risk_score_at_creation, start_date, end_date, renewal_date, total_premiums_paid)
                     VALUES ($1,$2,'ACTIVE',$3,$4,$5,$6,$7,$8,$9,$3) RETURNING *`,
                    [user.id, policyNumber, riskResult.premium_weekly, riskResult.coverage_daily,
                     riskResult.coverage_weekly_max, riskResult.risk_score, startDate, endDate, renewalDate]
                );

                await query(
                    `INSERT INTO transactions (user_id, policy_id, type, amount, status, payment_method)
                     VALUES ($1,$2,'PREMIUM_PAYMENT',$3,'COMPLETED','UPI')`,
                    [user.id, policyResult.rows[0].id, riskResult.premium_weekly]
                );

                await updateOnboardingStep(user.id, ONBOARDING_STEPS.COMPLETED);
                await sendWhatsAppMessage(from, WHATSAPP_MESSAGES.POLICY_ACTIVE({
                    policy_number: policyNumber, start_date: startDate, end_date: endDate,
                    premium_weekly: riskResult.premium_weekly, coverage_daily: riskResult.coverage_daily
                }));
            } else {
                await sendWhatsAppMessage(from, `Please complete payment and reply *DONE*.`);
            }
            break;
        }

        default:
            await sendWhatsAppMessage(from, WHATSAPP_MESSAGES.WELCOME);
            await updateOnboardingStep(user.id, ONBOARDING_STEPS.CITY_SELECTION);
    }
}

async function handleCommand(user, body, from) {
    const command = body.toUpperCase().trim();

    switch (command) {
        case 'STATUS': {
            const policyResult = await query(
                `SELECT p.*,
                    (SELECT COUNT(*) FROM claims c WHERE c.policy_id=p.id) as claim_count,
                    (SELECT COALESCE(SUM(payout_amount),0) FROM claims c WHERE c.policy_id=p.id AND c.status='PAID') as claims_paid
                 FROM policies p WHERE p.user_id=$1 AND p.status='ACTIVE' ORDER BY p.created_at DESC LIMIT 1`,
                [user.id]
            );
            if (policyResult.rows.length === 0) {
                await sendWhatsAppMessage(from, `❌ No active policy found.\n\nType *START* to get protected!`);
                return;
            }
            const policy = policyResult.rows[0];
            const riskLevel = user.risk_score > 0.7 ? 'HIGH 🔴' : user.risk_score > 0.5 ? 'MEDIUM 🟡' : 'LOW 🟢';
            const remaining_coverage = Math.max(0, policy.coverage_weekly_max - policy.claims_paid);
            await sendWhatsAppMessage(from, WHATSAPP_MESSAGES.STATUS({
                policy_number: policy.policy_number, status: policy.status,
                premium: policy.premium_weekly, coverage_weekly: policy.coverage_weekly_max,
                remaining_coverage: remaining_coverage,
                total_claims: policy.claims_paid, claim_count: policy.claim_count,
                total_premiums: policy.total_premiums_paid, current_risk: riskLevel
            }));
            break;
        }

        case 'CLAIMS': {
            const claimsResult = await query(
                `SELECT * FROM claims WHERE user_id=$1 ORDER BY created_at DESC LIMIT 5`, [user.id]
            );
            if (claimsResult.rows.length === 0) {
                await sendWhatsAppMessage(from, `📋 *Claim History*\n\nNo claims yet. We'll automatically file claims when disruptions are detected! ✅`);
                return;
            }
            let msg = `📋 *Recent Claims*\n\n`;
            claimsResult.rows.forEach((claim, i) => {
                const statusEmoji = { 'PAID': '✅', 'APPROVED': '🟢', 'INITIATED': '🟡', 'REJECTED': '❌', 'FRAUD_FLAGGED': '🚫' };
                msg += `${i + 1}. ${statusEmoji[claim.status] || '⏳'} ${claim.trigger_type.replace(/_/g, ' ')}\n`;
                msg += `   💰 ₹${claim.payout_amount} | ${moment(claim.created_at).format('DD MMM')}\n`;
                msg += `   Status: ${claim.status}\n\n`;
            });
            await sendWhatsAppMessage(from, msg);
            break;
        }

        case 'PAY':
        case 'PAID': {
            const activePolicy = await query(`SELECT * FROM policies WHERE user_id=$1 AND status='ACTIVE' LIMIT 1`, [user.id]);
            if (activePolicy.rows.length === 0) {
                await sendWhatsAppMessage(from, `❌ No active policy found.`);
                return;
            }
            const policy = activePolicy.rows[0];
            if (command === 'PAY') {
                await sendWhatsAppMessage(from, `💳 *Weekly Premium Payment*\n\n📋 Policy: ${policy.policy_number}\n💰 Amount: ₹${policy.premium_weekly}\n\nFor demo: Reply *PAID* to simulate payment.`);
            } else {
                await query(
                    `UPDATE policies SET total_premiums_paid=total_premiums_paid+premium_weekly, renewal_date=CURRENT_DATE+INTERVAL '7 days', updated_at=CURRENT_TIMESTAMP WHERE id=$1`,
                    [policy.id]
                );
                await query(
                    `INSERT INTO transactions (user_id,policy_id,type,amount,status,payment_method) VALUES ($1,$2,'PREMIUM_PAYMENT',$3,'COMPLETED','UPI')`,
                    [user.id, policy.id, policy.premium_weekly]
                );
                await sendWhatsAppMessage(from, `✅ *Payment Received!*\n\n💰 ₹${policy.premium_weekly} premium paid.\n📅 Next payment: ${moment().add(7, 'days').format('DD MMM YYYY')}\n\nYou're protected! 🛡️`);
            }
            break;
        }

        case 'HELP':
            await sendWhatsAppMessage(from, WHATSAPP_MESSAGES.HELP);
            break;

        case 'HI':
        case 'HELLO':
        case 'HEY':
            await sendWhatsAppMessage(from, `👋 Hey ${user.name || 'there'}!\n\nYour GigShield protection is active. ✅\n\nType *STATUS* to check details or *HELP* for commands.`);
            break;

        default:
            await sendWhatsAppMessage(from, WHATSAPP_MESSAGES.ERROR);
    }
}

async function updateOnboardingStep(userId, step) {
    await query('UPDATE users SET onboarding_step=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$1', [userId, step]);
}

async function updateOnboardingData(userId, data) {
    await query('UPDATE users SET onboarding_data=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$1', [userId, JSON.stringify(data)]);
}

function parseWorkingHours(input) {
    try {
        const cleaned = input.replace(/\s/g, '').toUpperCase();
        const parts = cleaned.split('-');
        if (parts.length !== 2) return null;
        const parseTime = (timeStr) => {
            if (timeStr.includes(':')) return timeStr;
            const ampm = timeStr.includes('PM') ? 'PM' : 'AM';
            let hour = parseInt(timeStr.replace(/[APM]/g, ''));
            if (ampm === 'PM' && hour !== 12) hour += 12;
            if (ampm === 'AM' && hour === 12) hour = 0;
            return `${hour.toString().padStart(2, '0')}:00`;
        };
        return { start: parseTime(parts[0]), end: parseTime(parts[1]) };
    } catch (e) {
        return null;
    }
}

module.exports = new WhatsAppController();
