import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib
import os
import logging

logger = logging.getLogger(__name__)


class FraudModel:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.model_path = "saved_models/fraud_model.joblib"
        self.is_trained_flag = False

        if os.path.exists(self.model_path):
            try:
                saved = joblib.load(self.model_path)
                self.model = saved['model']
                self.scaler = saved['scaler']
                self.is_trained_flag = True
                logger.info("Fraud model loaded from disk")
            except Exception as e:
                logger.warning(f"Could not load fraud model: {e}")

        if not self.is_trained_flag:
            self.train()

    def is_ready(self):
        return self.is_trained_flag

    def load_historical_data(self):
        import pandas as pd
        csv_path = "data/historical_claims.csv"
        if not os.path.exists(csv_path):
            logger.warning(f"Historical data not found at {csv_path}. Falling back to default generation.")
            # Simple fallback if necessary, though the script generates it correctly
            return []
        
        df = pd.read_csv(csv_path)
        all_data = df.to_dict('records')
        return all_data

    def train(self):
        logger.info("Training fraud detection model with historical data...")
        data = self.load_historical_data()
        if not data:
            raise ValueError("No historical data available to train the model.")
            
        feature_cols = ['claim_amount', 'weekly_claim_count', 'total_claims_history',
                        'days_since_registration', 'gps_consistency',
                        'claim_frequency_ratio', 'avg_claim_to_income_ratio']

        X = np.array([[d[col] for col in feature_cols] for d in data])
        X_scaled = self.scaler.fit_transform(X)

        self.model = IsolationForest(n_estimators=200, contamination=0.06, random_state=42)
        self.model.fit(X_scaled)

        labels = [d['is_fraud'] for d in data]
        predictions = self.model.predict(X_scaled)
        predicted_fraud = [1 if p == -1 else 0 for p in predictions]
        true_positives = sum(1 for a, p in zip(labels, predicted_fraud) if a == 1 and p == 1)
        false_positives = sum(1 for a, p in zip(labels, predicted_fraud) if a == 0 and p == 1)
        total_fraud = sum(labels)
        precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0
        recall = true_positives / total_fraud if total_fraud > 0 else 0
        logger.info(f"Fraud model — Precision: {precision:.4f}, Recall: {recall:.4f}")

        os.makedirs("saved_models", exist_ok=True)
        joblib.dump({'model': self.model, 'scaler': self.scaler}, self.model_path)
        self.is_trained_flag = True
        return {'precision': round(precision, 4), 'recall': round(recall, 4), 'samples': len(data)}

    def predict(self, user_id, city, zone, trigger_type, claim_amount,
                weekly_claim_count, total_claims_history=0,
                days_since_registration=30, gps_consistency=0.9):
        if not self.is_trained_flag:
            self.train()

        claim_frequency_ratio = weekly_claim_count / 7.0
        avg_claim_to_income_ratio = claim_amount / 800.0

        features = np.array([[claim_amount, weekly_claim_count, total_claims_history,
                               days_since_registration, gps_consistency,
                               claim_frequency_ratio, avg_claim_to_income_ratio]])
        features_scaled = self.scaler.transform(features)

        anomaly_score = self.model.decision_function(features_scaled)[0]
        prediction = self.model.predict(features_scaled)[0]
        fraud_score = float(np.clip(1 - (anomaly_score + 0.5), 0, 1))

        fraud_flags = []
        if weekly_claim_count >= 3:
            fraud_flags.append("High claim frequency this week")
        if days_since_registration < 7:
            fraud_flags.append("New user (< 7 days)")
        if gps_consistency < 0.5:
            fraud_flags.append("Low GPS consistency")
        if claim_amount > 400:
            fraud_flags.append("High claim amount")
        if avg_claim_to_income_ratio > 0.7:
            fraud_flags.append("Claim-to-income ratio too high")

        is_fraud = fraud_score > 0.7 or prediction == -1

        return {
            'fraud_score': round(fraud_score, 4),
            'is_fraud': is_fraud,
            'fraud_flags': fraud_flags,
            'confidence': round(abs(anomaly_score), 4)
        }
