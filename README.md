# 🛡️ GigShield AI

### WhatsApp-Based Parametric Income Protection for Gig Workers

**Built for the Guidewire DEVTrails 2026 Hackathon — Phase 3**

GigShield AI is an AI-powered parametric insurance platform designed to protect gig workers such as **Zomato and Swiggy delivery partners** against income loss caused by external disruptions such as **heavy rainfall, extreme heat, and poor air quality**.

The entire experience is designed around **WhatsApp**, allowing workers to register, configure their policy, receive disruption alerts, and initiate automated claims without installing a separate application.

> **No dedicated app. No paperwork. Automated parametric claims.**

---

## 🚀 Key Features

### 💬 WhatsApp-Based Onboarding

Workers can configure their insurance policy directly through WhatsApp:

* Select city and delivery zone
* Select delivery type
* Set working hours
* Declare average daily income
* Purchase a policy
* Receive policy and claim updates

### 🌧️ Parametric Insurance

Claims are triggered automatically when predefined environmental thresholds are reached.

Supported triggers include:

* 🌧️ Heavy Rain
* 🌡️ Extreme Heat
* 🌫️ Poor Air Quality

Instead of requiring traditional claim documentation, the system evaluates predefined parameters and automatically initiates eligible claims.

### 🤖 AI-Powered Risk Assessment

The ML service evaluates worker and environmental information to generate risk-related predictions.

Current ML components include:

* Risk prediction
* Fraud detection
* Income anomaly detection

### 🚨 Automated Claims

When a qualifying trigger occurs:

```text
Environmental Event
        ↓
Trigger Evaluation
        ↓
Identify Active Policies
        ↓
Create Eligible Claims
        ↓
Process Claim
        ↓
Notify Worker
```

### 📊 Admin Dashboard

The React dashboard provides visibility into:

* Policy statistics
* Claims
* Risk zones
* Trigger events
* Worker activity
* AI-driven risk information

### 🐳 Docker Support

The complete application can be launched using Docker Compose, making local deployment easier and keeping the services isolated.

---

# 🏗️ System Architecture

```text
                         ┌──────────────────────┐
                         │   WhatsApp / Twilio  │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   Node.js Backend    │
                         │      Express.js      │
                         └──────────┬───────────┘
                                    │
                    ┌───────────────┼────────────────┐
                    │               │                │
                    ▼               ▼                ▼
             ┌────────────┐  ┌────────────┐  ┌─────────────┐
             │ PostgreSQL │  │ Cron Jobs  │  │ Python ML   │
             │ Database   │  │ Triggers   │  │ FastAPI     │
             └────────────┘  └────────────┘  └─────────────┘
                    ▲                               │
                    │                               ▼
                    │                       ┌──────────────┐
                    │                       │ Risk / Fraud │
                    │                       │ / Anomaly    │
                    │                       └──────────────┘
                    │
             ┌──────┴─────────┐
             │ React Dashboard│
             └────────────────┘

                     Guidewire Integration
                        (Simulated)
```

---

# 🧩 Project Structure

```text
GuideWire2026-main/
│
├── backend/
│   ├── routes/
│   ├── services/
│   ├── controllers/
│   └── ...
│
├── database/
│   ├── init.sql
│   └── seed.sql
│
├── frontend-dashboard/
│   └── ...
│
├── ml-service/
│   ├── main.py
│   ├── models/
│   └── ...
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

# 🛠️ Tech Stack

| Layer              | Technologies                                       |
| ------------------ | -------------------------------------------------- |
| Frontend           | React 18, Recharts                                 |
| Backend            | Node.js, Express.js, node-cron                     |
| ML Service         | Python, FastAPI, scikit-learn                      |
| ML Models          | Gradient Boosting, Isolation Forest                |
| Database           | PostgreSQL                                         |
| Messaging          | Twilio WhatsApp API                                |
| Payments           | Razorpay *(simulated in development)*              |
| Insurance Platform | Guidewire ClaimCenter + PolicyCenter *(simulated)* |
| Deployment         | Docker, Docker Compose                             |

---

# ⚙️ Quick Start

## Option 1 — Docker

### Prerequisites

Install:

* Docker
* Docker Compose

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/gigshield-ai.git
cd gigshield-ai
```

### 2. Configure environment variables

```bash
cp backend/.env.example backend/.env
```

Update the values in `backend/.env` if required.

### 3. Start the application

```bash
docker-compose up --build
```

Services will be available at:

| Service    | URL                   |
| ---------- | --------------------- |
| Backend    | http://localhost:3000 |
| ML Service | http://localhost:8000 |
| Dashboard  | http://localhost:3001 |

---

# 💻 Local Development

## Prerequisites

* Node.js
* npm
* Python 3
* PostgreSQL
* Git

---

## 1. Database Setup

Create the PostgreSQL database:

```bash
createdb gigshield
```

Initialize the schema:

```bash
psql -U postgres -d gigshield -f database/init.sql
```

Load sample data:

```bash
psql -U postgres -d gigshield -f database/seed.sql
```

> Configure your PostgreSQL credentials through environment variables rather than committing passwords to GitHub.

---

## 2. Start the ML Service

```bash
cd ml-service

python -m venv venv
```

### Windows

```bash
venv\Scripts\activate
```

### Linux / macOS

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start FastAPI:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

ML service:

```text
http://localhost:8000
```

> On first startup, the ML service may train/load the required models.

---

## 3. Start the Backend

Open another terminal:

```bash
cd backend
npm install
npm run dev
```

Backend:

```text
http://localhost:3000
```

---

## 4. Start the Dashboard

Open another terminal:

```bash
cd frontend-dashboard
npm install
npm start
```

Dashboard:

```text
http://localhost:3001
```

---

# 🧪 Testing Without Twilio

The application supports development-mode testing without requiring real Twilio credentials.

WhatsApp messages can be simulated using the backend webhook.

## Simulate WhatsApp Onboarding

### 1. Start onboarding

```bash
curl -X POST http://localhost:3000/api/whatsapp/webhook ^
  -d "From=whatsapp:+919999999999&Body=hi"
```

### 2. Select Mumbai

```bash
curl -X POST http://localhost:3000/api/whatsapp/webhook ^
  -d "From=whatsapp:+919999999999&Body=1"
```

### 3. Select Andheri

```bash
curl -X POST http://localhost:3000/api/whatsapp/webhook ^
  -d "From=whatsapp:+919999999999&Body=1"
```

### 4. Select Food Delivery

```bash
curl -X POST http://localhost:3000/api/whatsapp/webhook ^
  -d "From=whatsapp:+919999999999&Body=1"
```

### 5. Set working hours

```bash
curl -X POST http://localhost:3000/api/whatsapp/webhook ^
  -d "From=whatsapp:+919999999999&Body=9AM-9PM"
```

### 6. Set daily income

```bash
curl -X POST http://localhost:3000/api/whatsapp/webhook ^
  -d "From=whatsapp:+919999999999&Body=850"
```

### 7. Purchase policy

```bash
curl -X POST http://localhost:3000/api/whatsapp/webhook ^
  -d "From=whatsapp:+919999999999&Body=BUY"
```

### 8. Confirm payment

```bash
curl -X POST http://localhost:3000/api/whatsapp/webhook ^
  -d "From=whatsapp:+919999999999&Body=DONE"
```

---

# 🌧️ Simulate a Parametric Trigger

This is the primary automated-claims demonstration.

## Heavy Rain — Mumbai

```bash
curl -X POST http://localhost:3000/api/claims/simulate-trigger ^
  -H "Content-Type: application/json" ^
  -d "{\"city\":\"Mumbai\",\"triggerType\":\"HEAVY_RAIN\",\"value\":65}"
```

## Extreme Heat — Delhi

```bash
curl -X POST http://localhost:3000/api/claims/simulate-trigger ^
  -H "Content-Type: application/json" ^
  -d "{\"city\":\"Delhi\",\"triggerType\":\"EXTREME_HEAT\",\"value\":45}"
```

## Poor AQI — Delhi

```bash
curl -X POST http://localhost:3000/api/claims/simulate-trigger ^
  -H "Content-Type: application/json" ^
  -d "{\"city\":\"Delhi\",\"triggerType\":\"POOR_AQI\",\"value\":350}"
```

These events can automatically identify affected active policies and create eligible claims.

---

# 🤖 ML Service API

## Risk Prediction

```http
POST /predict/risk
```

Example:

```json
{
  "city": "Mumbai",
  "zone": "Andheri",
  "delivery_type": "food_delivery",
  "working_hours_start": 9,
  "working_hours_end": 21,
  "average_daily_income": 850
}
```

---

## Fraud Detection

```http
POST /predict/fraud
```

Example:

```json
{
  "user_id": "test",
  "city": "Mumbai",
  "zone": "Andheri",
  "trigger_type": "HEAVY_RAIN",
  "claim_amount": 350,
  "weekly_claim_count": 1,
  "days_since_registration": 45,
  "gps_consistency": 0.92
}
```

---

## Income Anomaly Detection

```http
POST /predict/income-anomaly
```

Example:

```json
{
  "city": "Mumbai"
}
```

---

# 📡 API Reference

| Method | Endpoint                       | Description                   |
| ------ | ------------------------------ | ----------------------------- |
| POST   | `/api/whatsapp/webhook`        | WhatsApp/Twilio webhook       |
| GET    | `/api/admin/dashboard`         | Dashboard KPIs                |
| GET    | `/api/admin/risk-zones`        | Risk zone analysis            |
| GET    | `/api/policies`                | Retrieve policies             |
| GET    | `/api/claims`                  | Retrieve claims               |
| POST   | `/api/claims/simulate-trigger` | Simulate a parametric trigger |
| POST   | `/predict/risk`                | ML risk prediction            |
| POST   | `/predict/fraud`               | ML fraud detection            |
| POST   | `/predict/income-anomaly`      | Income anomaly detection      |

---

# 🔐 Security & Configuration

Do **not** commit sensitive credentials to GitHub.

Use environment variables for:

```text
DATABASE_URL
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
JWT_SECRET
```

A `.env.example` file should contain only placeholder values.

Example:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/gigshield

TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token

RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

---

# 🎥 Demo Flow

The complete demonstration follows this flow:

```text
Worker
  │
  ▼
WhatsApp Onboarding
  │
  ▼
Select Location & Work Profile
  │
  ▼
Set Income & Working Hours
  │
  ▼
Purchase Policy
  │
  ▼
Environmental Disruption
  │
  ▼
Parametric Trigger Detected
  │
  ▼
Affected Policies Identified
  │
  ▼
Fraud / Risk Checks
  │
  ▼
Claim Automatically Created
  │
  ▼
Worker Notification
  │
  ▼
Admin Dashboard Updated
```

---

# 📊 Future Improvements

* Real-time weather API integration
* Real-time AQI integration
* Production Twilio WhatsApp integration
* Real Razorpay payment integration
* Production Guidewire integration
* GPS-based worker verification
* Advanced fraud detection
* Cloud deployment
* Automated CI/CD pipeline
* Model monitoring and retraining
* Multi-city expansion

---

# 🏆 Hackathon

**Guidewire DEVTrails 2026 — Phase 3**

GigShield AI explores how **parametric insurance, AI, automation, and conversational interfaces** can be combined to create a more accessible income-protection experience for gig workers.

---

## 👨‍💻 Team

**GigShield AI**

Built as part of the **Guidewire DEVTrails 2026 Hackathon**.

---

## ⭐ If you find this project interesting

Give the repository a ⭐ and feel free to explore the implementation.
