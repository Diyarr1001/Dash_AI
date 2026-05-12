# 🌌 Dash AI: Complete Project Overview

Dash AI is a cutting-edge **Business Intelligence (BI) and Data Analytics platform** that leverages Artificial Intelligence to simplify data exploration, transformation, and visualization. It bridges the gap between raw data and actionable insights by allowing users to interact with their datasets using natural language.

---

## 🚀 1. Core Features

### **A. AI-Powered Interaction**
*   **Conversational Dashboards**: Users can describe the insights they need (e.g., *"Show me revenue by product category for the last quarter"*), and Dash AI automatically generates the SQL, fetches the data, and renders the appropriate charts.
*   **Project Generator**: A specialized mode that can build entire multi-chart dashboards from a single text prompt.
*   **Smart SQL Generation**: Uses LLMs (Llama 3 via Groq or Google Gemini) to write complex SQL queries, specifically optimized for DuckDB syntax.

### **B. Universal Data Connector**
*   **File Uploads**: Supports **CSV** and **Excel** (`.xlsx`) files.
*   **External Databases**: Connects directly to **PostgreSQL, MySQL, and SQL Server**.
*   **Google Sheets**: Allows users to import data directly from a public Google Sheets URL.
*   **DuckDB Engine**: All ingested data is registered into an in-memory DuckDB instance for lightning-fast analytical processing.

### **C. Advanced Analytics Suite**
*   **Dynamic Visualizations**: Premium, interactive charts (Bar, Line, Pie, Area, Scatter) powered by **Apache ECharts**.
*   **ER Diagram Explorer**: Automatically visualizes database schemas and relationships using **React Flow**.
*   **Predictive Forecasting**: Statistical modeling to project future data points based on historical trends.
*   **What-If Simulation**: Interactive sliders that allow users to model different business scenarios (e.g., *"What if sales increase by 10%?"*) and see immediate impacts on KPIs.

### **D. Data Governance & Sharing**
*   **Natural Language ETL**: Clean, filter, and transform data using plain English commands (e.g., *"Remove rows where profit is negative"*).
*   **Public Dashboard Sharing**: Generate secure, read-only URLs to share insights with external stakeholders without requiring them to log in.
*   **Secure Authentication**: JWT-based user authentication and secure storage for project metadata.

---

## 🛠️ 2. Technology Stack

Dash AI is built with a modern, high-performance stack designed for scale and speed.

### **Frontend (The Interface)**
*   **Framework**: React 19 (Latest features)
*   **Build Tool**: Vite 8 (Ultra-fast development)
*   **Language**: TypeScript (Type safety)
*   **Styling**: Tailwind CSS v4 (Glassmorphism, modern design tokens)
*   **Visuals**: Apache ECharts, React Flow (ER Diagrams), Framer Motion (Animations)
*   **State Management**: TanStack Query (React Query) for efficient data fetching.

### **Backend (The Brain)**
*   **Framework**: FastAPI (High-performance asynchronous Python)
*   **Analytical Engine**: **DuckDB** (The "Heart" — handles all data querying and processing)
*   **ORM**: SQLModel (Combines Pydantic and SQLAlchemy for metadata management)
*   **Data Processing**: Pandas, OpenPyXL (Excel processing)

### **Intelligence (The AI)**
*   **Primary LLM**: **Google Gemini 2.0 Flash** (Used for complex structural tasks)
*   **Secondary/Speed LLM**: **Groq (Llama 3.3)** (Used for rapid SQL generation and chart mapping)

---

## 🔄 3. How It Works (The Workflow)

1.  **Ingestion**: When a user uploads a file or connects a DB, the backend uses `db_manager.py` to register the source as a table in **DuckDB**.
2.  **Deep Scan (Context Injection)**: To prevent AI hallucinations, the system performs a "Deep Scan" of the data. It collects column names, data types, and statistical samples (min, max, unique counts).
3.  **Prompt Engineering**: The user's natural language query is combined with the **Deep Scan Context** and sent to the AI (Groq/Gemini).
4.  **SQL Execution**: The AI returns raw SQL. The backend executes this SQL against DuckDB. Because DuckDB is in-memory and columnar, even queries on millions of rows return in milliseconds.
5.  **Chart Mapping**: A second AI pass determines the best visualization type (e.g., if the data has a 'Date' column and a 'Numeric' column, it suggests a Line Chart).
6.  **Rendering**: The frontend receives the data and the chart configuration, rendering it instantly via ECharts.

---

## 📂 4. Project Structure & Linking

### **Backend (`/backend`)**
*   `app/main.py`: The entry point for the FastAPI server.
*   `app/api/v1/endpoints/`: Contains the logic for Data Ingestion, Analytics, Querying, and Auth.
*   `app/services/database.py`: Manages the DuckDB instance and external DB connections.
*   `app/services/ai.py`: Handles communication with Groq and Gemini.

### **Frontend (`/frontend`)**
*   `src/App.tsx`: The main orchestrator that manages the application state (active project, current view, sidebar).
*   `src/components/`: Modular components for each feature (e.g., `ChartContainer`, `ERDiagramView`, `WhatIfAnalysis`).
*   `src/lib/`: Utility functions and API clients.

### **Linking**
*   The **Frontend** communicates with the **Backend** via a RESTful API.
*   The **Backend** acts as a gateway between the **User UI**, the **AI Models**, and the **DuckDB Engine**.
*   **Metadata** (Project names, descriptions, chart configs) is stored in a persistent SQLite/Postgres DB using **SQLModel**.
*   **Actual Data** for analysis is managed in the ephemeral/high-speed **DuckDB** engine.

---

*Documentation prepared for Dash AI - Version 1.0*
