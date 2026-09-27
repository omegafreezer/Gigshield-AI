import numpy as np
import datetime
import logging

logger = logging.getLogger(__name__)


class IncomeModel:
    def __init__(self):
        self.city_baselines = {
            'Mumbai': {'mean': 820, 'std': 150},
            'Delhi': {'mean': 780, 'std': 140},
            'Bangalore': {'mean': 870, 'std': 160},
            'Hyderabad': {'mean': 750, 'std': 130},
            'Chennai': {'mean': 720, 'std': 120}
        }

    def is_ready(self):
        return True

    def get_expected_income(self, city, zone=None):
        baseline = self.city_baselines.get(city, {'mean': 800, 'std': 150})
        month = datetime.datetime.now().month
        monsoon_factor = 0.75 if month in [6, 7, 8, 9] else 1.0
        winter_factor = 0.85 if (month in [12, 1, 2] and city == 'Delhi') else 1.0
        summer_factor = 0.90 if (month in [4, 5, 6] and city in ['Delhi', 'Hyderabad', 'Chennai']) else 1.0
        expected = baseline['mean'] * monsoon_factor * winter_factor * summer_factor
        return {
            'expected_income': round(expected, 2),
            'std': baseline['std'],
            'seasonal_adjustment': round(monsoon_factor * winter_factor * summer_factor, 3)
        }

    def check_anomaly(self, city, zone=None):
        expected = self.get_expected_income(city, zone)
        current_factor = np.random.uniform(0.5, 1.2)
        simulated_current = expected['expected_income'] * current_factor
        drop_percentage = max(0, (1 - current_factor) * 100)
        threshold = 40
        anomaly_detected = drop_percentage >= threshold
        suggested_payout = 0
        if anomaly_detected:
            suggested_payout = round(expected['expected_income'] * (drop_percentage / 100) * 0.5, 2)
            suggested_payout = min(suggested_payout, 400)
        return {
            'anomaly_detected': anomaly_detected,
            'drop_percentage': round(drop_percentage, 1),
            'suggested_payout': suggested_payout,
            'confidence': round(min(drop_percentage / 100, 0.95), 2) if anomaly_detected else 0.1,
            'details': {
                'city': city,
                'expected_income': expected['expected_income'],
                'simulated_current': round(simulated_current, 2),
                'seasonal_adjustment': expected['seasonal_adjustment'],
                'threshold': threshold
            }
        }
