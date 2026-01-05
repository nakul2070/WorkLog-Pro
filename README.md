# WorkLog-Pro

A comprehensive timesheet management system designed to streamline employee time tracking, project management, and approval workflows. WorkLog-Pro integrates with Microsoft Office 365 and HROne to provide a seamless experience for employees, project managers, and administrators.

## 🚀 Features

### Core Functionality
- **Timesheet Management**: Create, edit, and submit timesheet entries with project-wise hour tracking
- **Leave Management**: Track employee leaves with support for full-day and half-day leave types
- **Project Management**: Manage clients, projects, and team assignments
- **Approval Workflow**: Multi-level approval system for timesheet submissions
- **Role-Based Access Control**: Different dashboards and permissions for Employees, Project Managers, and Administrators

### Integrations
- **Microsoft Office 365**: Single Sign-On (SSO) authentication and employee data synchronization
- **HROne**: Automatic synchronization of holidays and leave data
- **Email Notifications**: Automated email notifications for approvals and system updates

### User Roles
- **Employee**: Submit timesheets, view personal leave history, and track project hours
- **Project Manager**: Review and approve timesheets, manage project assignments, view team analytics
- **Administrator**: Full system access including user management, project configuration, and system settings

## 🛠️ Tech Stack

### Backend
- **Node.js** with **Express.js** - RESTful API server
- **MySQL** - Relational database
- **JWT** - Authentication and authorization
- **Nodemailer** - Email service integration
- **node-cron** - Scheduled tasks for data synchronization
- **Azure Identity & MSAL** - Office 365 integration
- **Axios** - HTTP client for external API calls

### Frontend
- **React 19** - Modern UI framework
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **React Hook Form** - Form management
- **Zod** - Schema validation
- **date-fns** - Date manipulation utilities
- **Axios** - API communication

### Database
- **MySQL** - Primary database
- **Database Migrations** - Version-controlled schema management

## 📁 Project Structure

```
WorkLog-Pro/
├── backend-node/              # Backend API server
│   ├── config/                # Database configuration
│   ├── controllers/           # Business logic handlers
│   ├── middleware/            # Authentication & authorization
│   ├── routes/                # API route definitions
│   ├── services/              # External service integrations
│   │   ├── emailService.js    # Email notifications
│   │   ├── office365Sync.js   # Office 365 integration
│   │   └── hroneSync.js       # HROne integration
│   ├── server.js              # Main server entry point
│   └── package.json
│
├── frontend/                  # React frontend application
│   ├── public/                # Static assets
│   └── src/
│       ├── components/        # React components
│       │   ├── admin/         # Admin-specific components
│       │   ├── auth/          # Authentication components
│       │   ├── employee/      # Employee-specific components
│       │   ├── pages/         # Page components
│       │   ├── projectmanager/# PM-specific components
│       │   └── ui/            # Reusable UI components
│       ├── context/           # React context providers
│       ├── hooks/             # Custom React hooks
│       ├── lib/               # Utility libraries
│       ├── utils/             # Helper functions
│       └── App.js             # Main application component
│
├── database/                  # Database schema and migrations
│   ├── migrations/            # SQL migration files
│   ├── ER_DIAGRAM.md          # Entity Relationship diagram
│   └── ER_DIAGRAM.png         # Visual ER diagram
│
└── README.md                  # This file
```

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher)
- **npm** or **yarn** package manager
- **MySQL** (v8.0 or higher)
- **Git**

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "latest changes 1Janoooo"
```

### 2. Backend Setup

```bash
cd backend-node
npm install
# or
yarn install
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
# or
yarn install
```

### 4. Database Setup

1. Create a MySQL database:
```sql
CREATE DATABASE worklog_pro;
```

2. Run migrations:
```bash
cd backend-node
node run-migration.js
```

3. (Optional) Seed initial data:
```bash
node run-seed.js
```

### 5. Environment Configuration

Create a `.env` file in the `backend-node` directory:

```env
# Server Configuration
PORT=8001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Database Configuration
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=worklog_pro

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# Office 365 / Azure AD Configuration
AZURE_CLIENT_ID=your_azure_client_id
AZURE_CLIENT_SECRET=your_azure_client_secret
AZURE_TENANT_ID=your_azure_tenant_id
AZURE_REDIRECT_URI=http://localhost:3000/auth/callback

# HROne API Configuration
HRONE_API_URL=your_hrone_api_url
HRONE_API_KEY=your_hrone_api_key

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_password
SMTP_FROM=noreply@worklogpro.com
```

## 🚀 Running the Application

### Development Mode

#### Start Backend Server

```bash
cd backend-node
npm start
# or for auto-reload
npm run dev
```

The backend API will be available at `http://localhost:8001`

#### Start Frontend Development Server

```bash
cd frontend
npm start
```

The frontend application will open at `http://localhost:3000`

### Production Build

#### Build Frontend

```bash
cd frontend
npm run build
```

The production build will be created in the `frontend/build` directory.

## 📚 API Documentation

### Base URL
```
http://localhost:8001/api
```

### Authentication
All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### Key Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

#### Employees
- `GET /api/employees` - Get all employees
- `GET /api/employees/current` - Get current logged-in user
- `GET /api/employees/sync` - Sync employees from Office 365

#### Projects
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

#### Timesheets
- `GET /api/timesheets` - Get timesheets (with filters)
- `POST /api/timesheets` - Submit new timesheet
- `PUT /api/timesheets/:id` - Update timesheet
- `DELETE /api/timesheets/:id` - Delete timesheet

#### Approvals
- `GET /api/approvals/pending` - Get pending approvals
- `POST /api/approvals/:id/approve` - Approve timesheet
- `POST /api/approvals/:id/reject` - Reject timesheet

#### Leaves & Holidays
- `GET /api/leaves` - Get all leaves
- `GET /api/holidays` - Get all holidays
- `GET /api/leaves/sync` - Sync leaves from HROne
- `GET /api/holidays/sync` - Sync holidays from HROne

For detailed API documentation, refer to the backend README at `backend-node/README.md`.

## 🗄️ Database Schema

The database consists of 13 main tables:

1. **users** - User accounts and employee information
2. **clients** - Client organizations
3. **projects** - Project definitions
4. **project_team_members** - User-project assignments
5. **timesheets** - Monthly timesheet submissions
6. **timesheet_entries** - Individual time entries
7. **approvals** - Timesheet approval records
8. **leaves** - Employee leave records
9. **holidays** - Company holiday calendar
10. **project_access_requests** - Project access requests
11. **audit_logs** - System audit trail
12. **system_configurations** - System settings
13. **sync_logs** - External system sync logs

View the ER diagram at `database/ER_DIAGRAM.md` or `database/ER_DIAGRAM.png`.

## 🔄 Scheduled Tasks

The system includes automated scheduled tasks:

- **Employee Sync**: Daily synchronization of employee data from Office 365
- **Holiday Sync**: Periodic synchronization of holidays from HROne
- **Leave Sync**: Periodic synchronization of leave data from HROne

## 🧪 Testing

### Backend Tests

```bash
cd backend-node
# Run database connection test
node test-db-connection.js

# Test email service
node test-email-service.js

# Test Azure integration
node test-azure-integration.js
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify MySQL is running
   - Check database credentials in `.env`
   - Ensure database exists

2. **CORS Errors**
   - Verify `CORS_ORIGIN` in backend `.env` matches frontend URL
   - Check browser console for specific CORS errors

3. **Authentication Issues**
   - Verify Azure AD credentials are correct
   - Check JWT secret is set in `.env`
   - Ensure redirect URI matches Azure app registration

4. **Email Not Working**
   - Verify SMTP credentials
   - Check firewall/network settings
   - Test SMTP connection: `node backend-node/test-email-service.js`

## 📝 Development Guidelines

### Code Style
- Follow ESLint configuration
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and modular

### Git Workflow
- Create feature branches for new functionality
- Write descriptive commit messages
- Test before submitting pull requests

### Database Changes
- Always create migration files for schema changes
- Test migrations on development database first
- Document breaking changes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 👥 Support

For issues, questions, or feature requests, please contact the development team or create an issue in the repository.

## 🔮 Roadmap

### Upcoming Features
- [ ] Real-time notifications
- [ ] Advanced analytics and reporting
- [ ] Mobile application
- [ ] Export functionality (PDF, Excel)
- [ ] Bulk operations
- [ ] Custom approval workflows
- [ ] Integration with additional HR systems

---

**WorkLog-Pro** - Streamlining time tracking and project management for modern teams.

