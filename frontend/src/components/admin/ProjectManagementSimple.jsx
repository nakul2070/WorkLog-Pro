import React, { useState, useEffect, useCallback, useRef } from 'react'; // <-- Added useCallback, useRef
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { useToast } from '../../hooks/use-toast';
import { apiGet, apiPost, apiPut, apiDelete } from '../../utils/api';
import {
  Plus,
  Trash2,
  FolderOpen,
  Loader2, // <-- Added Loader
  AlertCircle, // <-- Added Alert icon
  Check,
  ChevronsUpDown,
  Edit,
  Save,
  X,
  Search
} from 'lucide-react';
import { cn } from '../../lib/utils';
import AddProjectDialog from './AddProjectDialog';

// Proof of loading
console.log("--- LOADING ProjectManagementSimple V2 (API Integrated) ---");

// Searchable Client Select Component
const SearchableClientSelect = ({ value, onChange, clients = [], disabled, placeholder = "Select Client", className }) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  
  // Find selected client
  const selectedClient = clients.find(client => client.id.toString() === value?.toString());
  const displayValue = selectedClient ? selectedClient.name : '';
  
  // Filter clients based on search (case-insensitive)
  const searchLower = searchValue.toLowerCase();
  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchLower)
  );
  
  const hasResults = filteredClients.length > 0;
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-9 w-full justify-between font-normal", !displayValue && "text-muted-foreground", className)}
          disabled={disabled}
        >
          <span className="truncate">{displayValue || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Type to search client..." 
            value={searchValue}
            hideIcon
            onValueChange={setSearchValue}
          />
          <CommandList>
            {!hasResults && (
              <CommandEmpty>No clients found.</CommandEmpty>
            )}
            {hasResults && (
              <CommandGroup>
                {filteredClients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={`client-${client.id}`}
                    onSelect={() => {
                      onChange(client.id.toString());
                      setOpen(false);
                      setSearchValue('');
                    }}
                    className="p-0 cursor-pointer mb-1"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onChange(client.id.toString());
                        setOpen(false);
                        setSearchValue('');
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      className="flex items-center w-full text-left cursor-pointer hover:bg-accent px-2 py-2 -mx-2 -my-1.5 rounded-sm text-base"
                      style={{ pointerEvents: 'auto' }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          value?.toString() === client.id.toString() ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {client.name}
                    </button>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// Searchable Project Manager Input Component
const SearchablePMInput = ({ value, onChange, employees = [], disabled, placeholder = "Select PM", className }) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  
  // Normalize value to string for consistent comparison
  const normalizedValue = value?.toString() || '';
  
  // Find selected value from employees
  // Employees have 'id' which is the Office 365 ID
  // Projects have 'projectManagerOffice365Id' which should match employee 'id'
  // Also check for 'projectManagerId' (database ID) but prioritize Office 365 ID matching
  const selectedManager = employees.find(pm => {
    // Primary match: Office 365 ID to Office 365 ID
    if (pm.id?.toString() === normalizedValue) return true;
    // Fallback: check if employee has office365Id property that matches
    if (pm.office365Id?.toString() === normalizedValue) return true;
    return false;
  });
  const displayValue = selectedManager ? selectedManager.name : '';
  
  // Reset search when value changes externally (e.g., when edit mode starts)
  useEffect(() => {
    if (!open && searchValue) {
      setSearchValue('');
    }
  }, [value, open, searchValue]);
  
  // Filter employees based on search (case-insensitive)
  const searchLower = searchValue.toLowerCase();
  const filteredEmployees = employees.filter(employee => 
    employee.name.toLowerCase().includes(searchLower) ||
    (employee.email && employee.email.toLowerCase().includes(searchLower))
  );
  
  const hasResults = filteredEmployees.length > 0;
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-9 w-full justify-between font-normal", !displayValue && "text-muted-foreground", className)}
          disabled={disabled}
        >
          <span className="truncate">{displayValue || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search employees..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {!hasResults && (
              <CommandEmpty>No employees found.</CommandEmpty>
            )}
            {hasResults && (
              <>
                {filteredEmployees.length > 0 && (
                  <CommandGroup heading="Employees">
                    {filteredEmployees.map((employee) => (
                      <CommandItem
                        key={employee.id}
                        value={`employee-${employee.id}`}
                        onSelect={() => {
                          onChange(employee.id);
                          setOpen(false);
                          setSearchValue('');
                        }}
                        className="p-0"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onChange(employee.id);
                            setOpen(false);
                            setSearchValue('');
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                          }}
                          className="flex items-center w-full text-left cursor-pointer hover:bg-accent px-2 py-1.5 -mx-2 -my-1.5 rounded-sm"
                          style={{ pointerEvents: 'auto' }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0",
                              value?.toString() === employee.id?.toString() ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="truncate">{employee.name}</span>
                            {employee.email && (
                              <span className="text-xs text-muted-foreground truncate">{employee.email}</span>
                            )}
                          </div>
                        </button>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const ProjectManagementSimple = () => {
  const { toast } = useToast();

  // API Data States
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectManagerGroups, setProjectManagerGroups] = useState([]);
  const [projectManagerEmployees, setProjectManagerEmployees] = useState([]);

  // Loading/Error States
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // For add/update/delete actions
  const [error, setError] = useState(null);

  // Edit Mode States
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [originalProjectValues, setOriginalProjectValues] = useState(null);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [pendingCancelProjectId, setPendingCancelProjectId] = useState(null);
  
  // Delete Dialog State
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  // Add Project Dialog State
  const [addProjectOpen, setAddProjectOpen] = useState(false);

  // Filter States
  const [filterClient, setFilterClient] = useState('all');
  const [filterProjectManager, setFilterProjectManager] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [clientsResult, projectsResult, managersResult] = await Promise.all([
        apiGet('/api/projects/clients/all'),
        apiGet('/api/projects'),
        apiGet('/api/projects/managers') // Fetch from Office 365 instead of database
      ]);

      if (clientsResult.success && Array.isArray(clientsResult.data)) {
        setClients(clientsResult.data);
      } else {
        console.error("Failed to fetch clients:", clientsResult);
        throw new Error('Could not load clients.');
      }

      if (projectsResult.success && Array.isArray(projectsResult.data)) {
        setProjects(projectsResult.data);
      } else {
        console.error("Failed to fetch projects:", projectsResult);
        throw new Error('Could not load projects.');
      }

      if (managersResult.success) {
        // Only use employees, ignore groups
        const groups = Array.isArray(managersResult.groups) ? managersResult.groups : [];
        const employees = Array.isArray(managersResult.employees) ? managersResult.employees : [];
        setProjectManagerGroups([]); // Not used in UI anymore
        setProjectManagerEmployees(employees);
        console.log(`✅ Loaded ${employees.length} employees (${groups.length} groups ignored)`);
        
        // Warn if no employees were loaded, but don't throw error (allow UI to render)
        if (employees.length === 0) {
          console.warn('⚠️  No employees loaded from Office 365');
          toast({ 
            title: "Warning", 
            description: "No project managers found. Please check Office 365 configuration.", 
            variant: "destructive"
          });
        }
      } else {
        console.error("Failed to fetch project managers from Office 365:", managersResult);
        // Set empty arrays so UI can still render (dropdowns will just be empty)
        setProjectManagerGroups([]);
        setProjectManagerEmployees([]);
        throw new Error(managersResult.error || 'Could not load project managers from Office 365.');
      }

    } catch (err) {
      console.error("Error fetching initial data:", err);
      setError(err.message || 'Failed to load project data.');
      toast({ title: "Error", description: err.message || 'Failed to load project data.', variant: "destructive"});
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Filtering Logic ---
  const filteredProjects = projects.filter(project => {
    // Filter by client
    if (filterClient !== 'all') {
      const projectClientId = project.clientId?.toString();
      if (projectClientId !== filterClient) return false;
    }

    // Filter by project manager
    if (filterProjectManager !== 'all') {
      const projectManagerId = (project.projectManagerOffice365Id || project.projectManagerId)?.toString();
      if (projectManagerId !== filterProjectManager) return false;
    }

    // Filter by status
    if (filterStatus !== 'all') {
      if (project.status !== filterStatus) return false;
    }

    // Filter by search term (project name)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const projectName = (project.name || '').toLowerCase();
      if (!projectName.includes(searchLower)) return false;
    }

    return true;
  });

  // Listen for client added/updated/deleted events to refresh clients
  useEffect(() => {
    const handleClientAdded = () => {
      console.log('🔄 Client added event received in ProjectManagement, refreshing data...');
      fetchData();
    };

    const handleClientUpdated = () => {
      console.log('🔄 Client updated event received in ProjectManagement, refreshing data...');
      fetchData();
    };

    const handleClientDeleted = () => {
      console.log('🔄 Client deleted event received in ProjectManagement, refreshing data...');
      fetchData();
    };

    window.addEventListener('clientAdded', handleClientAdded);
    window.addEventListener('clientUpdated', handleClientUpdated);
    window.addEventListener('clientDeleted', handleClientDeleted);
    return () => {
      window.removeEventListener('clientAdded', handleClientAdded);
      window.removeEventListener('clientUpdated', handleClientUpdated);
      window.removeEventListener('clientDeleted', handleClientDeleted);
    };
  }, [fetchData]);


  // --- Action Handlers ---

  // Check if project has unsaved changes
  const hasUnsavedChanges = (projectId) => {
    if (editingProjectId !== projectId || !originalProjectValues) return false;
    const currentProject = projects.find(p => p.id === projectId);
    if (!currentProject) return false;

    // Compare all fields
    const fieldsToCompare = ['name', 'clientId', 'projectManagerId', 'startDate', 'endDate', 'status'];
    return fieldsToCompare.some(field => {
      const currentValue = currentProject[field];
      const originalValue = originalProjectValues[field];
      
      // Handle date comparison
      if (field === 'startDate' || field === 'endDate') {
        const currentDate = currentValue ? new Date(currentValue).toISOString().split('T')[0] : '';
        const originalDate = originalValue ? new Date(originalValue).toISOString().split('T')[0] : '';
        return currentDate !== originalDate;
      }
      
      // Handle ID comparison (convert to string for comparison)
      if (field === 'clientId' || field === 'projectManagerId') {
        const currentId = currentValue?.toString() || null;
        const originalId = originalValue?.toString() || null;
        return currentId !== originalId;
      }
      
      return currentValue !== originalValue;
    });
  };

  // Start editing a project
  const handleStartEdit = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    // Save original values - use projectManagerId if available, otherwise projectManagerOffice365Id
    const originalProjectManagerId = project.projectManagerId || project.projectManagerOffice365Id || null;
    
    setOriginalProjectValues({
      name: project.name,
      clientId: project.clientId,
      projectManagerId: originalProjectManagerId,
      startDate: project.startDate,
      endDate: project.endDate,
      status: project.status
    });
    setEditingProjectId(projectId);
  };

  // Save project changes
  const handleSaveProject = async (projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    setIsSubmitting(true);
    const originalProjects = [...projects];
    
    try {
      // Prepare payload with all project fields
      // For projectManagerId, send the Office 365 ID if available (from employee selection)
      // The backend will map it to database user ID
      // If projectManagerOffice365Id exists, use it; otherwise use projectManagerId (which might be Office 365 ID from selection)
      const projectManagerValue = project.projectManagerOffice365Id || project.projectManagerId;
      
      const payload = {
        name: project.name,
        clientId: project.clientId,
        projectManagerId: projectManagerValue, // Backend will map Office 365 ID to database user ID
        startDate: project.startDate || null,
        endDate: project.endDate || null,
        status: project.status || 'active'
      };

      const result = await apiPut(`/api/projects/${projectId}`, payload);
      if (!result.success) throw new Error(result.error || 'Failed to update project.');

      // Update local state with the response data
      // The backend returns both projectManagerId (database ID) and projectManagerOffice365Id (Office 365 ID)
      if (result.data) {
        setProjects(prevProjects =>
          prevProjects.map(p =>
            p.id === projectId ? { 
              ...p, 
              ...result.data,
              // Ensure projectManagerOffice365Id is preserved for display
              projectManagerOffice365Id: result.data.projectManagerOffice365Id || p.projectManagerOffice365Id
            } : p
          )
        );
      }

      toast({ title: "Project Updated", description: `${project.name} has been updated successfully.`, variant: "success" });
      
      // Exit edit mode
      setEditingProjectId(null);
      setOriginalProjectValues(null);

    } catch (err) {
      console.error(`Save project ${projectId} error:`, err);
      toast({ title: "Update Error", description: `Could not save changes: ${err.message}`, variant: "destructive" });
      // Revert optimistic update on error
      setProjects(originalProjects);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel editing (with confirmation if unsaved changes)
  const handleCancelEdit = (projectId) => {
    if (hasUnsavedChanges(projectId)) {
      setPendingCancelProjectId(projectId);
      setShowUnsavedChangesDialog(true);
    } else {
      handleDiscardChanges(projectId);
    }
  };

  // Discard changes and exit edit mode
  const handleDiscardChanges = (projectId) => {
    if (originalProjectValues) {
      // Revert to original values
      setProjects(prevProjects =>
        prevProjects.map(p =>
          p.id === projectId ? { ...p, ...originalProjectValues } : p
        )
      );
    }
    setEditingProjectId(null);
    setOriginalProjectValues(null);
    setShowUnsavedChangesDialog(false);
    setPendingCancelProjectId(null);
  };

  // Update project field (only updates local state when in edit mode)
  const handleUpdateProject = (id, field, value) => {
    // Only update if in edit mode
    if (editingProjectId !== id) return;
    
    // Update local state only (no API call)
    setProjects(prevProjects =>
      prevProjects.map(p =>
        p.id === id ? { ...p, [field]: value } : p
      )
    );
  };

  const handleDeleteProject = (id, name) => {
    // Open delete confirmation dialog
    setProjectToDelete({ id, name });
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;

    const { id, name } = projectToDelete;
    setIsSubmitting(true);
    const originalProjects = [...projects];
    // Optimistic UI update
    setProjects(prevProjects => prevProjects.filter(p => p.id !== id));

    try {
        const result = await apiDelete(`/api/projects/${id}`);
        if (!result.success) {
          // Extract user-friendly error message from backend
          const errorMessage = result.error || 'Delete failed.';
          throw new Error(errorMessage);
        }

        toast({ title: "Project Deleted", description: `"${name}" removed.`, variant: "success"});
        setShowDeleteDialog(false);
        setProjectToDelete(null);

    } catch (err) {
       console.error(`Delete project ${id} error:`, err);
       
       // Extract error message from the error object
       let errorMessage = err.message || 'Could not delete project. Please try again.';
       
       // Detect technical foreign key constraint errors and replace with user-friendly message
       // This handles cases where the backend might return a technical error message
       const errorLower = errorMessage.toLowerCase();
       if (errorLower.includes('foreign key constraint') ||
           errorLower.includes('cannot delete or update a parent row') ||
           errorLower.includes('a foreign key constraint fails') ||
           errorLower.includes('er_row_is_referenced') ||
           errorLower.includes('er_row_is_referenced_2') ||
           errorLower.includes('1451') ||
           errorLower.includes('integrity constraint violation') ||
           errorLower.includes('constraint violation')) {
         errorMessage = 'Project is already in use and cannot be deleted.';
       }
       
       toast({ title: "Delete Error", description: errorMessage, variant: "destructive" });
       // Revert optimistic update on error
       setProjects(originalProjects);
    } finally {
        setIsSubmitting(false);
    }
  };


  // --- Render ---
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2">Loading projects...</span>
      </div>
    );
  }

  if (error) {
     return (
       <div className="bg-red-50 p-6 rounded-lg border border-red-200 text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <p className="text-red-700 font-medium">Failed to load project data</p>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <Button onClick={fetchData}>Try Again</Button>
        </div>
     );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold text-gray-900">Project Management</h1>
          <p className="text-slate-600">Add, edit, and manage projects and clients.</p>
        </div>
        <Button
          onClick={() => setAddProjectOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Project
        </Button>
      </div>

      {/* Projects Table */}
      <Card>
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="flex items-center gap-1.5">
            <FolderOpen className="h-5 w-5" />
            All Projects ({filteredProjects.length}{filteredProjects.length !== projects.length ? ` of ${projects.length}` : ''})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {/* Filters */}
          <div className="mb-4 pb-4 border-b border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Client</label>
                <Select value={filterClient} onValueChange={setFilterClient}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Project Manager</label>
                <Select value={filterProjectManager} onValueChange={setFilterProjectManager}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Managers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Managers</SelectItem>
                    {projectManagerEmployees.map((pm) => (
                      <SelectItem key={pm.id} value={pm.id.toString()}>
                        {pm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by project name..."
                    className="pl-10 h-9"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="relative max-h-[600px] overflow-y-auto">
              <table className="w-full min-w-[1000px]"> {/* Added min-width */}
                <thead className="sticky top-0 z-20 bg-white shadow-sm">
                  <tr className="border-b border-slate-200">
                    <th className="text-left p-2 text-sm font-medium text-slate-700 w-[20%] bg-white">Project Name</th>
                    <th className="text-left p-2 text-sm font-medium text-slate-700 w-[15%] bg-white">Client</th>
                    <th className="text-left p-2 text-sm font-medium text-slate-700 w-[20%] bg-white">Project Manager</th>
                    <th className="text-left p-2 text-sm font-medium text-slate-700 w-[12%] bg-white">Start Date</th>
                    <th className="text-left p-2 text-sm font-medium text-slate-700 w-[12%] bg-white">End Date</th>
                    <th className="text-left p-2 text-sm font-medium text-slate-700 w-[10%] bg-white">Status</th>
                    <th className="text-center p-2 text-sm font-medium text-slate-700 w-[8%] bg-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Existing Projects */}
                  {filteredProjects.map((project) => {
                  const isEditing = editingProjectId === project.id;
                  return (
                    <tr key={project.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-2">
                        <Input
                          value={project.name || ''}
                          onChange={(e) => handleUpdateProject(project.id, 'name', e.target.value)}
                          className="h-9"
                          disabled={!isEditing || isSubmitting}
                          readOnly={!isEditing}
                        />
                      </td>
                      <td className="p-2">
                        <SearchableClientSelect
                          value={project.clientId?.toString() || ""}
                          onChange={(value) => handleUpdateProject(project.id, 'clientId', value)}
                          clients={clients}
                          disabled={!isEditing || isSubmitting}
                          placeholder="Select Client"
                          className="h-9"
                        />
                      </td>
                      <td className="p-2">
                        <SearchablePMInput
                          key={`pm-${project.id}-${isEditing ? 'edit' : 'view'}-${project.projectManagerOffice365Id || project.projectManagerId || 'none'}`}
                          value={project.projectManagerOffice365Id || project.projectManagerId || ""}
                          onChange={(value) => {
                            // Update immediately when a new manager is selected
                            // The value is the Office 365 ID from the employee selection
                            // Store it in both fields for immediate display and for saving
                            // When saving, we'll send projectManagerOffice365Id (or projectManagerId if O365 ID not available)
                            // The backend will map the Office 365 ID to database user ID
                            if (value) {
                              // Store Office 365 ID in projectManagerOffice365Id for display matching
                              handleUpdateProject(project.id, 'projectManagerOffice365Id', value);
                              // Also store in projectManagerId - backend will map it when saving
                              handleUpdateProject(project.id, 'projectManagerId', value);
                            } else {
                              // Clear both if no value
                              handleUpdateProject(project.id, 'projectManagerOffice365Id', null);
                              handleUpdateProject(project.id, 'projectManagerId', null);
                            }
                          }}
                          employees={projectManagerEmployees}
                          disabled={!isEditing || isSubmitting}
                          placeholder="Select PM"
                          className="h-9"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="date"
                          // Format date for input: YYYY-MM-DD
                          value={project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => handleUpdateProject(project.id, 'startDate', e.target.value)}
                          className="h-9"
                          disabled={!isEditing || isSubmitting}
                          readOnly={!isEditing}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="date"
                          value={project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => handleUpdateProject(project.id, 'endDate', e.target.value)}
                          className="h-9"
                          disabled={!isEditing || isSubmitting}
                          readOnly={!isEditing}
                        />
                      </td>
                      <td className="p-2">
                        <Select
                          value={project.status || 'active'}
                          onValueChange={(value) => handleUpdateProject(project.id, 'status', value)}
                          disabled={!isEditing || isSubmitting}
                        >
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="on-hold">On Hold</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {!isEditing ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleStartEdit(project.id)}
                                className="text-blue-600 hover:bg-blue-100"
                                disabled={isSubmitting || editingProjectId !== null}
                                aria-label={`Edit project ${project.name}`}
                                title="Edit project"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteProject(project.id, project.name)}
                                className="text-red-600 hover:bg-red-100"
                                disabled={isSubmitting || editingProjectId !== null}
                                aria-label={`Delete project ${project.name}`}
                                title="Delete project"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSaveProject(project.id)}
                                className="text-green-600 hover:bg-green-100"
                                disabled={isSubmitting}
                                aria-label={`Save changes for ${project.name}`}
                                title="Save changes"
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCancelEdit(project.id)}
                                className="text-gray-600 hover:bg-gray-100"
                                disabled={isSubmitting}
                                aria-label={`Cancel editing ${project.name}`}
                                title="Cancel editing"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unsaved Changes Confirmation Dialog */}
      <AlertDialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to save or discard changes?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowUnsavedChangesDialog(false);
              setPendingCancelProjectId(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                if (pendingCancelProjectId) {
                  handleDiscardChanges(pendingCancelProjectId);
                }
              }}
            >
              Discard
            </Button>
            <AlertDialogAction
              onClick={async () => {
                if (pendingCancelProjectId) {
                  await handleSaveProject(pendingCancelProjectId);
                  setShowUnsavedChangesDialog(false);
                  setPendingCancelProjectId(null);
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Project Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete project <strong>"{projectToDelete?.name}"</strong>? 
              This action cannot be undone. If this project is associated with any timesheets, 
              the deletion will be prevented.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setShowDeleteDialog(false);
                setProjectToDelete(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Project Dialog */}
      <AddProjectDialog
        open={addProjectOpen}
        onOpenChange={setAddProjectOpen}
        onProjectAdded={() => {
          fetchData(); // Refresh projects list
        }}
      />
    </div>
  );
};

export default ProjectManagementSimple;