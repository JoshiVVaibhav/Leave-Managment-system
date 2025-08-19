const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const dbPath = path.join(__dirname, "data.json");

function load() {
  if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ employees: [], leaves: [], seq: { employeeId: 1, leaveId: 1 } }, null, 2));
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function save(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function dayDiffInclusive(a, b) {
  const ms = new Date(b).setHours(0,0,0,0) - new Date(a).setHours(0,0,0,0);
  return Math.floor(ms / 86400000) + 1;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  const s1 = new Date(aStart).setHours(0,0,0,0);
  const e1 = new Date(aEnd).setHours(0,0,0,0);
  const s2 = new Date(bStart).setHours(0,0,0,0);
  const e2 = new Date(bEnd).setHours(0,0,0,0);
  return s1 <= e2 && s2 <= e1;
}

app.get("/", (req, res) => {
  res.send(`<div style="font-family:Inter,Arial;padding:28px;max-width:920px;margin:auto">
  <h1 style="margin:0 0 8px"> Mini Leave Management System</h1>
  <p style="margin:0 0 12px;color:#444">Backend is running</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div style="padding:12px;border:1px solid #eee;border-radius:12px">
      <h3 style="margin:0 0 8px">Employees</h3>
      <code>POST /employees</code><br/>
      <code>GET /employees</code><br/>
      <code>GET /employees/:id/balance</code>
    </div>
    <div style="padding:12px;border:1px solid #eee;border-radius:12px">
      <h3 style="margin:0 0 8px">Leaves</h3>
      <code>POST /leaves</code><br/>
      <code>GET /leaves?employeeId=</code><br/>
      <code>POST /leaves/:id/approve</code><br/>
      <code>POST /leaves/:id/reject</code>
    </div>
  </div>
  <p style="margin-top:14px">Open <b>frontend/index.html</b> to use the UI.</p>
</div>`);
});

app.post("/employees", (req, res) => {
  const db = load();
  const { name, email, department, joiningDate } = req.body;
  if (!name || !email || !department || !joiningDate) return res.status(400).json({ error: "Invalid input" });
  if (db.employees.find(e => e.email.toLowerCase() === email.toLowerCase())) return res.status(409).json({ error: "Employee already exists" });
  const emp = {
    id: db.seq.employeeId++,
    name,
    email,
    department,
    joiningDate: new Date(joiningDate),
    leaveBalance: { casual: 12, sick: 8, earned: 0 }
  };
  db.employees.push(emp);
  save(db);
  res.json(emp);
});

app.get("/employees", (req, res) => {
  const db = load();
  res.json(db.employees);
});

app.get("/employees/:id/balance", (req, res) => {
  const db = load();
  const emp = db.employees.find(e => e.id === Number(req.params.id));
  if (!emp) return res.status(404).json({ error: "Employee not found" });
  res.json({ id: emp.id, name: emp.name, email: emp.email, balance: emp.leaveBalance });
});

app.post("/leaves", (req, res) => {
  const db = load();
  const { employeeId, type, startDate, endDate, reason } = req.body;
  const emp = db.employees.find(e => e.id === Number(employeeId));
  if (!emp) return res.status(404).json({ error: "Employee not found" });
  if (!type || !startDate || !endDate) return res.status(400).json({ error: "Invalid input" });
  if (!["casual","sick","earned"].includes(type)) return res.status(400).json({ error: "Invalid leave type" });

  const s = new Date(startDate);
  const e = new Date(endDate);
  if (isNaN(s) || isNaN(e)) return res.status(400).json({ error: "Invalid dates" });
  if (e < s) return res.status(400).json({ error: "End date before start date" });
  if (s < new Date(emp.joiningDate)) return res.status(400).json({ error: "Leave before joining date" });

  const days = dayDiffInclusive(s, e);
  if (days <= 0) return res.status(400).json({ error: "Invalid duration" });
  if (days > (emp.leaveBalance[type] || 0)) return res.status(400).json({ error: "Insufficient balance" });

  const hasOverlap = db.leaves.some(l =>
    l.employeeId === emp.id &&
    l.status === "approved" &&
    overlaps(s, e, new Date(l.startDate), new Date(l.endDate))
  );
  if (hasOverlap) return res.status(409).json({ error: "Overlapping with approved leave" });

  const leave = {
    id: db.seq.leaveId++,
    ref: uuid().split("-")[0].toUpperCase(),
    employeeId: emp.id,
    type,
    startDate: s,
    endDate: e,
    days,
    status: "pending",
    reason: reason || ""
  };
  db.leaves.push(leave);
  save(db);
  res.json(leave);
});

app.get("/leaves", (req, res) => {
  const db = load();
  const { employeeId } = req.query;
  if (employeeId) return res.json(db.leaves.filter(l => l.employeeId === Number(employeeId)));
  res.json(db.leaves);
});

app.post("/leaves/:id/approve", (req, res) => {
  const db = load();
  const leave = db.leaves.find(l => l.id === Number(req.params.id));
  if (!leave) return res.status(404).json({ error: "Leave not found" });
  if (leave.status !== "pending") return res.status(400).json({ error: "Already processed" });
  const emp = db.employees.find(e => e.id === leave.employeeId);
  if (!emp) return res.status(404).json({ error: "Employee not found" });
  if (leave.days > (emp.leaveBalance[leave.type] || 0)) return res.status(400).json({ error: "Insufficient balance" });
  emp.leaveBalance[leave.type] -= leave.days;
  leave.status = "approved";
  save(db);
  res.json(leave);
});

app.post("/leaves/:id/reject", (req, res) => {
  const db = load();
  const leave = db.leaves.find(l => l.id === Number(req.params.id));
  if (!leave) return res.status(404).json({ error: "Leave not found" });
  if (leave.status !== "pending") return res.status(400).json({ error: "Already processed" });
  leave.status = "rejected";
  save(db);
  res.json(leave);
});

const desired = Number(process.env.PORT) || 4000;
const server = app.listen(desired, () => {
  const addr = server.address();
  console.log(`Server running at http://localhost:${addr.port}`);
});
server.on("error", () => {
  const s2 = app.listen(0, () => {
    const addr = s2.address();
    console.log(`Server running at http://localhost:${addr.port}`);
  });
});
