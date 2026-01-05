import React from 'react'; // <-- Removed unused imports
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// Removed axios import for now
import LandingPage from "./components/LandingPage";
import EmployeeLayout from "./components/layout/EmployeeLayout";
import { Toaster } from "./components/ui/toaster";

// --- NEW IMPORTS ---
import { AuthProvider } from './context/AuthContext';
import AuthCallback from './components/auth/AuthCallback';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ManageProjectsPage from './components/pages/ManageProjectsPage';
import ManageClientsPage from './components/pages/ManageClientsPage';
import ManageAdminsPage from './components/pages/ManageAdminsPage';
import ManageConfigurationPage from './components/pages/ManageConfigurationPage';
import AddClientPage from './components/pages/AddClientPage';
import ReviewTimesheetsPage from './components/pages/ReviewTimesheetsPage';
import AdminDashboardPage from './components/pages/AdminDashboardPage';
import TimesheetsByStatusPage from './components/pages/TimesheetsByStatusPage';
import ProjectManagerDashboardPage from './components/pages/ProjectManagerDashboardPage';
import EmployeeDashboardPage from './components/pages/EmployeeDashboardPage';
import NotificationsPage from './components/pages/NotificationsPage';
import EmployeeTimeAnalysisPage from './components/pages/EmployeeTimeAnalysisPage';
import ProjectHoursViewPage from './components/pages/ProjectHoursViewPage';
import RoleProtectedRoute from './components/auth/RoleProtectedRoute';
import RoleBasedRedirect from './components/auth/RoleBasedRedirect';
// --- END NEW IMPORTS ---

// Removed the old Home component and API calls

function App() {
  return (
    // --- WRAPPED with AuthProvider ---
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            {/* Landing Page (Public) */}
            <Route path="/" element={<LandingPage />} />

            {/* --- NEW: Authentication Callback Route (Public) --- */}
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Role-Based Redirect - Default landing after login */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <RoleBasedRedirect />
                </ProtectedRoute>
              }
            />

            {/* Employee Portal (Protected) */}
            <Route
              path="/employee"
              element={
                <RoleProtectedRoute allowedRoles={['employee']}>
                  <EmployeeLayout />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/employee"
              element={
                <RoleProtectedRoute allowedRoles={['employee']}>
                  <EmployeeLayout>
                    <EmployeeDashboardPage />
                  </EmployeeLayout>
                </RoleProtectedRoute>
              }
            />

            {/* Admin Pages (Protected) */}
            <Route
              path="/admin/dashboard"
              element={
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <EmployeeLayout>
                    <AdminDashboardPage />
                  </EmployeeLayout>
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/admin/projects"
              element={
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <EmployeeLayout>
                    <ManageProjectsPage />
                  </EmployeeLayout>
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/admin/clients"
              element={
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <EmployeeLayout>
                    <ManageClientsPage />
                  </EmployeeLayout>
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/admin/admins"
              element={
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <EmployeeLayout>
                    <ManageAdminsPage />
                  </EmployeeLayout>
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/admin/configuration"
              element={
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <EmployeeLayout>
                    <ManageConfigurationPage />
                  </EmployeeLayout>
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/admin/notifications"
              element={
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <EmployeeLayout>
                    <NotificationsPage />
                  </EmployeeLayout>
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/admin/add-client"
              element={
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <EmployeeLayout>
                    <AddClientPage />
                  </EmployeeLayout>
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/admin/timesheets/:status"
              element={
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <EmployeeLayout>
                    <TimesheetsByStatusPage />
                  </EmployeeLayout>
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/admin/time-analysis"
              element={
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <EmployeeLayout>
                    <EmployeeTimeAnalysisPage />
                  </EmployeeLayout>
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/admin/project-hours"
              element={
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <EmployeeLayout>
                    <ProjectHoursViewPage />
                  </EmployeeLayout>
                </RoleProtectedRoute>
              }
            />

            {/* Project Manager Pages (Protected) */}
            <Route
              path="/pm/dashboard"
              element={
                <RoleProtectedRoute allowedRoles={['projectManager']}>
                  <EmployeeLayout>
                    <ProjectManagerDashboardPage />
                  </EmployeeLayout>
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/pm/timesheet"
              element={
                <RoleProtectedRoute allowedRoles={['projectManager']}>
                  <EmployeeLayout />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/pm/review-timesheets"
              element={
                <RoleProtectedRoute allowedRoles={['projectManager']}>
                  <EmployeeLayout>
                    <ReviewTimesheetsPage />
                  </EmployeeLayout>
                </RoleProtectedRoute>
              }
            />

            {/* Logout Route - Handled by AuthContext, redirect handled by ProtectedRoute */}
            {/* Optional: Add a specific /logout route if needed, but signing out is usually just clearing state */}
            {/* <Route path="/logout" element={<Navigate to="/" replace />} /> */}

            {/* Redirect any other path to landing page (optional) */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </BrowserRouter>
        <Toaster />
      </div>
    </AuthProvider>
    // --- END WRAPPER ---
  );
}

export default App;