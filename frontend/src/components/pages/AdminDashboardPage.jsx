import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/use-toast';
import { apiGet } from '../../utils/api';
import { Loader2 } from 'lucide-react';
import {
  CheckCircle, 
  Clock, 
  XCircle, 
  FileText,
  BarChart3
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const statusOptions = [
  {
    status: 'draft',
    label: 'Draft/Saved',
    icon: FileText,
    accentColor: 'text-slate-700',
    borderAccent: 'border-l-slate-300',
    description: 'View all draft/saved timesheets',
    apiStatus: 'draft'
  },
  {
    status: 'pending',
    label: 'Pending for Approval',
    icon: Clock,
    accentColor: 'text-amber-700',
    borderAccent: 'border-l-amber-400',
    description: 'View all pending timesheets',
    apiStatus: 'submitted' // Submitted timesheets show under Pending
  },
  {
    status: 'approved',
    label: 'Approved',
    icon: CheckCircle,
    accentColor: 'text-emerald-700',
    borderAccent: 'border-l-emerald-400',
    description: 'View all approved timesheets',
    apiStatus: 'approved'
  },
  {
    status: 'rejected',
    label: 'Rejected',
    icon: XCircle,
    accentColor: 'text-rose-700',
    borderAccent: 'border-l-rose-400',
    description: 'View all rejected timesheets',
    apiStatus: 'rejected'
  }
];

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [counts, setCounts] = useState({
    approved: 0,
    pending: 0,
    draft: 0,
    rejected: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [availableMonths, setAvailableMonths] = useState([]);

  // Generate available months (last 12 months) + "All Months" option
  useEffect(() => {
    const months = [{ key: 'all', label: 'All Months' }];
    const now = new Date();
    
    // Generate months from 12 months ago to current month (newest first)
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      months.push({ key: monthKey, label: monthLabel });
    }
    
    setAvailableMonths(months);
    // Default to "All Months"
    setSelectedMonth('all');
  }, []);

  const fetchCounts = useCallback(async () => {
    if (!selectedMonth) return; // Wait for month to be set
    
    setIsLoading(true);
    try {
      const countPromises = statusOptions.map(async (option) => {
        try {
          // If "All Months" is selected, don't include year/month filters
          let apiUrl = `/api/timesheets?status=${option.apiStatus}`;
          if (selectedMonth !== 'all') {
            // Parse selected month (format: "YYYY-MM")
            const [year, month] = selectedMonth.split('-');
            apiUrl += `&year=${year}&month=${month}`;
          }
          
          const result = await apiGet(apiUrl);
          if (result.success && Array.isArray(result.data)) {
            return { status: option.status, count: result.data.length };
          }
          return { status: option.status, count: 0 };
        } catch (error) {
          console.error(`Error fetching ${option.status} count:`, error);
          return { status: option.status, count: 0 };
        }
      });

      const countResults = await Promise.all(countPromises);
      const newCounts = {};
      countResults.forEach(({ status, count }) => {
        newCounts[status] = count;
      });
      setCounts(newCounts);
    } catch (error) {
      console.error('Error fetching timesheet counts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load timesheet counts.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, toast]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-base text-gray-600 font-normal">Manage and view timesheets by status</p>
        </div>
        
        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 font-medium whitespace-nowrap">View:</span>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="h-9 w-[150px] text-sm">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((month) => (
                <SelectItem key={month.key} value={month.key}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status Cards Section */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-2 pt-3 border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gray-600" />
            Timesheet Status 
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statusOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.status}
                  onClick={() => {
                    // Pass selected month as query parameter if not "All Months"
                    const monthParam = selectedMonth !== 'all' ? `?month=${selectedMonth}` : '';
                    navigate(`/admin/timesheets/${option.status}${monthParam}`);
                  }}
                  className="group relative bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-md transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {/* Left border accent */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${option.borderAccent} rounded-l-lg`} />
                  
                  {/* Content */}
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="p-2 bg-gray-50 rounded-md group-hover:bg-gray-100 transition-colors">
                        <Icon className={`h-5 w-5 ${option.accentColor}`} strokeWidth={2} />
                      </div>
                      {/* Count badge in top-right corner */}
                      <div className="flex items-center justify-center min-w-[32px] h-8 px-2 bg-gray-100 rounded-md border border-gray-200">
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        ) : (
                          <span className="text-sm font-bold text-gray-700">
                            {counts[option.status] || 0}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="text-base font-semibold text-gray-900 group-hover:text-gray-950 transition-colors">
                        {option.label}
                      </h3>
                      <p className="text-sm text-gray-500 font-normal leading-snug">
                        {option.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Hover effect indicator */}
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="text-xs text-gray-400 font-medium">View →</div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboardPage;

