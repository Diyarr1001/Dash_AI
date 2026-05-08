# Dash AI — AI-Powered Data Analytics Platform

Dash AI is a next-generation business intelligence platform that merges the power of DuckDB and SQLModel with an advanced AI Orchestrator to transform natural language into production-grade analytics.

---

### 📖 [Explore All Features](FEATURES.md)

---

## 🚀 Quick Start (Windows)

The easiest way to get started is to use the automated startup script:

1.  Open the project folder.
2.  Double-click **`run.bat`**.
3.  The script will automatically:
    *   Create a Python virtual environment.
    *   Install all Backend & Frontend dependencies.
    *   Launch both servers in separate windows.
4.  Open your browser to: **`http://localhost:5173`**

---

## 🛠️ Manual Installation

### 1. Prerequisites
*   **Python 3.10+**
*   **Node.js 18+** (with npm)
*   **API Keys**: Groq and Google Gemini keys.

### 2. Backend Setup
Navigate to the `backend` directory:
```bash
cd backend
# Create virtual environment
python -m venv venv
# Activate it
source venv/bin/activate  # On Windows: venv\Scripts\activate
# Install dependencies
pip install -r requirements.txt
# Run server
uvicorn app.main:app --reload
```
*API will be available at `http://localhost:8000`*

### 3. Frontend Setup
Navigate to the `frontend` directory:
```bash
cd frontend
# Install dependencies
npm install
# Run development server
npm run dev
```
*UI will be available at `http://localhost:5173`*

---

## ⚙️ Configuration (`.env`)

Ensure you have a `.env` file in the `backend/` directory with the following content:

```env
GROQ_API_KEY="your_groq_key"
GEMINI_API_KEY="your_gemini_key"
DATABASE_URL="postgresql://user:password@host:port/dbname"
API_V1_STR="/api/v1"
PROJECT_NAME="Dash AI"
```

---

## 🌟 Features to Explore

1.  **Smart Ingestion**: Drag and drop a CSV/Excel in the Dashboard tab.
2.  **AI ETL**: Describe data changes in plain text (e.g., *"Filter for values > 100"*).
3.  **Prompt Mode**: In the **AI Chat** tab, type *"Build a sales dashboard"* to generate a full project.
4.  **Portfolio**: Save your AI projects and view them in the **Dashboards** tab.
5.  **Analytics**: Use the **Forecasting** and **What-If** sliders to predict future business impact.

---

## 🏗️ Technology Stack
*   **Frontend**: React, TypeScript, Tailwind CSS v4, Apache ECharts.
*   **Backend**: FastAPI, SQLModel (PostgreSQL), DuckDB (OLAP Engine).
*   **AI**: Groq (Llama 3), Google Gemini 1.5.
