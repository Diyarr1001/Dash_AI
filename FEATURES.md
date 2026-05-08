# 🚀 Dash AI: Platform Feature Documentation

Welcome to the comprehensive guide to **Dash AI**. This document outlines every core feature, its naming in the user interface, the design philosophy, and the underlying technical implementation.

---

## 1. Project Portfolio
*   **UI Name**: `Dashboards`
*   **Design**: A sleek, grid-based layout using high-fidelity cards. Each card displays the dashboard title, description, and "Quick Action" buttons for viewing or deleting.
*   **How it Works**: Fetches all saved dashboard projects from the backend API (`/dashboards/`). It serves as the primary navigation hub for users to manage their analytical assets.

## 2. Universal Data Connector
*   **UI Name**: `Get Data` / `Data Sources`
*   **Design**: A sophisticated multi-step modal with glassmorphism effects. It categorizes connectors into "Local Files" (CSV/Excel) and "Database Connections" (SQL Server, PostgreSQL, MySQL).
*   **How it Works**: 
    *   **Files**: Uses a drag-and-drop interface (`FileUploader`) to send files to the backend for ingestion into an in-memory DuckDB instance.
    *   **Databases**: Connects via ODBC or native drivers to enterprise databases, allowing users to select specific tables for analysis.

## 3. AI Project Generator
*   **UI Name**: `AI Chat`
*   **Design**: An immersive, full-screen chat interface where users interact with "Dash AI." It uses a clean message-bubble design with real-time streaming feedback.
*   **How it Works**: Users describe what they want to see (e.g., "Show me sales trends by region"). The AI analyzes the data schema and automatically generates a complete dashboard with KPI cards and charts using LLM-powered logic.

## 4. Live Analytics & Schema Explorer
*   **UI Name**: `Analytics`
*   **Design**: A data-dense workspace featuring active model labels, SQL preview badges, and interactive data tables.
*   **How it Works**: Provides a direct view into the connected dataset. It displays the **Detected Schema** (column names, types, nullability) and a **Data Preview** (first 10 rows) using high-performance grid rendering.

## 5. Smart ETL (Data Transformation)
*   **UI Name**: `Transform` (within Analytics)
*   **Design**: An AI-powered input field integrated directly above the data preview.
*   **How it Works**: Allows users to perform complex data cleaning and transformation using natural language (e.g., "Filter for sales above 5000 and group by month"). The backend translates these requests into SQL queries executed on the fly.

## 6. Interactive Dashboard Engine
*   **UI Name**: `Dashboard View`
*   **Design**: A dynamic, responsive layout featuring:
    *   **KPI Cards**: Large-format numeric displays for critical metrics.
    *   **Visual Charts**: High-quality Bar, Line, Pie, and Area charts using **Recharts**.
    *   **AI Insights**: Contextual observations generated automatically for each chart.
*   **How it Works**: Re-executes saved SQL queries in real-time to ensure data is always fresh. Supports drag-and-drop reordering for personalized layouts.

## 7. Public Dashboard Sharing
*   **UI Name**: `Shared Dashboard`
*   **Design**: An ultra-clean, full-screen presentation mode. It strips away all application sidebars, headers, and interactive "clutter" to focus purely on the data.
*   **How it Works**: Generates a unique URL with a `project_id` parameter. When accessed, the application bypasses authentication and enters a dedicated **Read-Only Mode**, protecting the dashboard from unauthorized edits while providing a professional report view.

## 8. Relationship Explorer (ER Diagram)
*   **UI Name**: `ER Diagram`
*   **Design**: An interactive node-link diagram using **React Flow**. Tables are represented as nodes, and primary/foreign key relationships are visualized as curved connectors.
*   **How it Works**: Scans the database metadata to automatically map out table relationships. Users can move nodes around to better understand complex enterprise data schemas.

## 9. Predictive Forecasting
*   **UI Name**: `Forecast` (within Analytics)
*   **Design**: Features a dedicated input bar for selecting time-series columns and target metrics.
*   **How it Works**: Uses statistical modeling to predict future data points. It visualizes the historical data alongside the predicted forecast, including confidence intervals.

## 10. What-If Simulation
*   **UI Name**: `What-If Analysis` (within Analytics)
*   **Design**: Interactive slider controls for key metrics.
*   **How it Works**: Allows users to simulate "What-If" scenarios (e.g., "What if revenue increases by 10%?"). It dynamically updates existing charts and KPIs to show the projected impact of changes.

## 11. Theme Engine & Modern UX
*   **UI Name**: `Sun/Moon Toggle` (Sidebar)
*   **Design**: Support for both **Sleek Light** and **Premium Dark** modes. The design uses CSS variables to ensure a smooth, animated transition between themes.
*   **How it Works**: Persists the user's preference in `localStorage`. Uses Tailwind-integrated custom tokens to ensure consistent aesthetics across all 30+ custom UI components.

---

*Generated by Dash AI Documentation Engine*
