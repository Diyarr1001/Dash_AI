# 🚀 Dash AI: Feature Manifest

Dash AI is a professional-grade, AI-powered analytical platform designed to transform raw data into high-impact business intelligence through natural language.

---

## 🧠 Core AI & Analytical Features

### 1. Senior Data Consultant Framework
*   **Intent Deconstruction**: The AI acts as a Senior Data Consultant, breaking down simple prompts into sophisticated business strategies.
*   **Strategic Planning**: Automatically selects high-impact KPIs and diverse visualizations (Line, Heatmap, Scatter, etc.) based on analytical goals.
*   **Context-Aware Reasoning**: Every chart includes AI-generated insights explaining *why* the data matters for business decisions.

### 2. Deep Statistical Data Profiling
*   **Full-Table Deep Scan**: Unlike typical tools that sample data, Dash AI performs a 100% scan of the entire dataset.
*   **Master Data Profile**: Calculates Ground Truth statistics (Min, Max, Avg, Unique Counts, and Top Distributions) for every column before generation.
*   **Statistical Precision**: Ensures KPIs and charts are numerically accurate and perfectly aligned with the entire dataset.

### 3. Smart SQL Engine
*   **DuckDB Optimization**: Generates high-performance SQL tailored for the DuckDB engine.
*   **Strict Data Realism**: AI uses the Master Data Profile to ensure filters and categories exactly match your actual data (no hallucinations).
*   **Complex Aggregations**: Automatically handles time-series trends, categorical distributions, and complex groupings.

---

## 📊 Advanced Analytics & Visualization

### 4. Predictive Forecasting
*   **Linear Trend Projection**: Predict future values based on historical data.
*   **Granular Time Slicers**: Dedicated filters for **Year, Month, and Day** to slice historical baselines before forecasting.
*   **Interactive Management**: Standalone **Refresh** and **Reset** controls for rapid analytical iteration.

### 5. Dynamic Dashboard Management
*   **Conversational Updates**: Use the AI Command Bar to modify, add, or refine charts using natural language.
*   **Drag-and-Drop Reordering**: Fully interactive layout management using `framer-motion`.
*   **Portfolio System**: Save and re-open projects to continue your analysis at any time.

---

## 🛠️ Technical Resilience & UX

### 6. Multi-Tier AI Fallback System
*   **Provider Diversity**: Integrated support for **Google Gemini 2.0** and **Groq (Llama 3.3 70B)**.
*   **Automatic Fallback**: Smartly switches to secondary models (Mixtral, Llama 8B) if primary models are rate-limited or exhausted.
*   **Exponential Backoff**: Gracefully handles 429 Rate Limit errors with automatic retries.

### 7. Premium UI/UX Design
*   **Glassmorphic Interface**: A state-of-the-art visual design with smooth gradients, transparency, and modern typography.
*   **Responsive Layouts**: Optimized for both deep desktop analysis and quick mobile reviews.
*   **Safety-First Rendering**: Strict string-sanitization wrappers to prevent UI crashes from malformed AI responses.

### 8. Data Pipeline
*   **Multi-Format Support**: Seamlessly ingest CSV, Excel (.xlsx, .xls), and Parquet files.
*   **Transformation Visuals**: Real-time feedback on data cleaning and ingestion status.
*   **Local Processing**: High-speed local database execution for maximum privacy and performance.

---

## 🗺️ Technical Implementation Map

If you want to modify or study these features, here is exactly where they live in your codebase:

| Feature | Code Location (File) | Function / Component |
| :--- | :--- | :--- |
| **Senior Data Consultant** | `backend/app/services/ai.py` | `generate_project_plan` |
| **Full-Table Deep Scan** | `backend/app/api/v1/endpoints/project.py` | `generate_full_project` |
| **Master Data Profile** | `backend/app/api/v1/endpoints/project.py` | Statistics loop (min/max/avg) |
| **Smart SQL Engine** | `backend/app/services/ai.py` | `generate_sql` |
| **Predictive Forecasting** | `backend/app/api/v1/endpoints/analytics.py` | `generate_forecast` |
| **Time Slicers (UI)** | `frontend/src/components/ForecastView.tsx` | `Slicers Row` & `fetchYears` |
| **AI Command Bar (Updates)** | `backend/app/api/v1/endpoints/project.py` | `update_project` |
| **Multi-Tier AI Fallback** | `backend/app/services/ai.py` | `_call_ai` (Retry/Fallback logic) |
| **Concurrency Control** | `backend/app/api/v1/endpoints/project.py` | `asyncio.Semaphore(2)` |
| **Safety-First Rendering** | `frontend/src/components/DashboardView.tsx` | `typeof object ? JSON.stringify : String()` |
| **Premium Design System** | `frontend/src/index.css` | `.glass` and CSS Variable tokens |
| **Data Ingestion Pipeline** | `backend/app/services/database.py` | `load_file_to_duck` |

---
*Created and maintained by the Dash AI Development Team.*
