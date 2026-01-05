const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const db = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const cron = require('node-cron');
const { syncEmployeesFromOffice365 } = require('./services/office365Sync');
const { syncHolidaysFromHROne, syncLeavesFromHROne } = require('./services/hroneSync');
// Load environment variables
dotenv.config();

// Import routes
const employeeRoutes = require('./routes/employeeRoutes');
const projectRoutes = require('./routes/projectRoutes');
const timesheetRoutes = require('./routes/timesheetRoutes');
const holidayRoutes = require('./routes/holidayRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const approvalRoutes = require('./routes/approvalRoutes');
const configurationRoutes = require('./routes/configurationRoutes');
const projectAccessRequestRoutes = require('./routes/projectAccessRequestRoutes');

// Verify route registration
console.log('✅ Routes loaded. Project Hours route registered:', typeof timesheetRoutes.stack !== 'undefined');

const app = express();
const PORT = process.env.PORT || 8001;

// Initialize database connection
(async () => {
  try {
    await db.initializeDatabase();
    console.log('✅ Database connection initialized');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
})();

// Middleware (MUST be before routes)
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Timesheet Management API - Node.js Backend',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Request logging middleware (for debugging)
app.use((req, res, next) => {
  if (req.path.includes('/analysis/project-hours')) {
    console.log('🔍 Incoming request:', req.method, req.path, req.url);
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/timesheets', timesheetRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/configurations', configurationRoutes);
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/project-access-requests', projectAccessRequestRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404
    }
  });
});

// Log registered routes on startup (for debugging)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('📋 Registered timesheet routes:');
  timesheetRoutes.stack.forEach((r) => {
    if (r.route) {
      console.log(`   ${Object.keys(r.route.methods)[0].toUpperCase()} ${r.route.path}`);
    }
  });
  console.log(`\n🚀 Server started successfully!`);
  console.log(`📡 Listening on http://0.0.0.0:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}\n`);
});

// --- Scheduled Tasks ---
console.log('Setting up scheduled tasks...');

// Schedule Office 365 employee sync (daily at 2 AM)
// As per DEVELOPER_HANDOVER.MD (Section 8.1)
cron.schedule('0 2 * * *', async () => {
  console.log('⏰ Running scheduled task: Sync Employees from Office 365');
  try {
    await syncEmployeesFromOffice365();
    console.log('✅ Scheduled employee sync completed.');
  } catch (error) {
    console.error('❌ Scheduled employee sync failed:', error);
  }
}, {
  timezone: "Asia/Kolkata" // TODO: Make this a system configuration
});

// Schedule HROne holiday sync (daily at 2:15 AM)
cron.schedule('15 2 * * *', async () => {
  console.log('⏰ Running scheduled task: Sync Holidays from HROne');
  try {
    await syncHolidaysFromHROne();
    console.log('✅ Scheduled holiday sync completed.');
  } catch (error) {
    console.error('❌ Scheduled holiday sync failed:', error);
  }
}, {
  timezone: "Asia/Kolkata"
});

// Schedule HROne leave sync (daily at 2:30 AM)
cron.schedule('30 2 * * *', async () => {
  console.log('⏰ Running scheduled task: Sync Leaves from HROne');
  try {
    await syncLeavesFromHROne();
    console.log('✅ Scheduled leave sync completed.');
  } catch (error) {
    console.error('❌ Scheduled leave sync failed:', error);
  }
}, {
  timezone: "Asia/Kolkata"
});

module.exports = app;
