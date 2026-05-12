# 🌌 Dash AI — AI-Powered Data Analytics Platform

Dash AI is a next-generation business intelligence platform that merges the power of **DuckDB** and **SQLModel** with an advanced **AI Orchestrator** to transform natural language into production-grade analytics. It provides a unified workspace for data ingestion, AI-driven transformations, and immersive visualizations.

---

## 🚀 Key Features

### 1. **AI Project Generator (AI Chat)**
*   **Conversational Analytics**: Describe what you want to see (e.g., *"Show me sales trends by region"*), and the AI will automatically build a complete dashboard.
*   **Real-time Logic**: Uses LLMs (Groq/Gemini) to analyze schemas and generate KPI cards and charts dynamically.

### 2. **Universal Data Connector**
*   **Hybrid Ingestion**: Supports drag-and-drop for **CSV/Excel** and direct connections to **SQL Server, PostgreSQL, and MySQL**.
*   **DuckDB Integration**: Uses an in-memory OLAP engine for lightning-fast querying on large datasets.

### 3. **Smart ETL (Data Transformation)**
*   **Natural Language ETL**: Perform complex data cleaning and filtering using plain text commands.
*   **Live Preview**: Instantly see the results of your transformations in a high-performance data grid.

### 4. **Advanced Analytics Suite**
*   **Interactive Visuals**: Premium Bar, Line, Pie, and Area charts powered by **Apache ECharts**.
*   **Relationship Explorer**: Interactive ER diagrams using **React Flow** to visualize database schemas.
*   **Predictive Forecasting**: Project future trends using statistical modeling.
*   **What-If Simulation**: Use interactive sliders to model business scenarios and see immediate impact on KPIs.

### 5. **Sharing & Presentation**
*   **Public Dashboards**: Generate unique, read-only URLs for professional presentation.
*   **Theme Engine**: Sleek Light and Premium Dark modes with smooth transitions.

---

## 🛠️ Technology Stack

### **Frontend**
- **Core**: React 19, TypeScript, Vite 8.
- **Styling**: Tailwind CSS v4 (Glassmorphism & modern UI tokens).
- **Visuals**: Apache ECharts, Recharts, Framer Motion (animations), React Flow.
- **State**: TanStack Query (React Query).

### **Backend**
- **Framework**: FastAPI (Asynchronous Python).
- **ORM**: SQLModel (Pydantic + SQLAlchemy).
- **Engine**: DuckDB (Analytical/OLAP).
- **AI**: Groq (Llama 3), Google Gemini 1.5.
- **Data**: Pandas, OpenPyXL.

---

## ⚙️ Quick Start (Windows)

The easiest way to get started is to use the automated startup script:

1.  Open the project folder.
2.  Double-click **`run.bat`**.
3.  The script will automatically set up the virtual environment, install dependencies, and launch both servers.
4.  Open your browser to: **`http://localhost:5173`**

---

## 🛠️ Manual Installation

### 1. Prerequisites
*   **Python 3.10+**
*   **Node.js 18+**
*   **API Keys**: Groq and Google Gemini.

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🔑 Configuration (`.env`)

Ensure you have a `.env` file in the `backend/` directory:

```env
GROQ_API_KEY="your_groq_key"
GEMINI_API_KEY="your_gemini_key"
DATABASE_URL="postgresql://user:password@host:port/dbname"
API_V1_STR="/api/v1"
PROJECT_NAME="Dash AI"
```

---

## 🏗️ Architecture Design

1.  **Analytical Layer**: DuckDB handles the heavy lifting for data processing, providing sub-second query response times.
2.  **Intelligence Layer**: AI models (Groq/Gemini) act as the bridge between user intent and SQL execution.
3.  **Persistence Layer**: SQLModel with PostgreSQL manages metadata, projects, and user configurations.

---
*Built with ❤️ by the Dash AI Team*
