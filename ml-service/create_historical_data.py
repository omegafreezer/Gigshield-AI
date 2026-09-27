import pandas as pd
import numpy as np
import os

def generate_historical_dataset(n_samples=5000):
    np.random.seed(42)
    normal_data = []
    fraud_data = []

    # 1. Normal Authentic Claims
    for _ in range(int(n_samples * 0.94)):
        normal_data.append({
            'claim_amount': np.random.uniform(150, 450),
            'weekly_claim_count': np.random.choice([0, 1, 1, 1, 2, 2]),
            'total_claims_history': np.random.randint(0, 15),
            'days_since_registration': np.random.randint(7, 365),
            'gps_consistency': np.random.uniform(0.75, 1.0), # High consistency
            'claim_frequency_ratio': np.random.uniform(0.0, 0.3),
            'avg_claim_to_income_ratio': np.random.uniform(0.2, 0.5),
            'is_fraud': 0
        })

    # 2. Fraud: GPS Spoofing (Delivery specific fraud)
    for _ in range(int(n_samples * 0.03)):
        fraud_data.append({
            'claim_amount': np.random.uniform(350, 500),
            'weekly_claim_count': np.random.choice([1, 2, 3]),
            'total_claims_history': np.random.randint(5, 20),
            'days_since_registration': np.random.randint(30, 180),
            'gps_consistency': np.random.uniform(0.1, 0.4), # VERY LOW - clear indicator of GPS spoofing
            'claim_frequency_ratio': np.random.uniform(0.2, 0.5),
            'avg_claim_to_income_ratio': np.random.uniform(0.5, 0.8),
            'is_fraud': 1
        })

    # 3. Fraud: High Frequency / New Account Policy Abuse
    for _ in range(int(n_samples * 0.03)):
        fraud_data.append({
            'claim_amount': np.random.uniform(400, 500),
            'weekly_claim_count': np.random.choice([3, 4, 5]), # Very high frequency
            'total_claims_history': np.random.randint(10, 50),
            'days_since_registration': np.random.randint(1, 14), # New account
            'gps_consistency': np.random.uniform(0.6, 0.9),
            'claim_frequency_ratio': np.random.uniform(0.6, 1.0),
            'avg_claim_to_income_ratio': np.random.uniform(0.7, 1.0),
            'is_fraud': 1
        })

    all_data = normal_data + fraud_data
    np.random.shuffle(all_data)
    
    df = pd.DataFrame(all_data)
    
    # Ensure directory exists
    os.makedirs('data', exist_ok=True)
    df.to_csv('data/historical_claims.csv', index=False)
    print(f"Generated {len(df)} historical claim records successfully at data/historical_claims.csv")

if __name__ == "__main__":
    generate_historical_dataset()
