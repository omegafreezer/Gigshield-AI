-- database/init.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(100),
    city VARCHAR(50),
    zone VARCHAR(50),
    delivery_type VARCHAR(30),
    working_hours_start TIME,
    working_hours_end TIME,
    working_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6],
    average_daily_income DECIMAL(10,2),
    risk_score DECIMAL(5,4),
    onboarding_step VARCHAR(30) DEFAULT 'START',
    onboarding_data JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    policy_number VARCHAR(20) UNIQUE NOT NULL,
    guidewire_policy_id VARCHAR(50),
    status VARCHAR(20) DEFAULT 'PENDING',
    premium_weekly DECIMAL(10,2) NOT NULL,
    coverage_daily DECIMAL(10,2) NOT NULL,
    coverage_weekly_max DECIMAL(10,2) NOT NULL,
    perils_covered TEXT[] DEFAULT ARRAY['HEAVY_RAIN','EXTREME_HEAT','POOR_AQI','TRAFFIC_DISRUPTION'],
    risk_score_at_creation DECIMAL(5,4),
    start_date DATE NOT NULL,
    end_date DATE,
    renewal_date DATE,
    total_premiums_paid DECIMAL(10,2) DEFAULT 0,
    total_claims_paid DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID REFERENCES policies(id),
    user_id UUID REFERENCES users(id),
    claim_number VARCHAR(20) UNIQUE NOT NULL,
    guidewire_claim_id VARCHAR(50),
    trigger_type VARCHAR(30) NOT NULL,
    trigger_value DECIMAL(10,2),
    trigger_threshold DECIMAL(10,2),
    trigger_evidence JSONB NOT NULL,
    predicted_income_loss DECIMAL(10,2),
    payout_amount DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'INITIATED',
    fraud_score DECIMAL(5,4),
    fraud_flags JSONB DEFAULT '[]',
    payout_reference VARCHAR(100),
    payout_timestamp TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trigger_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city VARCHAR(50) NOT NULL,
    zone VARCHAR(50),
    event_type VARCHAR(30) NOT NULL,
    event_value DECIMAL(10,2) NOT NULL,
    threshold DECIMAL(10,2) NOT NULL,
    is_triggered BOOLEAN DEFAULT false,
    data_source VARCHAR(50),
    raw_data JSONB,
    duration_minutes INTEGER,
    event_start TIMESTAMP,
    event_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    policy_id UUID REFERENCES policies(id),
    claim_id UUID REFERENCES claims(id),
    type VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    payment_method VARCHAR(30),
    payment_reference VARCHAR(100),
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE weather_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city VARCHAR(50) NOT NULL,
    zone VARCHAR(50),
    temperature DECIMAL(5,2),
    humidity DECIMAL(5,2),
    rainfall_mm DECIMAL(8,2),
    wind_speed DECIMAL(6,2),
    weather_condition VARCHAR(50),
    aqi INTEGER,
    raw_data JSONB,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trigger_thresholds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    peril_type VARCHAR(30) UNIQUE NOT NULL,
    threshold_value DECIMAL(10,2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    payout_amount DECIMAL(10,2) NOT NULL,
    data_source VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO trigger_thresholds (peril_type, threshold_value, duration_minutes, payout_amount, data_source, description) VALUES
    ('HEAVY_RAIN', 50.0, 120, 350.00, 'openweathermap', 'Rainfall > 50mm/hr for 2+ hours'),
    ('EXTREME_HEAT', 42.0, 240, 250.00, 'openweathermap', 'Temperature > 42C for 4+ hours'),
    ('POOR_AQI', 300, 360, 300.00, 'openweathermap', 'AQI > 300 for 6+ hours'),
    ('TRAFFIC_DISRUPTION', 5.0, 180, 200.00, 'google_maps', 'Average speed < 5km/hr for 3+ hours');

CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_city_zone ON users(city, zone);
CREATE INDEX idx_policies_user ON policies(user_id);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_claims_user ON claims(user_id);
CREATE INDEX idx_claims_policy ON claims(policy_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_trigger_events_city ON trigger_events(city, event_type);
CREATE INDEX idx_weather_cache_city ON weather_cache(city, fetched_at);
CREATE INDEX idx_transactions_user ON transactions(user_id);
