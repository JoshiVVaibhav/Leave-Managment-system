High Level Design

Actors:
- Employee: applies for leave, views status
- HR/Admin: adds employees, approves/rejects leave, views balances

Architecture:
- Frontend: Single-page HTML/JS (could be React in future)
- Backend: Node.js + Express
- Database: JSON file (data.json) for MVP; can be replaced by MongoDB/Postgres

Data Flow:
- Frontend submits JSON to REST endpoints
- Backend validates edge cases and writes to storage
- On approval, backend deducts balance and persists

APIs:
- POST /employees
- GET /employees
- GET /employees/:id/balance
- POST /leaves
- GET /leaves?employeeId=
- POST /leaves/:id/approve
- POST /leaves/:id/reject

Edge Cases:
- Leave before joining date → reject
- End date before start date → reject
- Overlapping with approved leaves → reject
- Exceeding balance → reject
- Employee not found → 404
- Invalid type → reject

Scaling 50 → 500:
- Replace JSON with managed DB (Postgres/Mongo)
- Add indexes on employeeId, status, date ranges
- Use a service layer and repository pattern
- Add caching for balances (Redis)
- Add auth (JWT) and RBAC for HR vs Employee
- Add background jobs for notifications
- Containerize with Docker; deploy on Render/Heroku; CDN for frontend
