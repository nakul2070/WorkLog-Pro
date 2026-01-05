import React, { useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { FileText, Clock, CheckCircle, Calendar } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

const EmployeeDashboardPage = () => {
  const { user } = useContext(AuthContext);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Employee Dashboard</h1>
        <p className="text-slate-600">Welcome back, {user?.name || 'Employee'}! Manage your timesheets and track your work.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Quick Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-700">Timesheet Entry</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Log your daily work hours and submit timesheets for approval.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="text-sm text-gray-700">Track Progress</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Monitor your timesheet submission status and approvals.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <span className="text-sm text-gray-700">Monthly View</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">View and manage your timesheet entries by month.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Timesheet Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 mb-4">
            Use the timesheet entry form in the main navigation to log your daily work hours, 
            track projects, and submit timesheets for approval. Your timesheets will be reviewed 
            by your Project Manager.
          </p>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <CheckCircle className="h-4 w-4" />
            <span>You can submit your timesheet from the 1st to the end of each month. Previous month timesheets can be submitted if they are draft or rejected or not submitted yet.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeDashboardPage;

