# AI-Powered ER Diagram Generator

The goal is to implement an intelligent ER Diagram visualizer that maps relationships across all tables in a connected database or multi-sheet Excel file.

## User Review Required

Because Excel files and some databases lack explicit Foreign Key constraints, I propose using an **AI-driven relationship inference engine**. Instead of writing complex SQL for every database dialect, we will send the full schema to Gemini (our AI). The AI will intelligently infer the logical relationships between tables based on column names (e.g., `employee_id` links to `Employees.id`) and return a structured relationship graph. 

We will visualize this graph using the industry-standard **React Flow** library, providing a beautiful, interactive, draggable canvas.

Please review the proposed architectural changes below and confirm if you approve.

## Proposed Changes

### 1. Frontend Infrastructure
- Install `reactflow` for rendering the interactive node-based canvas.
- Add "ER Diagram" to the main sidebar navigation in `App.tsx`.

#### [NEW] `frontend/src/components/ERDiagramView.tsx`
- A dedicated React Flow component.
- Implements custom nodes to display table names alongside their column lists (similar to modern database tools like Prisma Studio or dbdiagram.io).
- Handles API loading states and diagram layout logic.

#### [MODIFY] `frontend/src/App.tsx`
- Add the `ER Diagram` icon to the sidebar.
- Route the new tab to the `ERDiagramView` component, passing the `currentDataset.tables` context.

---

### 2. Backend Intelligence
- Add a dedicated AI endpoint to generate the semantic relationship graph.

#### [NEW/MODIFY] `backend/app/api/v1/endpoints/project.py`
- Create a new endpoint `POST /api/v1/project/er-diagram`.
- Loop through the active database alias and run `DESCRIBE {table}` for all tables.
- Aggregate the full multi-table schema into a structured prompt.
- Instruct Gemini to analyze the schema and return a strict JSON payload containing `nodes` (tables) and `edges` (foreign key relationships).

## Verification Plan

### Automated/Manual Testing
1. Connect the `AdventureWorks` SQL Server database.
2. Click the new "ER Diagram" sidebar tab.
3. Verify that the frontend successfully calls the backend, the AI correctly identifies the complex relationships (e.g., `SalesOrderHeader` to `SalesOrderDetail`), and the React Flow canvas renders an interactive, draggable network of tables.
4. Upload a multi-sheet Excel file and verify the AI successfully guesses the logical relationships between the sheets based on column names.
