module.exports = {
    CITIES: {
        'Mumbai': {
            zones: ['Andheri', 'Bandra', 'Dadar', 'Borivali', 'Thane', 'Navi Mumbai'],
            lat: 19.076, lon: 72.8777
        },
        'Delhi': {
            zones: ['Connaught Place', 'Karol Bagh', 'Dwarka', 'Rohini', 'Saket', 'Lajpat Nagar'],
            lat: 28.6139, lon: 77.209
        },
        'Bangalore': {
            zones: ['Koramangala', 'Whitefield', 'Indiranagar', 'HSR Layout', 'Electronic City', 'Jayanagar'],
            lat: 12.9716, lon: 77.5946
        },
        'Hyderabad': {
            zones: ['Banjara Hills', 'Madhapur', 'Gachibowli', 'Secunderabad', 'Ameerpet', 'Kukatpally'],
            lat: 17.385, lon: 78.4867
        },
        'Chennai': {
            zones: ['T Nagar', 'Anna Nagar', 'Adyar', 'Velachery', 'OMR', 'Porur'],
            lat: 13.0827, lon: 80.2707
        }
    },

    DELIVERY_TYPES: ['food_delivery', 'grocery_delivery', 'parcel_delivery', 'ride_hailing'],

    PERIL_TYPES: {
        HEAVY_RAIN: 'HEAVY_RAIN',
        EXTREME_HEAT: 'EXTREME_HEAT',
        POOR_AQI: 'POOR_AQI',
        TRAFFIC_DISRUPTION: 'TRAFFIC_DISRUPTION',
        AI_INCOME_DROP: 'AI_INCOME_DROP'
    },

    POLICY_STATUS: {
        PENDING: 'PENDING',
        ACTIVE: 'ACTIVE',
        EXPIRED: 'EXPIRED',
        CANCELLED: 'CANCELLED'
    },

    CLAIM_STATUS: {
        INITIATED: 'INITIATED',
        VALIDATED: 'VALIDATED',
        APPROVED: 'APPROVED',
        PAID: 'PAID',
        REJECTED: 'REJECTED',
        FRAUD_FLAGGED: 'FRAUD_FLAGGED'
    },

    ONBOARDING_STEPS: {
        START: 'START',
        CITY_SELECTION: 'CITY_SELECTION',
        ZONE_SELECTION: 'ZONE_SELECTION',
        DELIVERY_TYPE: 'DELIVERY_TYPE',
        WORKING_HOURS: 'WORKING_HOURS',
        INCOME_INPUT: 'INCOME_INPUT',
        RISK_ASSESSMENT: 'RISK_ASSESSMENT',
        POLICY_OFFER: 'POLICY_OFFER',
        PAYMENT: 'PAYMENT',
        COMPLETED: 'COMPLETED'
    },

    WHATSAPP_MESSAGES: {
        WELCOME: `🛡️ *Welcome to GigShield AI!*\n\nIndia's first WhatsApp-based income protection for gig workers.\n\n✅ Automatic weather & disruption protection\n✅ Instant payouts\n✅ Starting from ₹25/week\n\nLet's get you protected in 2 minutes!\n\nWhich city do you work in?`,

        CITY_OPTIONS: (cities) => {
            let msg = `📍 *Select your city:*\n\n`;
            cities.forEach((city, i) => { msg += `${i + 1}. ${city}\n`; });
            msg += `\nReply with the number.`;
            return msg;
        },

        ZONE_OPTIONS: (city, zones) => {
            let msg = `🏘️ *Select your zone in ${city}:*\n\n`;
            zones.forEach((zone, i) => { msg += `${i + 1}. ${zone}\n`; });
            msg += `\nReply with the number.`;
            return msg;
        },

        DELIVERY_TYPE_OPTIONS: `🚴 *What type of delivery do you do?*\n\n1. Food Delivery (Swiggy/Zomato)\n2. Grocery Delivery (Blinkit/Zepto)\n3. Parcel Delivery (Delhivery/DTDC)\n4. Ride Hailing (Ola/Uber)\n\nReply with the number.`,

        WORKING_HOURS: `⏰ *What are your working hours?*\n\nReply in format: START-END\nExample: 9AM-9PM or 09:00-21:00`,

        INCOME_INPUT: `💰 *What is your average daily income?*\n\nReply with amount in ₹\nExample: 850`,

        RISK_ASSESSMENT: (data) => {
            return `🧠 *AI Risk Assessment Complete!*\n\n📊 Risk Score: ${(data.risk_score * 100).toFixed(0)}%\n🏙️ City: ${data.city}\n📍 Zone: ${data.zone}\n🚴 Type: ${data.delivery_type}\n\n💰 *Your Personalized Plan:*\n\n📋 Weekly Premium: ₹${data.premium}\n🛡️ Daily Coverage: ₹${data.coverage_daily}\n📆 Weekly Max: ₹${data.coverage_weekly}\n\n*Perils Covered:*\n🌧️ Heavy Rain\n🌡️ Extreme Heat\n🫁 Poor Air Quality\n🚗 Traffic Disruption\n\n✅ Reply *BUY* to purchase\n❌ Reply *SKIP* to skip`;
        },

        PAYMENT_LINK: (amount, link) => {
            return `💳 *Complete Payment*\n\nAmount: ₹${amount}\n\n🔗 Pay here: ${link}\n\nOr pay via UPI:\ngigshield@razorpay\n\nReply *DONE* after payment.`;
        },

        POLICY_ACTIVE: (policy) => {
            return `🎉 *Policy Activated!*\n\n📋 Policy: ${policy.policy_number}\n📅 Valid: ${policy.start_date} to ${policy.end_date}\n💰 Premium: ₹${policy.premium_weekly}/week\n🛡️ Coverage: ₹${policy.coverage_daily}/day\n\n✅ You're now protected!\n\nType *STATUS* anytime to check.\nType *HELP* for commands.`;
        },

        CLAIM_NOTIFICATION: (claim) => {
            return `⚡ *Automatic Claim Triggered!*\n\n🔔 Event: ${claim.trigger_type.replace(/_/g, ' ')}\n📊 Detected Value: ${claim.trigger_value}\n⚠️ Threshold: ${claim.trigger_threshold}\n💰 Payout: ₹${claim.payout_amount}\n\n📋 Claim #${claim.claim_number}\n\n💸 Amount will be credited to your UPI within 5 minutes.\n\nStay safe! 🙏`;
        },

        PAYOUT_CONFIRMATION: (amount, ref) => {
            return `✅ *Instant Payout Successful!*\n\n💰 ₹${amount} automatically transferred to your registered UPI.\n💳 Bank Reference: ${ref}\n\n🔗 View Payment Receipt (Mock):\nhttps://mock-gateway.gigshield.ai/receipt/${ref}\n\nWe've covered your lost wages. Stay safe! 🙏`;
        },

        STATUS: (data) => {
            return `📊 *Your GigShield Status*\n\n📋 Policy: ${data.policy_number}\n✅ Status: ${data.status}\n\n🛡️ *Active Weekly Coverage: ₹${data.coverage_weekly}*\n💰 *Earnings Protected (Remaining): ₹${data.remaining_coverage}*\n\n📈 *This Week:*\n💸 Claims Paid: ₹${data.total_claims}\n📝 Total Claims: ${data.claim_count}\n💳 Premium: ₹${data.premium}/week\n\n🌤️ AI Current Risk: ${data.current_risk}`;
        },

        HELP: `📖 *GigShield Commands*\n\n📊 *STATUS* - Check your policy\n📋 *CLAIMS* - View claim history\n💰 *PAY* - Pay weekly premium\n🔄 *RENEW* - Renew policy\n❌ *CANCEL* - Cancel policy\n❓ *HELP* - Show this menu\n\n💬 Or just ask any question!`,

        ERROR: `❌ Sorry, I didn't understand that.\n\nType *HELP* to see available commands.`,

        NOT_REGISTERED: `👋 Hi! You're not registered yet.\n\nType *START* to begin your protection journey!`
    }
};
