# AgentFM App

AgentFM (Agent Facilities Management) is a **full-stack Facilities Management and Services Marketplace platform**.  
It combines a **React + Vite frontend** with a **Node.js + Express + Prisma backend**, providing a single system to manage properties, units, inspections, jobs, recommendations, plans, subscriptions, and reporting.

---

## 🌍 Purpose & Mission

The mission of AgentFM is to **simplify facilities and property management** by offering:

- A **unified platform** for properties, inspections, jobs, and maintenance plans.  
- **Real-time dashboards** and reporting for decision-making and compliance.  
- **Streamlined collaboration** between contractors, engineers, and clients.  
- A foundation for growth with modules like subscriptions, recommendations, notifications, and analytics.  

👉 **Goal:** reduce administrative overhead, improve compliance, and give teams a clear operational overview of their portfolio.

---

## 📂 Project Structure


---

## ⚙️ Requirements

- **Node.js** v18 or later
- **npm**
- **PostgreSQL** database (for backend)

---

## 🛠️ Troubleshooting "Failed to fetch" errors

If the signup or login forms show a "Failed to fetch" error, it means the browser could not reach the backend API. Work through the following checks:

1. **Confirm the backend is running**
   - In a terminal, run `npm run dev` inside the `backend/` directory.
   - You should see `✅ AgentFM backend listening on port 3000`.
   - From another terminal you can verify the server responds with: `curl http://localhost:3000/health`.

2. **Ensure the frontend knows where to send requests**
   - Create `frontend/.env` if it does not exist and set `VITE_API_BASE_URL` to the backend URL, e.g. `http://localhost:3000` for a local setup.
   - Restart the Vite dev server after editing the `.env` file so the change takes effect.

3. **Check the browser console for CORS or mixed-content warnings**
   - Open the browser DevTools (F12), look at the **Console** tab, and try the action again.
   - If you see mixed-content errors when running inside Codespaces/Gitpod, update `VITE_API_BASE_URL` to the HTTPS preview URL shown for port 3000 (e.g. `https://<id>-3000.app.github.dev`).

These steps address the most common causes and should help narrow down any remaining issues.
