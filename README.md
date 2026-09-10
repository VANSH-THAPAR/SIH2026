# AI-Powered SIF Precursor Detection & Risk Intelligence Software

This application converts OIL HSE/HSSE safety reports into structured safety intelligence, providing AI-powered insights into Serious Injury and Fatality (SIF) potential.

## Architecture

- **Backend**: FastAPI, SQLAlchemy (Core), pgvector, Python 3.12+
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, React Query
- **Database**: Neon PostgreSQL

### Read-Only Data Policy
This application uses a real Neon PostgreSQL database as its source of truth. The following core tables are treated as **immutable (READ-ONLY)** to preserve historical integrity:
- `sif_reports`
- `report_analysis`
- `report_embeddings`
- `report_barriers`
- `report_rules`
- `barriers`
- `life_saving_rules`

The application augments this data by automatically creating stateful, additive tables for application-specific interactions (e.g. `incident_actions`, `incident_comments`, `activity_log`, etc.).

## Running the Application

### 1. Start the Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # (or venv\Scripts\activate on Windows)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Backend will be running at [http://localhost:8000/api/health](http://localhost:8000/api/health). API docs at [http://localhost:8000/docs](http://localhost:8000/docs).

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
The frontend will proxy `/api` requests to `localhost:8000` via `vite.config.ts`.

## Features
1. **Command Center**: High-level KPIs, SIF distribution, facility risk trends.
2. **Incident Board**: Kanban board with drag-and-drop prioritization.
3. **Incident Intelligence Workspace**: 9-tab deep dive with AI analysis, SIF assessment, causal chain, and what-if escalation graphs.
4. **Safety Memory**: Vector-based semantic search to find similar precursors using natural language.
5. **Pattern Intelligence**: Graphical visualization of incident clusters.
6. **Action Management**: Track HSE interventions and verify closure.
