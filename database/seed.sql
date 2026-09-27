-- database/seed.sql

INSERT INTO users (phone_number, name, city, zone, delivery_type, working_hours_start, working_hours_end, average_daily_income, risk_score, onboarding_step)
VALUES
    ('+919876543210', 'Ramesh Kumar', 'Mumbai', 'Andheri', 'food_delivery', '09:00', '21:00', 850.00, 0.65, 'COMPLETED'),
    ('+919876543211', 'Priya Sharma', 'Delhi', 'Connaught Place', 'grocery_delivery', '08:00', '20:00', 750.00, 0.72, 'COMPLETED'),
    ('+919876543212', 'Suresh Yadav', 'Bangalore', 'Koramangala', 'food_delivery', '10:00', '22:00', 900.00, 0.55, 'COMPLETED'),
    ('+919876543213', 'Anita Devi', 'Mumbai', 'Bandra', 'parcel_delivery', '07:00', '19:00', 650.00, 0.78, 'COMPLETED'),
    ('+919876543214', 'Vikram Singh', 'Delhi', 'Karol Bagh', 'food_delivery', '11:00', '23:00', 800.00, 0.68, 'COMPLETED'),
    ('+919876543215', 'Karthik Raj', 'Chennai', 'T Nagar', 'food_delivery', '09:00', '21:00', 850.00, 0.65, 'COMPLETED'),
    ('+919876543216', 'Mohammed Ali', 'Hyderabad', 'Banjara Hills', 'ride_hailing', '10:00', '22:00', 950.00, 0.55, 'COMPLETED');

INSERT INTO policies (user_id, policy_number, status, premium_weekly, coverage_daily, coverage_weekly_max, risk_score_at_creation, start_date, end_date)
SELECT
    id,
    'GS-' || LPAD(ROW_NUMBER() OVER()::TEXT, 6, '0'),
    'ACTIVE',
    CASE WHEN risk_score > 0.7 THEN 45.00 WHEN risk_score > 0.5 THEN 35.00 ELSE 25.00 END,
    CASE WHEN risk_score > 0.7 THEN 400.00 WHEN risk_score > 0.5 THEN 350.00 ELSE 300.00 END,
    CASE WHEN risk_score > 0.7 THEN 2000.00 WHEN risk_score > 0.5 THEN 1750.00 ELSE 1500.00 END,
    risk_score,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days'
FROM users
WHERE onboarding_step = 'COMPLETED';
