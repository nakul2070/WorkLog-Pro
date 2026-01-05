import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Loader2, AlertCircle, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import { apiGet } from '../../utils/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const TimesheetsByStatusPage = () => {
  const { status } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [timesheets, setTimesheets] = useState([]);
  const [filteredTimesheets, setFilteredTimesheets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageSize, setPageSize] = useState(50);
  const selectedMonthFromUrl = searchParams.get('month');

  const statusConfig = {
    'approved': { label: 'Approved', color: 'bg-green-100 text-green-800', apiStatus: 'approved' },
    'pending': { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', apiStatus: 'submitted' }, // Submitted timesheets show under Pending
    'draft': { label: 'Draft/Saved', color: 'bg-blue-100 text-blue-800', apiStatus: 'draft' },
    'rejected': { label: 'Rejected', color: 'bg-red-100 text-red-800', apiStatus: 'rejected' }
  };

  const config = statusConfig[status] || statusConfig['pending'];

  const fetchTimesheets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Build API URL with optional month filter
      let apiUrl = `/api/timesheets?status=${config.apiStatus}`;
      if (selectedMonthFromUrl && selectedMonthFromUrl !== 'all') {
        const [year, month] = selectedMonthFromUrl.split('-');
        apiUrl += `&year=${year}&month=${month}`;
      }
      
      const result = await apiGet(apiUrl);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch timesheets.');
      }
      let fetchedTimesheets = Array.isArray(result.data) ? result.data : [];
      
      // For draft status, sort by most recently saved (updated_at DESC)
      if (status === 'draft') {
        fetchedTimesheets.sort((a, b) => {
          const dateA = a.updatedAt || a.updated_at || a.createdAt || a.created_at || 0;
          const dateB = b.updatedAt || b.updated_at || b.createdAt || b.created_at || 0;
          return new Date(dateB) - new Date(dateA);
        });
      }
      
      setTimesheets(fetchedTimesheets);
      // Initially show all timesheets (will be filtered by pageSize)
      setFilteredTimesheets(fetchedTimesheets);
    } catch (err) {
      console.error(`Error fetching ${status} timesheets:`, err);
      setError(err.message || 'An unexpected error occurred.');
      toast({ 
        title: "Error", 
        description: `Could not load ${config.label} timesheets.`, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  }, [status, config.apiStatus, config.label, toast, selectedMonthFromUrl]);

  useEffect(() => {
    fetchTimesheets();
  }, [fetchTimesheets]);

  // Update filtered timesheets when pageSize changes
  useEffect(() => {
    if (pageSize === 0) {
      // Show all records
      setFilteredTimesheets(timesheets);
    } else {
      // Show only the first pageSize records
      setFilteredTimesheets(timesheets.slice(0, pageSize));
    }
  }, [pageSize, timesheets]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatLastSavedDate = (timesheet) => {
    // Use updated_at or updatedAt (backend may return either)
    const lastSaved = timesheet.updatedAt || timesheet.updated_at;
    if (!lastSaved) {
      // Fallback to created_at if updated_at is not available
      const created = timesheet.createdAt || timesheet.created_at;
      return created ? formatDate(created) : 'N/A';
    }
    return formatDate(lastSaved);
  };

  const getMonthName = (month) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames[month - 1] || month;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-slate-600">Loading {config.label} timesheets...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-8 rounded-lg border border-red-200 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-700 font-medium">Failed to load data</p>
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <Button onClick={fetchTimesheets}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{config.label} Timesheets</h1>
          <p className="text-slate-600">View all timesheets with {config.label.toLowerCase()} status.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`${config.color} text-sm px-3 py-1`}>
            {filteredTimesheets.length} of {timesheets.length} {config.label}
          </Badge>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show:</span>
            <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
              <SelectTrigger className="h-9 w-[120px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All ({timesheets.length})</SelectItem>
                <SelectItem value="50">0-50</SelectItem>
                <SelectItem value="100">0-100</SelectItem>
                <SelectItem value="500">0-500</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {config.label} Timesheets ({filteredTimesheets.length} of {timesheets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timesheets.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No {config.label.toLowerCase()} timesheets found</p>
              <p className="text-sm text-gray-400 mt-2">
                There are currently no timesheets with {config.label.toLowerCase()} status.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left p-3 text-sm font-semibold text-black">Employee</th>
                    <th className="text-left p-3 text-sm font-semibold text-black">Period</th>
                    <th className="text-center p-3 text-sm font-semibold text-black">Total Hours</th>
                    <th className="text-center p-3 text-sm font-semibold text-black">Status</th>
                    <th className="text-left p-3 text-sm font-semibold text-black">
                      {status === 'draft' ? 'Last Saved Date' : 'Last Update'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTimesheets.map((timesheet) => (
                    <tr key={timesheet.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-sm text-black">
                        <div>
                          <p className="font-medium">{timesheet.userName || 'Unknown User'}</p>
                          {timesheet.employeeId && (
                            <p className="text-xs text-gray-500">ID: {timesheet.employeeId}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-sm text-black">
                        {getMonthName(timesheet.month)} {timesheet.year}
                      </td>
                      <td className="p-3 text-sm text-black text-center font-semibold">
                        {Number(timesheet.totalHours || 0).toFixed(1)}h
                      </td>
                      <td className="p-3 text-center">
                        <Badge className={`${config.color} border-0`}>
                          {config.label}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-black">
                        {formatLastSavedDate(timesheet)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TimesheetsByStatusPage;

