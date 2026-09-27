import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
import joblib
import os
import logging

logger = logging.getLogger(__name__)


class RiskModel:
    def __init__(self):
        self.model = None
        self.label_encoders = {}
        self.scaler = StandardScaler()
        self.model_path = "saved_models/risk_model.joblib"
        self.is_trained = False

        if os.path.exists(self.model_path):
            try:
                saved = joblib.load(self.model_path)
                self.model = saved['model']
                self.label_encoders = saved['encoders']
                self.scaler = saved['scaler']
                self.is_trained = True
                logger.info("Risk model loaded from disk")
            except Exception as e:
                logger.warning(f"Could not load risk model: {e}")

        if not self.is_trained:
            self.train()

    def is_ready(self):
        return self.is_trained

    def generate_training_data(self, n_samples=5000):
        np.random.seed(42)
        cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai']
        zones_per_city = {
            'Mumbai': ['Andheri', 'Bandra', 'Dadar', 'Borivali', 'Thane', 'Navi Mumbai'],
            'Delhi': ['Connaught Place', 'Karol Bagh', 'Dwarka', 'Rohini', 'Saket', 'Lajpat Nagar'],
            'Bangalore': ['Koramangala', 'Whitefield', 'Indiranagar', 'HSR Layout', 'Electronic City', 'Jayanagar'],
            'Hyderabad': ['Banjara Hills', 'Madhapur', 'Gachibowli', 'Secunderabad', 'Ameerpet', 'Kukatpally'],
            'Chennai': ['T Nagar', 'Anna Nagar', 'Adyar', 'Velachery', 'OMR', 'Porur']
        }
        delivery_types = ['food_delivery', 'grocery_delivery', 'parcel_delivery', 'ride_hailing']
        city_risk_base = {'Mumbai': 0.72, 'Delhi': 0.78, 'Bangalore': 0.45, 'Hyderabad': 0.55, 'Chennai': 0.62}
        delivery_risk = {'food_delivery': 0.12, 'grocery_delivery': 0.08, 'parcel_delivery': 0.05, 'ride_hailing': 0.15}

        data = []
        for _ in range(n_samples):
            city = np.random.choice(cities)
            zone = np.random.choice(zones_per_city[city])
            delivery_type = np.random.choice(delivery_types)
            working_hours_start = np.random.randint(6, 14)
            working_hours_end = np.random.randint(working_hours_start + 6, 24)
            avg_income = np.random.uniform(400, 1500)

            base = city_risk_base[city]
            dt_risk = delivery_risk[delivery_type]
            hours_worked = working_hours_end - working_hours_start
            hour_risk = min(hours_worked / 16.0, 1.0) * 0.15
            peak_risk = 0
            if working_hours_start <= 12 and working_hours_end >= 15:
                peak_risk += 0.08
            if working_hours_end >= 19:
                peak_risk += 0.05
            zone_noise = np.random.uniform(-0.05, 0.05)
            risk_score = base * 0.4 + dt_risk + hour_risk + peak_risk + zone_noise
            risk_score = np.clip(risk_score + np.random.normal(0, 0.03), 0.1, 0.95)

            data.append({
                'city': city, 'zone': zone, 'delivery_type': delivery_type,
                'working_hours_start': working_hours_start, 'working_hours_end': working_hours_end,
                'hours_worked': hours_worked, 'average_daily_income': avg_income, 'risk_score': risk_score
            })
        return pd.DataFrame(data)

    def train(self):
        logger.info("Training risk model (this takes ~30 seconds)...")
        df = self.generate_training_data(5000)

        categorical_cols = ['city', 'zone', 'delivery_type']
        for col in categorical_cols:
            self.label_encoders[col] = LabelEncoder()
            df[f'{col}_encoded'] = self.label_encoders[col].fit_transform(df[col])

        df['hours_worked'] = df['working_hours_end'] - df['working_hours_start']
        df['is_peak_afternoon'] = ((df['working_hours_start'] <= 12) & (df['working_hours_end'] >= 15)).astype(int)
        df['is_late_evening'] = (df['working_hours_end'] >= 20).astype(int)
        df['income_normalized'] = df['average_daily_income'] / 1500.0

        feature_cols = [
            'city_encoded', 'zone_encoded', 'delivery_type_encoded',
            'working_hours_start', 'working_hours_end', 'hours_worked',
            'is_peak_afternoon', 'is_late_evening', 'income_normalized', 'average_daily_income'
        ]

        X = df[feature_cols].values
        y = df['risk_score'].values
        X_scaled = self.scaler.fit_transform(X)
        X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)

        self.model = GradientBoostingRegressor(n_estimators=200, max_depth=6, learning_rate=0.1, random_state=42)
        self.model.fit(X_train, y_train)

        train_score = self.model.score(X_train, y_train)
        test_score = self.model.score(X_test, y_test)
        logger.info(f"Risk model trained — Train R²: {train_score:.4f}, Test R²: {test_score:.4f}")

        os.makedirs("saved_models", exist_ok=True)
        joblib.dump({'model': self.model, 'encoders': self.label_encoders, 'scaler': self.scaler}, self.model_path)
        self.is_trained = True
        return {'train_r2': round(train_score, 4), 'test_r2': round(test_score, 4), 'samples': len(df)}

    def predict(self, city, zone, delivery_type, working_hours_start, working_hours_end, average_daily_income):
        if not self.is_trained:
            self.train()

        try:
            city_enc = self.label_encoders['city'].transform([city])[0]
        except ValueError:
            city_enc = 0
        try:
            zone_enc = self.label_encoders['zone'].transform([zone])[0]
        except ValueError:
            zone_enc = 0
        try:
            dt_enc = self.label_encoders['delivery_type'].transform([delivery_type])[0]
        except ValueError:
            dt_enc = 0

        hours_worked = working_hours_end - working_hours_start
        is_peak = 1 if working_hours_start <= 12 and working_hours_end >= 15 else 0
        is_late = 1 if working_hours_end >= 20 else 0
        income_norm = average_daily_income / 1500.0

        features = np.array([[city_enc, zone_enc, dt_enc, working_hours_start, working_hours_end,
                               hours_worked, is_peak, is_late, income_norm, average_daily_income]])
        features_scaled = self.scaler.transform(features)
        risk_score = float(np.clip(self.model.predict(features_scaled)[0], 0.1, 0.95))

        risk_level = 'HIGH' if risk_score > 0.7 else ('MEDIUM' if risk_score > 0.5 else 'LOW')
        base_rate = 20
        risk_multiplier = 1 + (risk_score * 1.5)
        income_factor = max(average_daily_income / 1000, 0.5)
        premium_weekly = max(round(base_rate * risk_multiplier * income_factor), 25)
        coverage_daily = round(average_daily_income * 0.45)
        coverage_weekly_max = coverage_daily * 5

        feature_names = ['city', 'zone', 'delivery_type', 'start_hour', 'end_hour',
                         'hours_worked', 'peak_afternoon', 'late_evening', 'income_norm', 'income']
        importances = self.model.feature_importances_
        risk_factors = {name: round(float(imp), 4)
                        for name, imp in sorted(zip(feature_names, importances), key=lambda x: x[1], reverse=True)[:5]}

        return {
            'risk_score': round(risk_score, 4),
            'risk_level': risk_level,
            'premium_weekly': premium_weekly,
            'coverage_daily': coverage_daily,
            'coverage_weekly_max': coverage_weekly_max,
            'risk_factors': risk_factors
        }
