# Lead-to-Deal CRM

## Modules Completed
- **Module 1**: Authentication + Role-Based Routing
- **Module 2**: Salesperson Dashboard
- **Module 3**: Lead Capture & Pipeline Management
- **Module 4**: Event Stream & Activity Timeline
- **Module 5**: Dynamic Lead Scoring Engine
- **Module 6**: Intent Detection & Momentum Intelligence

---

## Quick Start
```bash
# Backend (http://localhost:5000)
cd backend && npm install && npm run dev

# Frontend (http://localhost:5173)
cd frontend && npm install && npm run dev
```

---

## Module 3 – Lead Capture
Salespersons can capture, search, filter, and review prospective leads in their pipeline.

### Salesperson Routes:
- `/sales` – Salesperson Dashboard
- `/sales/leads` – Leads Pipeline list with search and source/stage filtering
- `/sales/leads/new` – Clean 10-field Lead Capture form with validation
- `/sales/leads/:id` – Detailed Lead View with KPIs and Activity Timeline

---

## Module 4 – Event Stream & Activity Timeline
Every lead features a live activity stream and timeline tracking customer interactions.

### Supported Event Types:
1. Website Visit
2. Email Sent
3. Email Opened
4. Email Replied
5. Call
6. Meeting
7. Demo
8. Content Download
9. Pricing Page Visit
10. Contact Form Submitted

### Timeline Features:
- **Add Event Modal**: Log events with date/time picker (defaulted to current local time) and description.
- **Chronological Ordering**: Newest events displayed first.
- **Activity Summary Bar**: Total Activities count, Last Activity date/time, and Last Activity Type.
- **Timeline Filters**: Filter by `All`, `Website`, `Email`, `Calls`, `Meetings`, `Demo`, and `Other`.
- **Persistence**: Event data is stored in `backend/src/data/events.json`.

---

## Module 5 – Dynamic Lead Scoring Engine
The lead score updates automatically whenever engagement events are recorded on the lead.

### Scoring Model:
| Event Type | Score Impact |
| :--- | :--- |
| Website Visit | +5 |
| Email Sent | +2 |
| Email Opened | +5 |
| Email Replied | +15 |
| Call | +10 |
| Meeting | +15 |
| Demo | +20 |
| Content Download | +8 |
| Pricing Page Visit | +12 |
| Contact Form / Submitted | +15 |

### Scoring Engine Guarantees:
- **Server-Side Exclusivity**: Calculated entirely in the backend; cannot be tampered with or directly set by the client.
- **Initial Score**: Every newly captured lead starts with `Score = 0`.
- **Strict Bounds**: Score is strictly capped between `0` and `100` (never negative, max 100).
- **Audit Trail (Score History)**: Every adjustment writes a persistent audit record with previous score, new score, delta points, and timestamp.
- **Real-Time UI**: Lead Details page dynamically updates score number, visual colored progress bar, and score history without a page reload.
- **Duplicate Protection**: Guard against rapid double-clicks on event submission.

### Backend Endpoints:
- `GET /api/salesperson/leads/:id/events` – Retrieve all events and activity summary for lead
- `GET /api/salesperson/leads/:id/events/latest` – Retrieve most recent event for lead
- `POST /api/salesperson/leads/:id/events` – Log an event, calculate score delta, update lead score, and create score history
- `GET /api/salesperson/leads/:id/score-history` – Retrieve score adjustment history and current score

---

## Module 6 – Intent Detection & Momentum Intelligence
Lead Intent and Engagement Momentum are calculated autonomously using deterministic backend rules based on lead scores and event timestamps.

### Intent Detection Rules:
| Score Range | Intent Level | Interpretation |
| :--- | :--- | :--- |
| **0 – 24** | **Low** | Early discovery phase or minimal touchpoints |
| **25 – 49** | **Medium** | Active content consumption or preliminary interest |
| **50 – 74** | **High** | Strong purchase-related activity (demos, pricing visits, replies) |
| **75 – 100** | **Very High** | High commercial commitment across multiple channels |

- **Deterministic Intent Explanations**: Generated automatically from specific event touchpoints (e.g., *"High intent because the lead has recently replied to an email, visited the pricing page, requested a demo."*).
- **Salesperson Safeguard**: Intent cannot be manually edited by the user; updates automatically whenever score changes.

### Momentum Intelligence Rules:
- **Configurable Activity Window**: `RECENT_ACTIVITY_WINDOW_HOURS = 48`
- **Levels**:
  - **Rising**: $\ge 2$ events logged within the 48-hour window.
  - **Stable**: Baseline activity (new leads with 0 events, or 1 event within window).
  - **Falling**: Leads with prior events but zero activity within the 48-hour window.
- **Deterministic Momentum Explanations**: Human-readable breakdown of recent activity trends (e.g., *"Engagement is increasing because the lead requested a demo, visited the pricing page recently."* or *"Engagement is falling because there has been no recent activity."*).
- **Persistence & Change Tracking**: Stored on the lead with `previousMomentum` and `momentumChangedAt` timestamps.

### Leads Pipeline Updates:
- **Columns**: Added **Momentum** column with directional badges (`↗ Rising`, `→ Stable`, `↘ Falling`).
- **Filters**: Added **Intent** filter (`All Intents`, `Low`, `Medium`, `High`, `Very High`) and **Momentum** filter (`All Momentum`, `Rising`, `Stable`, `Falling`).

---

## Demo Accounts
- **Customer**: `customer@demo.com` / `customer123` &rarr; `/customer`
- **Salesperson**: `sales@demo.com` / `sales123` &rarr; `/sales`
