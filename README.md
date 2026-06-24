# Token-Based Budget Planning Estimator & Visualization Tool

This repository now includes a lightweight token budget planning tool for teams and individual developers.
Existing infrastructure folders (`azure/`, `gke/`) and prior platform assets remain available for deployment-oriented workflows.

## Project Overview
The estimator supports token-first budgeting workflows and optional currency conversion, plus forecasting and visual dashboards for quick decision-making.

## Implemented Features
- **Token-Based Budgeting:** Allocate budgets by token units and convert using an optional token-to-currency rate.
- **Budget Estimation:** Run what-if forecasting (daily spend over N days) with threshold alerts.
- **Visualization Dashboard:** Pie, bar, and line charts, plus a flow-style allocation view.
- **User Management:** Built-in demo authentication with role behavior (`admin` vs `viewer`).
- **Import/Export:** Export and import budget plans in JSON.
- **API Integration (Optional):** Pull allocation data from an external JSON endpoint.

## Quick Start
1. From repository root, start a local server (for CDN/script compatibility), for example:
   - `python -m http.server 8080`
2. Open `http://localhost:8080/token-budget-estimator.html` in a browser.
3. Sign in with any username and choose role (`admin` or `viewer`).
4. Enter total tokens, add allocations, and run forecasting.
5. Use **Export JSON** / **Import JSON** for data portability.

## Installation Notes
If you want to host this tool via a backend stack:
- Node.js/Express or Python (Flask/Django/FastAPI)
- PostgreSQL/MySQL/MongoDB
- React/Vue/Angular frontend (optional migration path)
- Charting libraries such as D3.js, Plotly, or Chart.js

For this repository implementation, the MVP is delivered as a standalone HTML tool using Chart.js.
