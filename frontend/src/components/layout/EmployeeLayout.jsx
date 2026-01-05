import React, { useState, useEffect, useCallback, useRef, useContext } from 'react'; // <-- Added useContext
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Textarea } from '../ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useToast } from '../../hooks/use-toast';
import {
  LogOut,
  User,
  Mail,
  Send,
  FolderOpen,
  Shield,
  CheckCircle,
  ChevronDown,
  Settings,
  Loader2, // <-- Added Loader
  FileText, // <-- Added FileText for Save button
  Building2, // <-- Added Building2 for Add Client
  BarChart3, // <-- Added BarChart3 for Dashboard
  Calendar, // <-- Added Calendar for My Timesheet
  HelpCircle, // <-- Added HelpCircle for FAQs
  TrendingUp // <-- Added TrendingUp for Time Analysis
} from 'lucide-react';
import TimesheetEntry from '../employee/TimesheetEntry';
// Removed mockCurrentUser import

// --- NEW: Import AuthContext ---
import { AuthContext } from '../../context/AuthContext';
// --- END NEW IMPORT ---

const EmployeeLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Get current year and month dynamically
  const getCurrentYear = () => {
    return new Date().getFullYear();
  };
  
  const getCurrentMonthYear = () => {
    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();
    return `${month} ${year}`;
  };
  
  // State to track current date for automatic updates
  const [currentDate, setCurrentDate] = useState({
    year: getCurrentYear(),
    monthYear: getCurrentMonthYear()
  });
  
  // Update date periodically (every minute) to catch month/year changes
  useEffect(() => {
    const updateDate = () => {
      setCurrentDate({
        year: getCurrentYear(),
        monthYear: getCurrentMonthYear()
      });
    };
    
    // Update immediately
    updateDate();
    
    // Update every minute to catch month/year changes
    const interval = setInterval(updateDate, 60000);
    
    return () => clearInterval(interval);
  }, []);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [availableMonths, setAvailableMonths] = useState([]);
  const [projectRequestOpen, setProjectRequestOpen] = useState(false);
  const [requestDescription, setRequestDescription] = useState('');
  const [faqsOpen, setFaqsOpen] = useState(false);
  const [totalMonthHours, setTotalMonthHours] = useState(0);
  const [canSubmit, setCanSubmit] = useState(false);
  const [timesheetStatus, setTimesheetStatus] = useState('draft');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const handleSubmitTimesheetCallback = useRef(null);
  const handleSaveTimesheetCallback = useRef(null);


  // --- NEW: Get user and logout from context ---
  const { user, logout, isLoading } = useContext(AuthContext);
  // --- END NEW ---

  useEffect(() => {
    // Generate available months starting from employee's joining date
    if (!user || isLoading) {
      // Wait for user to load before generating months
      return;
    }

    const months = [];
    const now = new Date();
    
    // Get employee's joining date (createdAt)
    let joiningDate = null;
    if (user.createdAt) {
      joiningDate = new Date(user.createdAt);
      // Set to first day of the joining month
      joiningDate.setDate(1);
      joiningDate.setHours(0, 0, 0, 0);
    }
    
    // If no joining date, default to 13 months back (fallback)
    const startDate = joiningDate || new Date(now.getFullYear(), now.getMonth() - 12, 1);
    
    // Generate months from joining date (or startDate) to current month
    // Start from current month and go backwards to joining date (newest first)
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let currentDate = new Date(currentMonth);
    
    // Generate months going backwards from current month until we reach joining date
    // This creates an array with newest month first (matching original behavior)
    while (currentDate >= startDate) {
      const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      months.push({ key: monthKey, label: monthLabel });
      
      // Move to previous month
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    }
    
    setAvailableMonths(months);
    // Set selected month to current month (first in the list)
    if (months.length > 0) {
      setSelectedMonth(months[0].key);
    }
  }, [user, isLoading]);

  // --- MODIFIED: Use logout from context ---
  const handleSignOut = () => {
    console.log("Signing out...");
    logout(); // Call the logout function from AuthContext
    // No need to navigate, ProtectedRoute will handle redirect
  };
  // --- END MODIFICATION ---

  const handleProjectRequest = async () => {
    if (!requestDescription.trim()) {
      toast({ title: "Description Required", description: "Please provide a description...", variant: "destructive" });
      return;
    }
    
    if (requestDescription.trim().length > 500) {
      toast({ title: "Character Limit Exceeded", description: "Description must be 500 characters or less.", variant: "destructive" });
      return;
    }
    
    try {
      const { apiPost } = await import('../../utils/api');
      const result = await apiPost('/api/project-access-requests', {
        requestMessage: requestDescription.trim()
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to submit request');
      }
      
      toast({ title: "Project Request Sent", description: "Request sent to administrator.", variant: "success" });
      setRequestDescription('');
      setProjectRequestOpen(false);
    } catch (error) {
      console.error('Error submitting project request:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to submit request. Please try again.", 
        variant: "destructive" 
      });
    }
  };

  const registerSubmitHandler = useCallback((submitFunction) => { /* ... (no changes needed) ... */
    handleSubmitTimesheetCallback.current = submitFunction;
    console.log("Submit handler registered in Layout:", !!submitFunction);
  }, []);

  const registerSaveHandler = useCallback((saveFunction) => {
    handleSaveTimesheetCallback.current = saveFunction;
    console.log("Save handler registered in Layout:", !!saveFunction);
  }, []);

  const handleSaveTimesheet = () => {
    if (handleSaveTimesheetCallback.current) {
      console.log("Calling save handler from Layout...");
      handleSaveTimesheetCallback.current();
    } else {
      console.error("Save handler not registered from TimesheetEntry component!");
      toast({ title: "Error", description: "Save function not available.", variant: "destructive"});
    }
  };

  // Force refresh status after submission



  const handleSubmitTimesheet = () => { /* ... (no changes needed) ... */
    if (!canSubmit) {
      toast({ title: "Cannot Submit", description: "Please add at least one timesheet entry before submitting.", variant: "destructive" });
      return;
    }
    if (handleSubmitTimesheetCallback.current) {
        console.log("Calling submit handler from Layout...");
        handleSubmitTimesheetCallback.current();
    } else {
        console.error("Submit handler not registered from TimesheetEntry component!");
        toast({ title: "Error", description: "Submit function not available.", variant: "destructive"});
    }
  };


  const isCurrentMonth = () => { /* ... (no changes needed) ... */
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return selectedMonth === currentMonthKey;
  };

  // --- NEW: Handle loading state from AuthContext ---
  if (isLoading || !user) {
    // Show loading spinner if context is loading or user is somehow null after loading
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }
  // --- END NEW ---

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-20">
        <div className="flex items-center justify-between h-16 px-3 md:px-4 lg:px-6 w-full min-w-0">
          {/* Left Side */}
          <div className="flex items-center gap-3 md:gap-4 flex-shrink-0 min-w-0">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0">
              <img 
                src="/KL image.png" 
                alt="Kadel Labs" 
                className="h-10 md:h-16 flex-shrink-0 object-contain"
              />
            </div>
            
            {/* Month Selector - Hidden for Admin */}
            {!user.isAdmin && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm text-gray-600 font-medium whitespace-nowrap hidden sm:inline">View:</span>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-8 md:h-9 w-[130px] md:w-[150px] flex-shrink-0 text-sm">
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
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2 md:gap-2.5 min-w-0 flex-1 justify-end overflow-hidden">
            {/* Total Hours - Hidden for Admin */}
            {!user.isAdmin && (
              <div className="flex items-center gap-1.5 px-2 md:px-2.5 py-1.5 bg-blue-50 rounded-lg border border-blue-200 whitespace-nowrap flex-shrink-0">
                <span className="text-xs md:text-sm text-blue-700 font-medium hidden sm:inline">Total Hours:</span>
                <span className="text-xs md:text-sm text-blue-700 font-medium sm:hidden">Hours:</span>
                <span className="text-sm md:text-base font-semibold text-blue-900">{totalMonthHours}h</span>
              </div>
            )}
            
            {/* Submit Button - Hidden for Admin */}
            {!user.isAdmin && timesheetStatus === 'draft' && (
              <Button
                onClick={handleSubmitTimesheet}
                className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap flex-shrink-0 h-8 md:h-9 px-2.5 md:px-3 text-xs md:text-sm font-medium"
                disabled={!canSubmit || isSubmitting || isSaving}
                size="sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-1.5 flex-shrink-0 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-1.5 flex-shrink-0" />
                    <span className="hidden lg:inline">Submit for Approval</span>
                    <span className="lg:hidden">Submit</span>
                  </>
                )}
              </Button>
            )}

            {/* User Info */}
            <TooltipProvider>
              <div className="flex items-center gap-1.5 md:gap-2 pl-2 md:pl-3 border-l border-gray-200 min-w-0">
                <div className="w-7 h-7 md:w-8 md:h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-600" />
                </div>
                <div className="hidden lg:block min-w-0 max-w-[100px] md:max-w-[120px] lg:max-w-[140px] xl:max-w-[160px]">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xs md:text-sm font-medium text-gray-900 truncate leading-tight cursor-default">{user.name || 'Loading...'}</p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{user.name || 'Loading...'}</p>
                    </TooltipContent>
                  </Tooltip>
                  <p className="text-xs text-gray-500 truncate leading-tight">
                    {user.isAdmin ? 'Administrator' : user.isProjectManager ? 'Project Manager' : 'Employee'}
                  </p>
                </div>
              </div>
            </TooltipProvider>

            {/* Quick Actions */}
            {(user.isAdmin || user.isProjectManager) ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 hidden xl:flex h-8 md:h-9 px-2.5 md:px-3 text-xs md:text-sm">
                    <span className="hidden 2xl:inline">Quick Actions</span>
                    <span className="2xl:hidden">Actions</span>
                    <ChevronDown className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {user.isProjectManager ? (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/pm/dashboard')}>
                        <BarChart3 className="h-4 w-4 mr-2 text-purple-600" />
                        Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/pm/timesheet')}>
                        <Calendar className="h-4 w-4 mr-2 text-green-600" />
                        My Timesheet
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/pm/review-timesheets')}>
                        <CheckCircle className="h-4 w-4 mr-2 text-purple-600" />
                        Review Timesheets
                      </DropdownMenuItem>
                    </>
                  ) : null}
                  {user.isAdmin ? (
                    <>
                      {user.isProjectManager ? <DropdownMenuSeparator /> : null}
                      <DropdownMenuItem onClick={() => navigate('/admin/dashboard')}>
                        <BarChart3 className="h-4 w-4 mr-2 text-purple-600" />
                        Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/admin/clients')}>
                        <Building2 className="h-4 w-4 mr-2 text-green-600" />
                        Manage Clients
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/admin/projects')}>
                        <FolderOpen className="h-4 w-4 mr-2 text-blue-600" />
                        Manage Projects
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/admin/admins')}>
                        <Shield className="h-4 w-4 mr-2 text-red-600" />
                        Manage Admins
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/admin/notifications')}>
                        <Mail className="h-4 w-4 mr-2 text-orange-600" />
                        Notifications
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/admin/time-analysis')}>
                        <TrendingUp className="h-4 w-4 mr-2 text-indigo-600" />
                        Time Analysis Report
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/admin/project-hours')}>
                        <BarChart3 className="h-4 w-4 mr-2 text-blue-600" />
                        Project Hours View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/admin/configuration')}>
                        <Settings className="h-4 w-4 mr-2 text-gray-600" />
                        Manage Configuration
                      </DropdownMenuItem>
                      
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            {/* Settings Dropdown (Project Request & Sign Out) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center justify-center flex-shrink-0 h-8 md:h-9 w-8 md:w-9 p-0"
                  aria-label="Settings"
                >
                  <Settings className="h-4 w-4 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {!user.isAdmin && (
                  <>
                    <Dialog open={projectRequestOpen} onOpenChange={setProjectRequestOpen}>
                      <DialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Mail className="h-4 w-4 mr-2 text-gray-600" />
                          <span className="text-gray-900">Request Project Access</span>
                        </DropdownMenuItem>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Request Missing Project</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-slate-700">
                              Describe the project you need access to:
                            </label>
                            <div className="relative mt-2">
                            <Textarea
                              value={requestDescription}
                                onChange={(e) => {
                                  if (e.target.value.length <= 500) {
                                    setRequestDescription(e.target.value);
                                  }
                                }}
                              placeholder="Please provide project name, client details, and any other relevant information..."
                                className="pr-16"
                              rows={4}
                                maxLength={500}
                            />
                              <div className="absolute bottom-2 right-2 text-xs text-slate-400 pointer-events-none">
                                <span className={requestDescription.length > 450 ? 'text-orange-500' : requestDescription.length >= 500 ? 'text-red-500' : ''}>
                                  {requestDescription.length}/500
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setProjectRequestOpen(false)}> Cancel </Button>
                            <Button onClick={handleProjectRequest} className="bg-blue-600 hover:bg-blue-700"> Send Request </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <DropdownMenuSeparator />
                  </>
                )}
                <Dialog open={faqsOpen} onOpenChange={setFaqsOpen}>
                  <DialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <HelpCircle className="h-4 w-4 mr-2 text-gray-600" />
                      <span className="text-gray-900">FAQs</span>
                    </DropdownMenuItem>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                      <DialogTitle>Timesheet Management – FAQs</DialogTitle>
                    </DialogHeader>
                    <div className="overflow-y-auto flex-1 pr-2 faq-scrollbar">
                      <Accordion type="single" collapsible className="w-full faq-accordion">
                      <AccordionItem value="item-3" className="border-b border-gray-200">
                          <AccordionTrigger className="text-left font-medium text-gray-900 hover:no-underline text-base">
                            What if I don't see my client / project name in the list?
                          </AccordionTrigger>
                          <AccordionContent className="text-gray-700 leading-relaxed">
                            If your client or project is not listed in the timesheet dropdown, click the Settings icon (⚙️) located at the top-right corner of the Employee page. Select "Request Project Access", then enter the required project and client details in the form provided.
                            
                            Once submitted, your request will be sent to the Admin for review and approval. After approval, the project will appear in your timesheet for selection.
                          </AccordionContent>
                        </AccordionItem>
                        
                        <AccordionItem value="item-1" className="border-b border-gray-200">
                          <AccordionTrigger className="text-left font-medium text-gray-900 hover:no-underline text-base">
                            How do I fill the timesheet?
                          </AccordionTrigger>
                          <AccordionContent className="text-gray-700 leading-relaxed">
                            After signing in, you will be redirected to the Employee Timesheet page. For each working day, select the appropriate option from the dropdown available near the date. Then, search and select the client you are working for, followed by choosing the relevant project name.
                            
                            Next, enter the number of hours worked for that day and provide a clear, concise, and accurate task description explaining the work you performed. Ensure that the task description reflects the actual activities completed during the day.
                            
                            Once all the required details are entered and verified, click Save to record the timesheet entry.
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-2" className="border-b border-gray-200">
                          <AccordionTrigger className="text-left font-medium text-gray-900 hover:no-underline text-base">
                            Can I log hours for multiple projects on the same day?
                          </AccordionTrigger>
                          <AccordionContent className="text-gray-700 leading-relaxed">
                            Yes, you can log hours for multiple projects on a single day. To do this, use the (+) button next to the existing entry to add a new project row for that day.
                            
                            For each additional project, you can enter the project name, worked hours, and a clear task description. If you need to remove a project entry, simply click the (−) button next to the corresponding entry.
                          </AccordionContent>
                        </AccordionItem>

                        

                        <AccordionItem value="item-4" className="border-b border-gray-200">
                          <AccordionTrigger className="text-left font-medium text-gray-900 hover:no-underline text-base">
                            What should I do if I want to take leave for a day?
                          </AccordionTrigger>
                          <AccordionContent className="text-gray-700 leading-relaxed">
                            If you wish to apply for leave for a specific day, select the Leave option from the working day dropdown available for that date. Once selected, the system will mark the day as a leave.
                            
                            The leave will be automatically considered in your timesheet, and 8 hours will be added to your total working hours in accordance with the company's leave policy.
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-5" className="border-b border-gray-200">
                          <AccordionTrigger className="text-left font-medium text-gray-900 hover:no-underline text-base">
                            What should I do if a day is declared as a holiday?
                          </AccordionTrigger>
                          <AccordionContent className="text-gray-700 leading-relaxed">
                            If a particular day is declared as a holiday, select the Holiday option from the working day dropdown for that date. Once selected, the system will mark the day as a holiday.
                            
                            The holiday will be automatically accounted for in your timesheet, and 8 hours will be added to your total working hours as per the company policy.
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-6" className="border-b border-gray-200">
                          <AccordionTrigger className="text-left font-medium text-gray-900 hover:no-underline text-base">
                            How do I log a half-day leave?
                          </AccordionTrigger>
                          <AccordionContent className="text-gray-700 leading-relaxed">
                            If you took a half-day leave, the system will automatically add 4 hours to your total working hours. You can also enter the actual hours you worked that day, and both will be counted. For regular working days, only the hours you enter will be counted.
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-7" className="border-b border-gray-200">
                          <AccordionTrigger className="text-left font-medium text-gray-900 hover:no-underline text-base">
                            What should I do if I want to take leave at the end of the month?
                          </AccordionTrigger>
                          <AccordionContent className="text-gray-700 leading-relaxed">
                            If you plan to take leave at the end of the month, ensure that you complete and fill in the timesheet for all working days prior to your leave. For the days you intend to take leave, select the Leave option from the working day dropdown for each applicable date.
                           
                            After marking the leave days and verifying all entries, submit the timesheet for approval. This ensures that your leave is properly recorded and the timesheet is processed without delays.
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-8" className="border-b border-gray-200">
                          <AccordionTrigger className="text-left font-medium text-gray-900 hover:no-underline text-base">
                            Can I fill timesheet entries on weekends?
                          </AccordionTrigger>
                          <AccordionContent className="text-gray-700 leading-relaxed">
                            No, timesheet entries for weekends are currently disabled in this version, as weekends are considered company off days.
                            
                            In future versions, the system may allow logging hours on weekends if required.
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-9" className="border-b border-gray-200">
                          <AccordionTrigger className="text-left font-medium text-gray-900 hover:no-underline text-base">
                            How can I save a partially completed timesheet?
                          </AccordionTrigger>
                          <AccordionContent className="text-gray-700 leading-relaxed">
                            If you have filled in the timesheet for a partial working period, click the Save button available at the top-right corner of the page. This action will save your timesheet as a draft.
                            
                            A saved draft can be edited, updated, and re-saved at any time before final submission, allowing you to complete your timesheet gradually as needed.
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-10" className="border-b border-gray-200">
                          <AccordionTrigger className="text-left font-medium text-gray-900 hover:no-underline text-base">
                            What does the "Submit for Approval" button do?
                          </AccordionTrigger>
                          <AccordionContent className="text-gray-700 leading-relaxed">
                            The Submit for Approval button allows you to send your completed timesheet to your Project Manager for review and approval.
                            
                            You can submit your timesheet only after completing a minimum of 160 total working hours for the month. Once submitted, the timesheet will be locked for editing, and the manager will review and approve the entries.
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>

                      <div className="mt-8 pt-6 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Do's & Don'ts (Important Guidelines)</h3>
                        <ul className="space-y-3 text-gray-700">
                          <li className="flex items-start">
                            <span className="text-gray-600 mr-2 font-semibold">•</span>
                            <span>For a full working day, you can enter a maximum of 12 hours only.</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-gray-600 mr-2 font-semibold">•</span>
                            <span>For a half-day, you can enter a maximum of 6 hours only.</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-gray-600 mr-2 font-semibold">•</span>
                            <span>Timesheets can be submitted for approval only after the total working hours reach a minimum of 160 hours for the month.</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-gray-600 mr-2 font-semibold">•</span>
                            <span>Multiple entries for the same client + project on the same day must not be submitted (in this version). </span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-gray-700 hover:text-gray-900 focus:text-gray-900 focus:bg-gray-50">
                  <LogOut className="h-4 w-4 mr-2 text-gray-600" />
                  <span className="text-gray-900">Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Modals */}
       {/* ... (All Modals - no changes needed, they use API data now) ... */}


      {/* Main Content */}
      <div className="pt-16 flex-1 flex flex-col">
        <main className={`flex-1 ${children ? 'p-6' : 'p-4 pt-3'}`}>
          {children ? (
            children
          ) : (
            <TimesheetEntry
              selectedMonth={selectedMonth}
              onHoursChange={setTotalMonthHours}
              onCanSubmitChange={setCanSubmit}
              onSubmitTimesheet={registerSubmitHandler}
              onSaveTimesheet={registerSaveHandler}
              onStatusChange={setTimesheetStatus}
              onSubmitLoadingChange={setIsSubmitting}
              onSaveLoadingChange={setIsSaving}
            />
          )}
        </main>
      </div>

      {/* Footer */}
        {/* ... (Footer - no changes needed) ... */}
          <footer className="bg-white border-t border-gray-200 py-4">
        <div className="px-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <p className="text-sm text-gray-500">
              © {currentDate.year} Kadel Labs. All rights reserved.
            </p>
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <span>Version 1.0.0</span>
              <span>•</span>
              <span>Last updated: {currentDate.monthYear}</span>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <a href="/help" className="hover:text-gray-700">Help</a>
            <a href="/privacy" className="hover:text-gray-700">Privacy</a>
            <a href="/terms" className="hover:text-gray-700">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EmployeeLayout;