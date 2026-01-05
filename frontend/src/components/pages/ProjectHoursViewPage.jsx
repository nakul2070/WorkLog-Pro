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
import { Loader2, ChevronsUpDown, Calendar, FolderOpen, BarChart3 } from 'lucide-react';
import { cn } from '../../lib/utils';

const ProjectHoursViewPage = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reportData, setReportData] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [projectSelectOpen, setProjectSelectOpen] = useState(false);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Set default date range to current month
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setFromDate(firstDay.toISOString().split('T')[0]);
    setToDate(lastDay.toISOString().split('T')[0]);
  }, []);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    try {
      const result = await apiGet('/api/projects');
      if (result.success && Array.isArray(result.data)) {
        // Filter only active projects
        const activeProjects = result.data.filter(proj => proj.status !== 'cancelled');
        setProjects(activeProjects.sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load projects.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      const errorMessage = error?.message || (typeof error === 'string' ? error : 'Failed to load projects.');
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoadingProjects(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Toggle project selection
  const toggleProject = (projectId) => {
    setSelectedProjectIds(prev => {
      if (prev.includes(projectId)) {
        return prev.filter(id => id !== projectId);
      } else {
        return [...prev, projectId];
      }
    });
  };

  // Select all projects
  const selectAllProjects = () => {
    setSelectedProjectIds(projects.map(proj => proj.id));
  };

  // Clear all selections
  const clearAllProjects = () => {
    setSelectedProjectIds([]);
  };

  // Filter projects based on search
  const filteredProjects = projects.filter(proj => {
    if (!searchValue) return true;
    const searchLower = searchValue.toLowerCase();
    return (
      proj.name.toLowerCase().includes(searchLower) ||
      proj.projectCode?.toLowerCase().includes(searchLower) ||
      proj.clientName?.toLowerCase().includes(searchLower)
    );
  });

  // Fetch report data
  const fetchReport = useCallback(async () => {
    if (selectedProjectIds.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one project.',
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
      const projectIdsParam = selectedProjectIds.join(',');
      const result = await apiGet(
        `/api/timesheets/analysis/project-hours?projectIds=${encodeURIComponent(projectIdsParam)}&fromDate=${fromDate}&toDate=${toDate}`
      );

      if (result.success && Array.isArray(result.data)) {
        setReportData(result.data);
        toast({
          title: 'Report Generated',
          description: `Project hours analysis report generated for ${result.data.length} project(s).`,
          variant: 'success'
        });
      } else {
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
  }, [selectedProjectIds, fromDate, toDate, toast]);

  // Get selected project names for display
  const getSelectedProjectNames = () => {
    if (selectedProjectIds.length === 0) return 'Select projects...';
    if (selectedProjectIds.length === projects.length) return 'All projects selected';
    if (selectedProjectIds.length <= 3) {
      return selectedProjectIds
        .map(id => projects.find(proj => proj.id === id)?.name)
        .filter(Boolean)
        .join(', ');
    }
    return `${selectedProjectIds.length} project(s) selected`;
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
              {/* Project Filter */}
              <Popover open={projectSelectOpen} onOpenChange={setProjectSelectOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "h-10 min-w-[200px] justify-between",
                      !selectedProjectIds.length && "text-muted-foreground"
                    )}
                  >
                    <span className="truncate flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 shrink-0" />
                      {isLoadingProjects ? 'Loading...' : getSelectedProjectNames()}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="end">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search projects..."
                      value={searchValue}
                      onValueChange={setSearchValue}
                    />
                    <CommandList className="max-h-[300px]">
                      <CommandEmpty>
                        {isLoadingProjects ? 'Loading...' : 'No projects found.'}
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
                                selectAllProjects();
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
                                clearAllProjects();
                              }}
                              type="button"
                            >
                              Clear All
                            </Button>
                          </div>
                        </div>
                        {filteredProjects.map((project) => {
                          const isSelected = selectedProjectIds.includes(project.id);
                          return (
                            <CommandItem
                              key={project.id}
                              value={`${project.name} ${project.projectCode || ''} ${project.clientName || ''}`}
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
                                  toggleProject(project.id);
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
                                    toggleProject(project.id);
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
                                  <div className="font-medium">{project.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {project.projectCode} {project.clientName ? `• ${project.clientName}` : ''}
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
                disabled={isLoadingReport || selectedProjectIds.length === 0 || !fromDate || !toDate}
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
                {reportData.length} Project(s)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 pb-4">
            <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-30">
                  <tr className="border-b-2 border-gray-400 bg-gradient-to-r from-gray-50 to-gray-100">
                    <th className="sticky left-0 z-30 text-left py-4 px-5 text-sm font-bold text-gray-900 uppercase tracking-wide bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-300">
                      Project Name
                    </th>
                    <th className="sticky left-[200px] z-30 text-left py-4 px-5 text-sm font-bold text-gray-900 uppercase tracking-wide bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-300">
                      Project Manager
                    </th>
                    <th className="text-left py-4 px-5 text-sm font-bold text-gray-900 uppercase tracking-wide bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-300">
                      Employee Name
                    </th>
                    <th className="text-right py-4 px-5 text-sm font-bold text-gray-900 uppercase tracking-wide bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-300">
                      Worked Hours
                    </th>
                    <th className="text-right py-4 px-5 text-sm font-bold text-gray-900 uppercase tracking-wide bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-300">
                      Days Worked
                    </th>
                    <th className="text-right py-4 px-5 text-sm font-bold text-gray-900 uppercase tracking-wide border-l-2 border-gray-400 bg-gradient-to-r from-gray-50 to-gray-100">
                      Total Hours
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((project, projIndex) => {
                    const hasEmployees = project.employees && project.employees.length > 0;
                    const rowSpan = hasEmployees ? project.employees.length : 1;
                    const isEvenProject = projIndex % 2 === 0;
                    
                    return (
                      <React.Fragment key={project.projectId}>
                        {hasEmployees ? (
                          project.employees.map((employee, empIndex) => (
                            <tr
                              key={`${project.projectId}-${employee.employeeId}`}
                              className={`border-b border-gray-200 transition-colors ${
                                isEvenProject 
                                  ? (empIndex === 0 ? 'bg-gray-50' : 'bg-gray-50/70') 
                                  : (empIndex === 0 ? 'bg-white' : 'bg-gray-50/50')
                              } hover:bg-gray-100`}
                            >
                              {empIndex === 0 && (
                                <>
                                  <td
                                    rowSpan={rowSpan}
                                    className={`sticky left-0 z-10 py-4 px-5 text-sm text-gray-900 align-top border-r border-gray-300 ${
                                      isEvenProject ? 'bg-gray-50' : 'bg-white'
                                    }`}
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-base font-semibold">{project.projectName}</span>
                                      {project.projectCode && (
                                        <span className="text-xs text-gray-500 mt-0.5">{project.projectCode}</span>
                                      )}
                                    </div>
                                  </td>
                                  <td
                                    rowSpan={rowSpan}
                                    className={`sticky left-[200px] z-10 py-4 px-5 text-sm text-gray-700 align-top border-r border-gray-300 ${
                                      isEvenProject ? 'bg-gray-50' : 'bg-white'
                                    }`}
                                  >
                                    {project.projectManagerName || '-'}
                                  </td>
                                </>
                              )}
                              <td className="py-4 px-5 text-sm text-gray-900 border-r border-gray-300">
                                {employee.employeeName}
                              </td>
                              <td className="py-4 px-5 text-sm text-gray-900 text-right border-r border-gray-300">
                                {formatHours(employee.totalHours)}
                              </td>
                              <td className="py-4 px-5 text-sm text-gray-700 text-right border-r border-gray-300">
                                {employee.daysWorked}
                              </td>
                              {empIndex === 0 && (
                                <td
                                  rowSpan={rowSpan}
                                  className={`py-4 px-5 text-base text-gray-900 text-right align-top border-l-2 border-gray-400 ${
                                    isEvenProject ? 'bg-gray-50' : 'bg-white'
                                  }`}
                                >
                                  {formatHours(project.totalHours)}
                                </td>
                              )}
                            </tr>
                          ))
                        ) : (
                          <tr className={`border-b-2 border-gray-300 ${isEvenProject ? 'bg-gray-50' : 'bg-white'}`}>
                            <td className={`sticky left-0 z-10 py-4 px-5 text-sm text-gray-900 border-r border-gray-300 ${isEvenProject ? 'bg-gray-50' : 'bg-white'}`}>
                              <div className="flex flex-col">
                                <span className="text-base font-semibold">{project.projectName}</span>
                                {project.projectCode && (
                                  <span className="text-xs text-gray-500 mt-0.5">{project.projectCode}</span>
                                )}
                              </div>
                            </td>
                            <td className={`sticky left-[200px] z-10 py-4 px-5 text-sm text-gray-700 border-r border-gray-300 ${isEvenProject ? 'bg-gray-50' : 'bg-white'}`}>
                              {project.projectManagerName || '-'}
                            </td>
                            <td colSpan="3" className="py-4 px-5 text-sm text-gray-500 text-center italic border-r border-gray-300">
                              No timesheet entries found
                            </td>
                            <td className="py-4 px-5 text-base text-gray-900 text-right border-l-2 border-gray-400 bg-gray-100">
                              {formatHours(project.totalHours)}
                            </td>
                          </tr>
                        )}
                        {/* Project Sub Total Row */}
                        {hasEmployees && (
                          <tr className="border-b-2 border-gray-400 bg-gradient-to-r from-gray-100 to-gray-200">
                            <td colSpan="2" className="sticky left-0 z-10 py-4 px-5 text-sm text-gray-900 text-right border-r border-gray-300 bg-gradient-to-r from-gray-100 to-gray-200">
                              Sub-Total for {project.projectName}:
                            </td>
                            <td className="py-4 px-5 border-r border-gray-300"></td>
                            <td className="py-4 px-5 text-base text-gray-900 text-right border-r border-gray-300">
                              {formatHours(project.employeeTotal)}
                            </td>
                            <td className="py-4 px-5 border-r border-gray-300"></td>
                            <td className="py-4 px-5 text-base text-gray-900 text-right border-l-2 border-gray-400 bg-gray-100">
                              {formatHours(project.totalHours)}
                            </td>
                          </tr>
                        )}
                        {/* Spacer row between projects for better visual separation */}
                        {projIndex < reportData.length - 1 && (
                          <tr>
                            <td colSpan="6" className="py-2 bg-transparent"></td>
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
                Select projects and date range, then click "Generate Report" to view the project hours analysis.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
};

export default ProjectHoursViewPage;

