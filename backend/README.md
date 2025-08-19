Setup
1) cd backend
2) npm install
3) npm start

Environment
- PORT optional; defaults to 4000 with fallback to a free port if busy

Endpoints
- POST /employees { name, email, department, joiningDate }
- GET /employees
- GET /employees/:id/balance
- POST /leaves { employeeId, type, startDate, endDate, reason }
- GET /leaves[?employeeId=]
- POST /leaves/:id/approve
- POST /leaves/:id/reject

Edge Cases Handled
- Leave before joining date
- End date before start date
- Insufficient balance
- Overlapping approved leaves
- Employee not found
- Invalid dates and types
