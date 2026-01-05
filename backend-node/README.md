# Timesheet Management Backend - Node.js + Express

## Overview
This is the backend API for the Timesheet Management application, built with **Node.js** and **Express**. Currently, all APIs return **mock data** to support frontend development without database dependencies.

## Tech Stack
- **Node.js** v16+
- **Express.js** - Web framework
- **CORS** - Cross-origin support
- **dotenv** - Environment configuration
- **UUID** - Unique ID generation

## Project Structure
```
backend-node/
├── server.js                    # Main server entry point
├── package.json                 # Dependencies
├── .env                         # Environment variables
├── controllers/                 # Business logic
│   ├── employeeController.js   # Employee management (Office 365 mock)
│   ├── projectController.js    # Project & Client management (MySQL mock)
│   ├── timesheetController.js  # Timesheet CRUD (MySQL mock)
│   ├── holidayController.js    # Holiday data (HROne mock)
│   ├── leaveController.js      # Leave data (HROne mock)
│   └── approvalController.js   # Timesheet approvals (MySQL mock)
├── routes/                      # API endpoints
│   ├── employeeRoutes.js
│   ├── projectRoutes.js
│   ├── timesheetRoutes.js
│   ├── holidayRoutes.js
│   ├── leaveRoutes.js
│   └── approvalRoutes.js
├── middleware/                  # Custom middleware (future)
└── utils/                       # Utility functions (future)
```

## Data Sources (Future Integrations)

### 1. Employee Master Data
- **Source**: Microsoft Office 365 Graph API
- **Current**: Mock data with 6 employees
- **Endpoint**: `GET /api/employees`
- **Mock Response**: Includes employee details, roles, departments

### 2. Holiday Master Data
- **Source**: HROne API
- **Current**: Mock data with 7 public holidays
- **Endpoint**: `GET /api/holidays`
- **Mock Response**: National holidays for 2025

### 3. Leave Master Data
- **Source**: HROne API
- **Current**: Mock data with employee leaves
- **Endpoint**: `GET /api/leaves`
- **Mock Response**: Approved leaves by employee

### 4. Project Master Data
- **Source**: MySQL Database (future schema)
- **Current**: Mock data with 3 projects
- **Endpoint**: `GET /api/projects`
- **Mock Response**: Project details, clients, managers

### 5. Timesheet Data (CRUD)
- **Source**: MySQL Database (future schema)
- **Current**: Mock in-memory storage
- **Endpoints**: `GET/POST/PUT/DELETE /api/timesheets`
- **Mock Response**: Timesheet entries by employee/month

### 6. Approval Data (CRUD)
- **Source**: MySQL Database (future schema)
- **Current**: Mock in-memory storage
- **Endpoints**: `GET /api/approvals/pending`, `POST /api/approvals/:id/approve`
- **Mock Response**: Pending approvals for project managers

## API Documentation

### Base URL
```
http://localhost:8001/api
```

### Authentication
- **Current**: No authentication (development mode)
- **Future**: JWT-based authentication with Office 365 SSO

---

## Endpoints

### Health Check
```
GET /api
Response: { message, status, timestamp }
```

### Employees
```
GET    /api/employees              # Get all employees (Office 365 mock)
GET    /api/employees/current      # Get current logged-in user
GET    /api/employees/sync         # Sync from Office 365
GET    /api/employees/:id          # Get employee by ID
```

### Projects
```
GET    /api/projects               # Get all projects (MySQL mock)
GET    /api/projects/:id           # Get project by ID
POST   /api/projects               # Create project
PUT    /api/projects/:id           # Update project
DELETE /api/projects/:id           # Delete project
GET    /api/projects/clients/all   # Get all clients
POST   /api/projects/clients       # Create client
```

### Timesheets
```
GET    /api/timesheets             # Get all timesheets (filter by employee/month)
GET    /api/timesheets/:id         # Get timesheet by ID
POST   /api/timesheets             # Submit timesheet
PUT    /api/timesheets/:id         # Update timesheet
DELETE /api/timesheets/:id         # Delete timesheet
```

### Holidays
```
GET    /api/holidays               # Get all holidays (HROne mock)
GET    /api/holidays/sync          # Sync from HROne
GET    /api/holidays/:date         # Get holiday by date
```

### Leaves
```
GET    /api/leaves                 # Get all leaves (HROne mock)
GET    /api/leaves/employee/:id    # Get leaves by employee
GET    /api/leaves/check           # Check if employee on leave (query: employeeId, date)
GET    /api/leaves/sync            # Sync from HROne
```

### Approvals
```
GET    /api/approvals/pending      # Get pending approvals
GET    /api/approvals/history      # Get approval history
POST   /api/approvals/:id/approve  # Approve timesheet
POST   /api/approvals/:id/reject   # Reject timesheet (requires comments)
```

---

## Environment Variables

```env
PORT=8001
NODE_ENV=development
CORS_ORIGIN=*
```

---

## Installation

```bash
cd backend-node
yarn install
# or npm install
```

## Running the Server

### Development Mode
```bash
yarn start
# or npm start
```

### With Nodemon (auto-reload)
```bash
yarn dev
# or npm run dev
```

---

## Testing APIs

### Using curl
```bash
# Health check
curl http://localhost:8001/api

# Get employees
curl http://localhost:8001/api/employees

# Get holidays for 2025
curl http://localhost:8001/api/holidays?year=2025

# Get projects
curl http://localhost:8001/api/projects
```

---

## Future Development Roadmap

### Phase 1: Database Integration
- [ ] Design MySQL schema for projects, timesheets, approvals
- [ ] Implement database connection (MySQL)
- [ ] Replace mock controllers with real DB queries
- [ ] Add database migrations

### Phase 2: Third-Party Integrations
- [ ] Microsoft Office 365 Graph API integration
  - Employee sync
  - Authentication (SSO)
- [ ] HROne API integration
  - Holiday sync
  - Leave sync
- [ ] Implement scheduled jobs for daily sync

### Phase 3: Authentication & Authorization
- [ ] JWT implementation
- [ ] Role-based access control (Admin, PM, Employee)
- [ ] Session management
- [ ] Refresh tokens

### Phase 4: Advanced Features
- [ ] Real-time notifications
- [ ] Email notifications (timesheet approvals)
- [ ] Export timesheets (PDF, Excel)
- [ ] Analytics and reporting APIs
- [ ] Audit logs

---

## Notes
- All mock data is stored in-memory and resets on server restart
- No database connection required for current development
- Mock responses include "source" field indicating data origin (Office 365, HROne, MySQL)
- Console logs show which mock API is being called for debugging

---

## Support
For issues or questions, contact the development team.
