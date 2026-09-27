from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
import logging

from models.risk_model import RiskModel
from models.income_model import IncomeModel
from models.fraud_model import FraudModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="GigShield AI - ML Service",
    description="Machine Learning service for risk prediction, income forecasting, and fraud detection",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

risk_model = RiskModel()
income_model = IncomeModel()
fraud_model = FraudModel()


class RiskPredictionRequest(BaseModel):
    city: str
    zone: str
    delivery_type: str
    working_hours_start: int
    working_hours_end: int
    average_daily_income: float


class FraudDetectionRequest(BaseModel):
    user_id: str
    city: str
    zone: str
    trigger_type: str
    claim_amount: float
    weekly_claim_count: int
    total_claims_history: Optional[int] = 0
    days_since_registration: Optional[int] = 30
    gps_consistency: Optional[float] = 0.9


class IncomeAnomalyRequest(BaseModel):
    city: str
    zone: Optional[str] = None


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "gigshield-ml",
        "models": {
            "risk": risk_model.is_ready(),
            "income": income_model.is_ready(),
            "fraud": fraud_model.is_ready()
        }
    }


@app.post("/predict/risk")
async def predict_risk(request: RiskPredictionRequest):
    try:
        logger.info(f"Risk prediction for {request.city}/{request.zone}")
        result = risk_model.predict(
            city=request.city,
            zone=request.zone,
            delivery_type=request.delivery_type,
            working_hours_start=request.working_hours_start,
            working_hours_end=request.working_hours_end,
            average_daily_income=request.average_daily_income
        )
        return result
    except Exception as e:
        logger.error(f"Risk prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/fraud")
async def predict_fraud(request: FraudDetectionRequest):
    try:
        logger.info(f"Fraud detection for user {request.user_id}")
        result = fraud_model.predict(
            user_id=request.user_id,
            city=request.city,
            zone=request.zone,
            trigger_type=request.trigger_type,
            claim_amount=request.claim_amount,
            weekly_claim_count=request.weekly_claim_count,
            total_claims_history=request.total_claims_history,
            days_since_registration=request.days_since_registration,
            gps_consistency=request.gps_consistency
        )
        return result
    except Exception as e:
        logger.error(f"Fraud detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/income-anomaly")
async def predict_income_anomaly(request: IncomeAnomalyRequest):
    try:
        result = income_model.check_anomaly(city=request.city, zone=request.zone)
        return result
    except Exception as e:
        logger.error(f"Income anomaly error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/train/risk")
async def train_risk_model():
    try:
        result = risk_model.train()
        return {"status": "success", "metrics": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/train/fraud")
async def train_fraud_model():
    try:
        result = fraud_model.train()
        return {"status": "success", "metrics": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
