import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../context/AuthContext';
import { apiGet, apiPut } from '../../utils/api';
import {
  ChevronDown,
  ChevronRight,
  Search,
  CheckCircle2,
  XCircle,
  User,
  AlertCircle,
  Loader2
} from 'lucide-react';

// Proof of loading
console.log("--- LOADING PendingApprovals V4 (Detailed View) ---");

const PendingApprovals = () => {
  // Filters State
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Data State
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [myProjects, setMyProjects] = useState([]);
  const [relevantEmployees, setRelevantEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // For initial list load
  const [error, setError] = useState(null);
  
  // --- Filtering Logic ---
  const filteredApprovals = pendingApprovals.filter(approval => {
    if (selectedEmployee !== 'all' && approval.userId !== selectedEmployee) return false;
    // Check if any project in this timesheet matches the selected project filter
    if (selectedProject !== 'all') {
      const hasMatchingProject = approval.projects?.some(p => p.projectId === selectedProject);
      if (!hasMatchingProject) return false;
    }
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesEmployee = approval.userName?.toLowerCase().includes(searchLower);
      const matchesProject = approval.projects?.some(p => 
        p.projectName?.toLowerCase().includes(searchLower)
      );
      return matchesEmployee || matchesProject;
    }
    return true;
  });
  
  // Separate pending and draft timesheets from filtered results
  const pendingTimesheets = filteredApprovals.filter(ts => ts.timesheetStatus === 'pending');
  const draftTimesheets = filteredApprovals.filter(ts => ts.timesheetStatus === 'draft');

  // --- NEW: State for Detailed Entries ---
  const [detailedEntries, setDetailedEntries] = useState({}); // Key: timesheetId, Value: { isLoading: bool, entries: [], error: string|null }

  // UI State
  const [expandedTimesheets, setExpandedTimesheets] = useState(new Set()); // Stores timesheet IDs
  const [comments, setComments] = useState({});
  const [loadingStates, setLoadingStates] = useState({}); // { approvalId: { approving: bool, rejecting: bool } }
  const [expandedDescriptions, setExpandedDescriptions] = useState(new Set()); // Stores description IDs that are expanded
  
  // Rejection Modal State
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [selectedApprovalForRejection, setSelectedApprovalForRejection] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { toast } = useToast();
  const { user } = useAuth();

  // Helper function to check if a project belongs to the current manager
  const isMyProject = useCallback((projectId) => {
    // Only highlight for Project Managers (not admins)
    if (!user?.isProjectManager || user?.isAdmin || !projectId) return false;
    
    // Normalize IDs to strings for comparison
    const normalizedProjectId = String(projectId);
    return myProjects.some(project => {
      const normalizedMyProjectId = String(project.id);
      return normalizedMyProjectId === normalizedProjectId;
    });
  }, [myProjects, user?.isProjectManager, user?.isAdmin]);

  // --- Data Fetching ---
  const fetchPendingData = useCallback(async () => {
    if (!user || !user.id) {
      console.log("User not available, skipping fetchPendingData");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const currentUserId = user.id; // Use actual user ID from auth context

      const approvalsResult = await apiGet('/api/approvals/pending');
      if (!approvalsResult.success || !Array.isArray(approvalsResult.data)) {
        throw new Error(approvalsResult.error || 'Failed to fetch pending approvals.');
      }
      // Ensure timesheetId is present
      const approvalsWithTimesheetId = approvalsResult.data.filter(appr => appr.timesheetId);
      setPendingApprovals(approvalsWithTimesheetId);
      console.log("Fetched Approvals:", approvalsWithTimesheetId);


      const projectsResult = await apiGet(`/api/projects?projectManagerId=${currentUserId}`);
       if (projectsResult.success && Array.isArray(projectsResult.data)) {
           setMyProjects(projectsResult.data);
           console.log("Fetched My Projects:", projectsResult.data);
       } else {
           console.error("Failed to fetch PM's projects:", projectsResult);
       }

       // Build employee list from both pending and draft timesheets
       const employeeMap = new Map();
       approvalsWithTimesheetId.forEach(appr => {
           if (appr.userId && appr.userName && !employeeMap.has(appr.userId)) {
               employeeMap.set(appr.userId, appr.userName);
           }
       });
       setRelevantEmployees(Array.from(employeeMap, ([id, name]) => ({ id, name })));
       console.log("Fetched Timesheets:", {
         total: approvalsWithTimesheetId.length,
         pending: approvalsWithTimesheetId.filter(ts => ts.timesheetStatus === 'pending').length,
         draft: approvalsWithTimesheetId.filter(ts => ts.timesheetStatus === 'draft').length
       });

    } catch (err) {
      console.error("Error fetching pending data:", err);
      setError(err.message || 'An unexpected error occurred.');
      toast({ title: "Error", description: "Could not load pending approvals.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, user]);

  // Initial data load
  useEffect(() => {
    fetchPendingData();
  }, [fetchPendingData]);

  // --- NEW: Function to Fetch Detailed Entries ---
  const fetchDetailedEntries = useCallback(async (timesheetId) => {
      if (!timesheetId || detailedEntries[timesheetId]?.entries) return; // Don't fetch if already loaded or no ID

      console.log(`Fetching details for timesheetId: ${timesheetId}`);
      setDetailedEntries(prev => ({
          ...prev,
          [timesheetId]: { isLoading: true, entries: null, error: null }
      }));

      try {
          const result = await apiGet(`/api/timesheets/${timesheetId}/entries`);

          if (result.success && Array.isArray(result.data)) {
              console.log(`Fetched ${result.data.length} entries for ${timesheetId}`);
              
              // Deduplicate entries: keep only the latest entry per date+project combination
              const seen = new Map(); // Key: `${entryDate}_${projectId}`, Value: entry
              const deduplicatedEntries = [];
              
              result.data.forEach(entry => {
                  const key = `${entry.entryDate}_${entry.projectId}`;
                  const existing = seen.get(key);
                  
                  if (!existing) {
                      seen.set(key, entry);
                      deduplicatedEntries.push(entry);
                  } else {
                      // Keep the entry with the higher ID (more recent)
                      const existingId = existing.id ? parseInt(existing.id, 10) : 0;
                      const currentId = entry.id ? parseInt(entry.id, 10) : 0;
                      
                      if (currentId > existingId) {
                          // Replace the existing entry with this one
                          const index = deduplicatedEntries.findIndex(e => e.id === existing.id);
                          if (index !== -1) {
                              deduplicatedEntries[index] = entry;
                          }
                          seen.set(key, entry);
                      }
                      // Otherwise, skip this duplicate
                  }
              });
              
              if (deduplicatedEntries.length !== result.data.length) {
                  console.warn(`⚠️ Deduplicated ${result.data.length} entries down to ${deduplicatedEntries.length} for timesheet ${timesheetId}`);
              }
              
              setDetailedEntries(prev => ({
                  ...prev,
                  [timesheetId]: { isLoading: false, entries: deduplicatedEntries, error: null }
              }));
          } else {
              throw new Error(result.error || 'Failed to fetch entries.');
          }
      } catch (err) {
          console.error(`Error fetching entries for ${timesheetId}:`, err);
          setDetailedEntries(prev => ({
              ...prev,
              [timesheetId]: { isLoading: false, entries: null, error: err.message }
          }));
          toast({ title: "Error", description: `Could not load details for timesheet ${timesheetId}.`, variant: "destructive"});
      }

  }, [toast, detailedEntries]); // Added detailedEntries dependency to prevent re-fetch if already loaded

  // --- UI Handlers ---
  const toggleTimesheetExpansion = (timesheetId) => {
    const isCurrentlyExpanded = expandedTimesheets.has(timesheetId);
    const newSet = new Set(expandedTimesheets);

    if (isCurrentlyExpanded) {
      newSet.delete(timesheetId);
    } else {
      newSet.add(timesheetId);
      // --- Trigger fetch ONLY when expanding ---
      fetchDetailedEntries(timesheetId);
    }
    setExpandedTimesheets(newSet);
  };


  const handleCommentChange = (approvalId, value) => { /* ... (no changes needed) ... */
    setComments(prev => ({ ...prev, [approvalId]: value }));
  };

  // --- API Action Handlers ---
  const handleApproveTimesheet = async (approval, employeeName) => {
    // Prevent multiple clicks
    if (loadingStates[approval.id]?.approving) {
      return;
    }
    
    const comment = comments[approval.id] || 'Approved';
    
    // Set loading state
    setLoadingStates(prev => ({
      ...prev,
      [approval.id]: { ...prev[approval.id], approving: true }
    }));
    
    try {
      // Approve all approvals for this timesheet (one per project)
      // Fallback to single approval ID if approvalIds array doesn't exist (backward compatibility)
      const approvalIds = approval.approvalIds && approval.approvalIds.length > 0 
        ? approval.approvalIds 
        : [approval.id];
      
      // Make API calls
      const approvalPromises = approvalIds.map(approvalId => 
        apiPut(`/api/approvals/${approvalId}/approve`, { comments: comment })
      );
      
      const results = await Promise.all(approvalPromises);
      const failed = results.filter(r => !r.success);
      
      if (failed.length > 0) {
        toast({ title: "Error", description: `Failed to approve: ${failed[0].error || 'Some approvals failed'}`, variant: "destructive" });
        throw new Error(failed[0].error || 'Some approvals failed');
      }
      
      // Show success message after API confirms success
      toast({ title: "Timesheet Approved", description: `${employeeName}'s timesheet approved.`, variant: "success" });
      setComments(prev => ({ ...prev, [approval.id]: '' }));
      
      // Refresh data after successful approval
      fetchPendingData();
    } catch (err) {
      console.error("Approve error:", err);
      // Only show error if not already shown above
      if (!err.message || !err.message.includes('Some approvals failed')) {
      toast({ title: "Error", description: `Failed to approve: ${err.message}`, variant: "destructive" });
      }
    } finally {
      // Clear loading state
      setLoadingStates(prev => ({
        ...prev,
        [approval.id]: { ...prev[approval.id], approving: false }
      }));
    }
  };

  // Open rejection modal
  const handleRejectClick = (approval, employeeName) => {
    setSelectedApprovalForRejection({ approval, employeeName });
    setRejectionReason('');
    setRejectionModalOpen(true);
  };

  // Close rejection modal without action
  const handleRejectModalCancel = () => {
    setRejectionModalOpen(false);
    setSelectedApprovalForRejection(null);
    setRejectionReason('');
  };

  // Confirm rejection with reason
  const handleRejectConfirm = async () => {
    if (!selectedApprovalForRejection) return;
    
    const { approval, employeeName } = selectedApprovalForRejection;
    
    // Validate rejection reason
    if (!rejectionReason || rejectionReason.trim() === '') {
      toast({ 
        title: "Rejection Reason Required", 
        description: "Please provide a reason for rejection.", 
        variant: "destructive" 
      });
      return;
    }
    
    // Prevent multiple clicks
    if (loadingStates[approval.id]?.rejecting) {
      return;
    }
    
    // Set loading state
    setLoadingStates(prev => ({
      ...prev,
      [approval.id]: { ...prev[approval.id], rejecting: true }
    }));
    
    try {
      // Reject all approvals for this timesheet (one per project)
      // Fallback to single approval ID if approvalIds array doesn't exist (backward compatibility)
      const approvalIds = approval.approvalIds && approval.approvalIds.length > 0 
        ? approval.approvalIds 
        : [approval.id];
      
      // Make API calls
      const approvalPromises = approvalIds.map(approvalId => 
        apiPut(`/api/approvals/${approvalId}/reject`, { comments: rejectionReason.trim() })
      );
      
      const results = await Promise.all(approvalPromises);
      const failed = results.filter(r => !r.success);
      
      if (failed.length > 0) {
        toast({ title: "Error", description: `Failed to reject: ${failed[0].error || 'Some rejections failed'}`, variant: "destructive" });
        throw new Error(failed[0].error || 'Some rejections failed');
      }
      
      // Show success message after API confirms success
      toast({ 
        title: "Timesheet Rejected", 
        description: `${employeeName}'s timesheet has been rejected.`, 
        variant: "destructive" 
      });
      
      // Close modal and reset state
      setRejectionModalOpen(false);
      setSelectedApprovalForRejection(null);
      setRejectionReason('');
      setComments(prev => ({ ...prev, [approval.id]: '' }));
      
      // Refresh data after successful rejection
      fetchPendingData();
    } catch (err) {
      console.error("Reject error:", err);
      // Only show error if not already shown above
      if (!err.message || !err.message.includes('Some rejections failed')) {
        toast({ title: "Error", description: `Failed to reject: ${err.message}`, variant: "destructive" });
      }
    } finally {
      // Clear loading state
      setLoadingStates(prev => ({
        ...prev,
        [approval.id]: { ...prev[approval.id], rejecting: false }
      }));
    }
  };

  // Legacy handler for backward compatibility (if needed elsewhere)
  const handleRejectTimesheet = async (approval, employeeName) => {
    handleRejectClick(approval, employeeName);
  };

  // --- Render ---
  if (isLoading) { /* ... (Initial Loading State) ... */
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-slate-600">Loading pending approvals...</span>
      </div>
    );
  }

  if (error) { /* ... (Error State) ... */
     return (
       <div className="bg-red-50 p-8 rounded-lg border border-red-200 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-700 font-medium">Failed to load data</p>
          <p className="text-red-600 text-sm">{error}</p>
          <Button onClick={fetchPendingData} className="mt-4">Try Again</Button>
        </div>
    );
  }


  return (
    <div className="space-y-4 -mt-2">
      {/* Header & Filters Card */}
      <Card className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 pt-3">
         {/* ... (Header & Filters - No changes needed) ... */}
           <div className="flex items-center justify-between mb-3">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-semibold text-slate-900">Review Timesheets</h1>
            <p className="text-slate-600">Review timesheet submissions and drafts</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-100 text-blue-800 border-0">
              {draftTimesheets.length} Saved/Draft
            </Badge>
            <Badge className="bg-yellow-100 text-yellow-800 border-0">
              {pendingTimesheets.length} Pending
            </Badge>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-0.5 block">Project</label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger><SelectValue placeholder="All My Projects" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All My Projects</SelectItem>
                {myProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-0.5 block">Employee</label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger><SelectValue placeholder="All Employees" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {relevantEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
             <label className="text-sm font-medium text-gray-700 mb-0.5 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by employee or project..."
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Approvals List */}
      <div className="space-y-3">
        {filteredApprovals.map((approval) => {
          const isExpanded = expandedTimesheets.has(approval.timesheetId);
          const submittedDate = approval.createdAt ? new Date(approval.createdAt).toLocaleDateString() : 'N/A';
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const monthName = monthNames[approval.month - 1] || approval.month;
          const weekPeriod = `${monthName} ${approval.year}`;

          // --- NEW: Get details for this timesheet from state ---
          const details = detailedEntries[approval.timesheetId];
          const isLoadingDetails = details?.isLoading;
          const detailError = details?.error;
          const entriesData = details?.entries;

          return (
            <Card key={approval.timesheetId} className="bg-white border border-slate-200 shadow-sm overflow-hidden">
              {/* Collapsible Header - Single Line Layout */}
              <CardHeader
                className="cursor-pointer hover:bg-slate-50 transition-colors p-3"
                onClick={() => toggleTimesheetExpansion(approval.timesheetId)}
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  {/* Left Side - Employee Info */}
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {isExpanded ? <ChevronDown className="h-5 w-5 text-slate-500 flex-shrink-0" /> : <ChevronRight className="h-5 w-5 text-slate-500 flex-shrink-0" />}
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 space-y-0">
                      <p className="text-base font-medium text-slate-900 truncate">{approval.userName || 'Unknown User'}</p>
                      <p className="text-xs text-slate-500 truncate leading-tight">
                        {weekPeriod} • {approval.timesheetStatus === 'draft' 
                          ? `Last saved ${submittedDate}` 
                          : `Submitted ${submittedDate}`}
                      </p>
                    </div>
                  </div>

                  {/* Center - Hours and Status */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-blue-600">{Number(approval.timesheetTotalHours || approval.totalHours || 0).toFixed(1)}h</div>
                      <div className="text-xs text-slate-500">Total</div>
                    </div>
                    {approval.timesheetStatus === 'draft' ? (
                      <Badge className="bg-blue-100 text-blue-800 border-0">Saved/Draft</Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800 border-0">Pending</Badge>
                    )}
                  </div>

                  {/* Right Side - Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Action Buttons */}
                    {approval.timesheetStatus !== 'draft' && (
                      <div className="flex items-center space-x-2">
                        <Button 
                          size="sm" 
                          onClick={(e) => { e.stopPropagation(); handleApproveTimesheet(approval, approval.userName); }} 
                          className="bg-green-600 hover:bg-green-700"
                          disabled={loadingStates[approval.id]?.approving || loadingStates[approval.id]?.rejecting}
                        >
                          {loadingStates[approval.id]?.approving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Approving...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={(e) => { e.stopPropagation(); handleRejectClick(approval, approval.userName); }} 
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          disabled={loadingStates[approval.id]?.approving || loadingStates[approval.id]?.rejecting}
                        >
                          {loadingStates[approval.id]?.rejecting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Rejecting...
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>

              {/* Expanded Content */}
              {isExpanded && (
                <CardContent className="p-4 border-t border-slate-200">
                  {/* --- NEW: Detailed Entries Display --- */}
                  {isLoadingDetails && (
                    <div className="flex justify-center items-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                        <span className="ml-2 text-sm text-slate-600">Loading details...</span>
                    </div>
                  )}
                  {detailError && (
                     <div className="text-center py-4 text-sm text-red-600">
                        <AlertCircle className="h-5 w-5 mx-auto mb-1" />
                        Error loading details: {detailError}
                     </div>
                  )}
                  {entriesData && entriesData.length === 0 && !isLoadingDetails && !detailError && (
                       <div className="text-center py-4 text-sm text-slate-500">No detailed entries found for this period.</div>
                  )}
                  {entriesData && entriesData.length > 0 && (
                      <div className="space-y-1">
                          <h4 className="text-sm font-medium text-slate-800 mb-1">Daily Entries:</h4>
                          {/* Table Container */}
                          <div className="border border-slate-200 rounded-md overflow-hidden">
                              <table className="w-full border-collapse table-fixed">
                                  <thead>
                                      <tr className="bg-slate-100 border-b-2 border-slate-300">
                                          <th className="text-left py-1.5 px-2 text-xs font-semibold text-slate-700 border-r border-slate-300" style={{ width: '12%' }}>Date</th>
                                          <th className="text-left py-1.5 px-2 text-xs font-semibold text-slate-700 border-r border-slate-300" style={{ width: '20%' }}>Project Name</th>
                                          <th className="text-center py-1.5 px-2 text-xs font-semibold text-slate-700 border-r border-slate-300" style={{ width: '10%' }}>Working Hours</th>
                                          <th className="text-left py-1.5 px-2 text-xs font-semibold text-slate-700 border-r border-slate-300" style={{ width: '15%' }}>Day Status</th>
                                          <th className="text-left py-1.5 px-2 text-xs font-semibold text-slate-700" style={{ width: '43%' }}>Description</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {entriesData.sort((a,b) => new Date(a.entryDate) - new Date(b.entryDate)).map((entry, index) => {
                                          // Determine status display based on entry flags
                                          let dayStatus = 'Working Day';
                                          let description = entry.taskDescription || '-';
                                          let projectName = entry.projectName || 'Project details missing';
                                          
                                          if (entry.isHoliday) {
                                            dayStatus = 'Holiday';
                                            description = '-'; // Holiday entries don't have task descriptions
                                            projectName = '-'; // Holiday entries don't have project names
                                          } else if (entry.isLeave || entry.isOnLeave) {
                                            if (entry.leaveType === 'half-day') {
                                              dayStatus = 'Half Day Leave';
                                              projectName = 'Kadel Labs - Other'; // Set project name to "Kadel Labs - Other" for half-day leave
                                              // Keep task description for half-day leave (they have work entries)
                                            } else {
                                              dayStatus = 'Full Day Leave';
                                              description = '-'; // Full-day leave entries don't have task descriptions
                                              projectName = '-'; // Full-day leave entries don't have project names
                                            }
                                          }
                                          
                                          const descriptionId = `${approval.timesheetId}-${entry.id || index}`;
                                          const isDescriptionExpanded = expandedDescriptions.has(descriptionId);
                                          const MAX_DESCRIPTION_LENGTH = 50;
                                          const shouldTruncate = description && description.length > MAX_DESCRIPTION_LENGTH && description !== '-';
                                          const displayDescription = shouldTruncate && !isDescriptionExpanded 
                                            ? description.substring(0, MAX_DESCRIPTION_LENGTH) 
                                            : description;
                                          
                                          const toggleDescription = (e) => {
                                            e.stopPropagation();
                                            const newSet = new Set(expandedDescriptions);
                                            if (isDescriptionExpanded) {
                                              newSet.delete(descriptionId);
                                            } else {
                                              newSet.add(descriptionId);
                                            }
                                            setExpandedDescriptions(newSet);
                                          };
                                          
                                          // Check if this entry's project belongs to the current manager
                                          const belongsToMyProject = user?.isProjectManager && !user?.isAdmin && isMyProject(entry.projectId);
                                          
                                          return (
                                            <tr key={entry.id || index} className={`text-xs border-b border-slate-200 last:border-b-0 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100 transition-colors`}>
                                                <td className={`font-medium py-1.5 px-2 border-r border-slate-300 truncate ${
                                                  belongsToMyProject 
                                                    ? 'text-blue-600 bg-blue-50' 
                                                    : 'text-slate-600'
                                                }`}>
                                                    {new Date(entry.entryDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </td>
                                                <td className="text-slate-700 font-medium py-1.5 px-2 border-r border-slate-300 truncate" title={projectName}>
                                                    {projectName}
                                                </td>
                                                <td className="text-slate-900 font-semibold text-center py-1.5 px-2 border-r border-slate-300">
                                                    {Number(entry.hours || 0).toFixed(1)}h
                                                </td>
                                                <td className="text-slate-600 py-1.5 px-2 border-r border-slate-300 truncate">
                                                    {dayStatus}
                                                </td>
                                                <td className="text-slate-600 py-1.5 px-2">
                                                    {shouldTruncate ? (
                                                      <span>
                                                        <span className="break-words">{displayDescription}</span>
                                                        {!isDescriptionExpanded && <span>...</span>}
                                                        <button
                                                          onClick={toggleDescription}
                                                          className="text-black-600 hover:text-black-800 hover:underline ml-1 text-xs font-medium"
                                                        >
                                                          {isDescriptionExpanded ? 'read less' : 'read more'}
                                                        </button>
                                                      </span>
                                                    ) : (
                                                      <span className="break-words">{description}</span>
                                                    )}
                                                </td>
                                            </tr>
                                          );
                                      })}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  )}

                  {/* Mobile Action buttons */}
                  <div className="md:hidden flex items-center space-x-2 mt-3 justify-end">
                    <Button 
                      size="sm" 
                      onClick={(e) => { e.stopPropagation(); handleApproveTimesheet(approval, approval.userName); }} 
                      className="bg-green-600 hover:bg-green-700"
                      disabled={loadingStates[approval.id]?.approving || loadingStates[approval.id]?.rejecting}
                    >
                      {loadingStates[approval.id]?.approving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Approving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </>
                      )}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={(e) => { e.stopPropagation(); handleRejectClick(approval, approval.userName); }} 
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      disabled={loadingStates[approval.id]?.approving || loadingStates[approval.id]?.rejecting}
                    >
                      {loadingStates[approval.id]?.rejecting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Rejecting...
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}

        {/* No Results Message */}
        {filteredApprovals.length === 0 && !isLoading && (
          <Card className="bg-white p-8 rounded-lg border border-gray-200 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No timesheets found matching your criteria.</p>
            <p className="text-sm text-gray-400 mt-2">This includes both saved/draft and pending timesheets.</p>
          </Card>
        )}
      </div>

      {/* Rejection Modal */}
      <Dialog open={rejectionModalOpen} onOpenChange={(open) => {
        if (!open && !(selectedApprovalForRejection && loadingStates[selectedApprovalForRejection.approval?.id]?.rejecting)) {
          handleRejectModalCancel();
        }
      }}>
        <DialogContent className="sm:max-w-[400px] p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-semibold text-slate-900">
              Reject Timesheet
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              {selectedApprovalForRejection && (
                <>Reject timesheet for <strong>{selectedApprovalForRejection.employeeName}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label htmlFor="rejection-reason" className="text-xs font-medium text-slate-700">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 50) {
                    setRejectionReason(value);
                  }
                }}
                placeholder="Please provide a reason for rejecting this timesheet..."
                className="min-h-[80px] resize-y text-sm"
                rows={3}
                maxLength={50}
              />
              <p className="text-xs text-slate-500">
                A rejection reason is required (max 50 characters). This will be sent to the employee.
                {rejectionReason.length > 0 && (
                  <span className="ml-1 text-amber-600">({50 - rejectionReason.length} characters remaining)</span>
                )}
              </p>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-md p-2">
              <p className="text-xs font-medium text-amber-800">
                Are you sure you want to reject this timesheet?
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                This action cannot be undone. The employee will be notified and can resubmit after making corrections.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRejectModalCancel}
              disabled={selectedApprovalForRejection && loadingStates[selectedApprovalForRejection.approval?.id]?.rejecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRejectConfirm}
              disabled={!rejectionReason?.trim() || (selectedApprovalForRejection && loadingStates[selectedApprovalForRejection.approval?.id]?.rejecting)}
              className="bg-red-600 hover:bg-red-700"
            >
              {selectedApprovalForRejection && loadingStates[selectedApprovalForRejection.approval?.id]?.rejecting ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1.5" />
                  Reject Timesheet
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingApprovals;