import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';
import { useToast } from '../../hooks/use-toast';
import { apiGet } from '../../utils/api';
import { Loader2, Check, ChevronsUpDown, Calendar, Users, FileText, BarChart3 } from 'lucide-react';
import { cn } from '../../lib/utils';

const EmployeeTimeAnalysisPage = () => {
  const { toast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reportData, setReportData] = useState([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [employeeSelectOpen, setEmployeeSelectOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [dateRangeOpen, setDateRangeOpen] = useState(false);

  // Set default date range to current month
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setFromDate(firstDay.toISOString().split('T')[0]);
    setToDate(lastDay.toISOString().split('T')[0]);
  }, []);

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    setIsLoadingEmployees(true);
    try {
      const result = await apiGet('/api/employees');
      if (result.success && Array.isArray(result.data)) {
        // Filter only active employees
        const activeEmployees = result.data.filter(emp => emp.isActive !== false);
        setEmployees(activeEmployees.sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load employees.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      // Handle error - could be Error object or other format
      const errorMessage = error?.message || (typeof error === 'string' ? error : 'Failed to load employees.');
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoadingEmployees(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Toggle employee selection
  const toggleEmployee = (employeeId) => {
    setSelectedEmployeeIds(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  // Select all employees
  const selectAllEmployees = () => {
    setSelectedEmployeeIds(employees.map(emp => emp.id));
  };

  // Clear all selections
  const clearAllEmployees = () => {
    setSelectedEmployeeIds([]);
  };

  // Filter employees based on search
  const filteredEmployees = employees.filter(emp => {
    if (!searchValue) return true;
    const searchLower = searchValue.toLowerCase();
    return (
      emp.name.toLowerCase().includes(searchLower) ||
      emp.employeeId?.toLowerCase().includes(searchLower) ||
      emp.email?.toLowerCase().includes(searchLower)
    );
  });

  // Fetch report data
  const fetchReport = useCallback(async () => {
    if (selectedEmployeeIds.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one employee.',
        variant: 'destructive'
      });
      return;
    }

    if (!fromDate || !toDate) {
      toast({
        title: 'Validation Error',
        description: 'Please select both From and To dates.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoadingReport(true);
    try {
      const employeeIdsParam = selectedEmployeeIds.join(',');
      const result = await apiGet(
        `/api/timesheets/analysis/employee-time?employeeIds=${encodeURIComponent(employeeIdsParam)}&fromDate=${fromDate}&toDate=${toDate}`
      );

      if (result.success && Array.isArray(result.data)) {
        setReportData(result.data);
        toast({
          title: 'Report Generated',
          description: `Employee time analysis report generated for ${result.data.length} employee(s).`,
          variant: 'success'
        });
      } else {
        // Handle error - could be string or object with message/status
        const errorMessage = typeof result.error === 'object' && result.error?.message
          ? result.error.message
          : (typeof result.error === 'string' ? result.error : 'Failed to generate report.');
        
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        });
        setReportData([]);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      // Handle error - could be Error object or other format
      const errorMessage = error?.message || (typeof error === 'string' ? error : 'Failed to generate report.');
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
      setReportData([]);
    } finally {
      setIsLoadingReport(false);
    }
  }, [selectedEmployeeIds, fromDate, toDate, toast]);

  // Get selected employee names for display
  const getSelectedEmployeeNames = () => {
    if (selectedEmployeeIds.length === 0) return 'Select employees...';
    if (selectedEmployeeIds.length === employees.length) return 'All employees selected';
    if (selectedEmployeeIds.length <= 3) {
      return selectedEmployeeIds
        .map(id => employees.find(emp => emp.id === id)?.name)
        .filter(Boolean)
        .join(', ');
    }
    return `${selectedEmployeeIds.length} employee(s) selected`;
  };

  // Format hours for display
  const formatHours = (hours) => {
    return hours.toFixed(2);
  };

  // Format date range for display
  const getDateRangeDisplay = () => {
    if (!fromDate || !toDate) return 'Select date range...';
    const from = new Date(fromDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const to = new Date(toDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${from} - ${to}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Page Title */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Reports
              </h1>
            </div>

            {/* Right: Filters and Generate Button */}
            <div className="flex items-center gap-3 flex-1 justify-end min-w-0">
              {/* Employee Filter */}
              <Popover open={employeeSelectOpen} onOpenChange={setEmployeeSelectOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "h-10 min-w-[200px] justify-between",
                      !selectedEmployeeIds.length && "text-muted-foreground"
                    )}
                  >
                    <span className="truncate flex items-center gap-2">
                      <Users className="h-4 w-4 shrink-0" />
                      {isLoadingEmployees ? 'Loading...' : getSelectedEmployeeNames()}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="end">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search employees..."
                      value={searchValue}
                      onValueChange={setSearchValue}
                    />
                    <CommandList className="max-h-[300px]">
                      <CommandEmpty>
                        {isLoadingEmployees ? 'Loading...' : 'No employees found.'}
                      </CommandEmpty>
                      <CommandGroup>
                        <div className="px-2 py-1.5 border-b">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                selectAllEmployees();
                              }}
                              type="button"
                            >
                              Select All
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                clearAllEmployees();
                              }}
                              type="button"
                            >
                              Clear All
                            </Button>
                          </div>
                        </div>
                        {filteredEmployees.map((employee) => {
                          const isSelected = selectedEmployeeIds.includes(employee.id);
                          return (
                            <CommandItem
                              key={employee.id}
                              value={`${employee.name} ${employee.employeeId || ''} ${employee.email || ''}`}
                              onSelect={() => {
                                // Do nothing - selection is handled by checkbox and button click
                              }}
                              className="p-0"
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleEmployee(employee.id);
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                }}
                                className="flex items-center w-full text-left cursor-pointer hover:bg-accent px-2 py-1.5 -mx-2 -my-1.5 rounded-sm"
                                style={{ pointerEvents: 'auto' }}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => {
                                    toggleEmployee(employee.id);
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                  }}
                                  className="mr-2 pointer-events-auto"
                                />
                                <div className="flex-1">
                                  <div className="font-medium">{employee.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {employee.employeeId} • {employee.email}
                                  </div>
                                </div>
                              </button>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Date Range Filter */}
              <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-10 min-w-[240px] justify-between",
                      (!fromDate || !toDate) && "text-muted-foreground"
                    )}
                  >
                    <span className="truncate flex items-center gap-2">
                      <Calendar className="h-4 w-4 shrink-0" />
                      {getDateRangeDisplay()}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="end">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        From Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="h-10 w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        To Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="h-10 w-full"
                        min={fromDate}
                      />
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        size="sm"
                        onClick={() => setDateRangeOpen(false)}
                        className="h-8"
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Generate Report Button */}
              <Button
                onClick={fetchReport}
                disabled={isLoadingReport || selectedEmployeeIds.length === 0 || !fromDate || !toDate}
                className="h-10 min-w-[140px] flex-shrink-0"
              >
                {isLoadingReport ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 py-6">

      {/* Report Results Section */}
      {reportData.length > 0 && (
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-3 pt-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-gray-600" />
                Report Results
              </CardTitle>
              <Badge variant="secondary" className="text-sm">
                {reportData.length} Employee(s)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 pb-4">
            <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-30">
                  <tr className="border-b-2 border-gray-400 bg-gradient-to-r from-gray-50 to-gray-100">
                    <th className="sticky left-0 z-30 text-left py-4 px-5 text-sm font-bold text-gray-900 uppercase tracking-wide bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-300">
                      Employee Name
                    </th>
                    <th className="sticky left-[180px] z-30 text-left py-4 px-5 text-sm font-bold text-gray-900 uppercase tracking-wide bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-300">
                      Employee ID
                    </th>
                    <th className="sticky left-[280px] z-30 text-left py-4 px-5 text-sm font-bold text-gray-900 uppercase tracking-wide bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-300">
                      Email
                    </th>
                    <th className="text-left py-4 px-5 text-sm font-bold text-gray-900 uppercase tracking-wide bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-300">
                      Project Name
                    </th>
                    <th className="text-right py-4 px-5 text-sm font-bold text-gray-900 uppercase tracking-wide bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-300">
                      Hours
                    </th>
                    <th className="text-right py-4 px-5 text-sm font-bold text-gray-900 uppercase tracking-wide bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-300">
                      Days Worked
                    </th>
                    <th className="text-left py-4 px-5 text-sm font-bold text-gray-900 uppercase tracking-wide bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-300">
                      Date Range
                    </th>
                    <th className="text-right py-4 px-5 text-sm font-bold text-gray-900 uppercase tracking-wide border-l-2 border-gray-400 bg-gradient-to-r from-gray-50 to-gray-100">
                      Total Hours
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((employee, empIndex) => {
                    const hasProjects = employee.projects && employee.projects.length > 0;
                    const rowSpan = hasProjects ? employee.projects.length : 1;
                    const isEvenEmployee = empIndex % 2 === 0;
                    
                    return (
                      <React.Fragment key={employee.employeeId}>
                        {hasProjects ? (
                          employee.projects.map((project, projIndex) => (
                            <tr
                              key={`${employee.employeeId}-${project.projectId}`}
                              className={`border-b border-gray-200 transition-colors ${
                                isEvenEmployee 
                                  ? (projIndex === 0 ? 'bg-gray-50' : 'bg-gray-50/70') 
                                  : (projIndex === 0 ? 'bg-white' : 'bg-gray-50/50')
                              } hover:bg-gray-100`}
                            >
                              {projIndex === 0 && (
                                <>
                                  <td
                                    rowSpan={rowSpan}
                                    className={`sticky left-0 z-10 py-4 px-5 text-sm text-gray-900 align-top border-r border-gray-300 ${
                                      isEvenEmployee ? 'bg-gray-50' : 'bg-white'
                                    }`}
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-base">{employee.employeeName}</span>
                                    </div>
                                  </td>
                                  <td
                                    rowSpan={rowSpan}
                                    className={`sticky left-[180px] z-10 py-4 px-5 text-sm text-gray-700 align-top border-r border-gray-300 ${
                                      isEvenEmployee ? 'bg-gray-50' : 'bg-white'
                                    }`}
                                  >
                                    {employee.employeeCode || '-'}
                                  </td>
                                  <td
                                    rowSpan={rowSpan}
                                    className={`sticky left-[280px] z-10 py-4 px-5 text-sm text-gray-600 align-top border-r border-gray-300 ${
                                      isEvenEmployee ? 'bg-gray-50' : 'bg-white'
                                    }`}
                                  >
                                    {employee.employeeEmail || '-'}
                                  </td>
                                </>
                              )}
                              <td className="py-4 px-5 text-sm text-gray-900 border-r border-gray-300">
                                {project.projectName}
                              </td>
                              <td className="py-4 px-5 text-sm text-gray-900 text-right border-r border-gray-300">
                                {formatHours(project.totalHours)}
                              </td>
                              <td className="py-4 px-5 text-sm text-gray-700 text-right border-r border-gray-300">
                                {project.daysWorked}
                              </td>
                              <td className="py-4 px-5 text-sm text-gray-600 border-r border-gray-300">
                                {project.firstEntryDate === project.lastEntryDate
                                  ? new Date(project.firstEntryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                  : `${new Date(project.firstEntryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date(project.lastEntryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                              </td>
                              {projIndex === 0 && (
                                <td
                                  rowSpan={rowSpan}
                                  className="py-4 px-5 text-base text-gray-900 text-right align-top border-l-2 border-gray-400 bg-gray-100"
                                >
                                  {formatHours(employee.totalHours)}
                                </td>
                              )}
                            </tr>
                          ))
                        ) : (
                          <tr className={`border-b-2 border-gray-300 ${isEvenEmployee ? 'bg-gray-50' : 'bg-white'}`}>
                            <td className={`sticky left-0 z-10 py-4 px-5 text-sm text-gray-900 border-r border-gray-300 ${isEvenEmployee ? 'bg-gray-50' : 'bg-white'}`}>
                              {employee.employeeName}
                            </td>
                            <td className={`sticky left-[180px] z-10 py-4 px-5 text-sm text-gray-700 border-r border-gray-300 ${isEvenEmployee ? 'bg-gray-50' : 'bg-white'}`}>
                              {employee.employeeCode || '-'}
                            </td>
                            <td className={`sticky left-[280px] z-10 py-4 px-5 text-sm text-gray-600 border-r border-gray-300 ${isEvenEmployee ? 'bg-gray-50' : 'bg-white'}`}>
                              {employee.employeeEmail || '-'}
                            </td>
                            <td colSpan="4" className="py-4 px-5 text-sm text-gray-500 text-center italic border-r border-gray-300">
                              No timesheet entries found
                            </td>
                            <td className="py-4 px-5 text-base text-gray-900 text-right border-l-2 border-gray-400 bg-gray-100">
                              {formatHours(employee.totalHours)}
                            </td>
                          </tr>
                        )}
                        {/* Employee Sub Total Row */}
                        {hasProjects && (
                          <tr className="border-b-2 border-gray-400 bg-gradient-to-r from-gray-100 to-gray-200">
                            <td colSpan="3" className="sticky left-0 z-10 py-4 px-5 text-sm text-gray-900 text-right border-r border-gray-300 bg-gradient-to-r from-gray-100 to-gray-200">
                              Sub-Total for {employee.employeeName}:
                            </td>
                            <td className="py-4 px-5 border-r border-gray-300"></td>
                            <td className="py-4 px-5 text-base text-gray-900 text-right border-r border-gray-300">
                              {formatHours(employee.projectTotal)}
                            </td>
                            <td colSpan="2" className="py-4 px-5 border-r border-gray-300"></td>
                            <td className="py-4 px-5 text-base text-gray-900 text-right border-l-2 border-gray-400 bg-gray-100">
                              {formatHours(employee.totalHours)}
                            </td>
                          </tr>
                        )}
                        {/* Spacer row between employees for better visual separation */}
                        {empIndex < reportData.length - 1 && (
                          <tr>
                            <td colSpan="8" className="py-2 bg-transparent"></td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {reportData.length === 0 && !isLoadingReport && (
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Report Generated
              </h3>
              <p className="text-sm text-gray-600 max-w-md mx-auto">
                Select employees and date range, then click "Generate Report" to view the time analysis.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
};

export default EmployeeTimeAnalysisPage;

