import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Loader2, Plus, Check, ChevronsUpDown } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { apiGet, apiPost } from '../../utils/api';
import { cn } from '../../lib/utils';

// Searchable Client Select Component
const SearchableClientSelect = ({ value, onChange, clients = [], disabled, placeholder = "Select Client", className }) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  
  const selectedClient = clients.find(client => client.id.toString() === value?.toString());
  const displayValue = selectedClient ? selectedClient.name : '';
  
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
          className={cn("w-full justify-between font-normal", !displayValue && "text-muted-foreground", className)}
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
  
  const normalizedValue = value?.toString() || '';
  
  const selectedManager = employees.find(pm => {
    if (pm.id?.toString() === normalizedValue) return true;
    if (pm.office365Id?.toString() === normalizedValue) return true;
    return false;
  });
  const displayValue = selectedManager ? selectedManager.name : '';
  
  useEffect(() => {
    if (!open && searchValue) {
      setSearchValue('');
    }
  }, [value, open, searchValue]);
  
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
          className={cn("w-full justify-between font-normal", !displayValue && "text-muted-foreground", className)}
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

const AddProjectDialog = ({ open, onOpenChange, onProjectAdded }) => {
  const [projectData, setProjectData] = useState({
    name: '',
    clientId: null,
    projectManagerId: null,
    startDate: '',
    endDate: '',
    status: 'active'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState([]);
  const [projectManagerEmployees, setProjectManagerEmployees] = useState([]);
  const { toast } = useToast();

  // Reset form and fetch data when dialog opens
  useEffect(() => {
    if (open) {
      setProjectData({
        name: '',
        clientId: null,
        projectManagerId: null,
        startDate: '',
        endDate: '',
        status: 'active'
      });
      fetchClients();
      fetchProjectManagers();
    }
  }, [open]);

  const fetchClients = async () => {
    try {
      const result = await apiGet('/api/projects/clients/all');
      if (result.success && Array.isArray(result.data)) {
        setClients(result.data);
      } else {
        console.error("Failed to fetch clients:", result);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchProjectManagers = async () => {
    try {
      const result = await apiGet('/api/projects/managers');
      if (result.success) {
        const employees = Array.isArray(result.employees) ? result.employees : [];
        setProjectManagerEmployees(employees);
      } else {
        console.error("Failed to fetch project managers:", result);
      }
    } catch (error) {
      console.error("Error fetching project managers:", error);
    }
  };

  const handleAddProject = async () => {
    // Validation
    if (!projectData.name.trim()) {
      toast({ title: "Project name required", variant: "destructive" });
      return;
    }

    if (!projectData.clientId) {
      toast({ title: "Client required", description: "Please select a client for this project.", variant: "destructive" });
      return;
    }

    if (!projectData.projectManagerId) {
      toast({ title: "Project Manager required", description: "Please select a project manager for this project.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: projectData.name.trim(),
        clientId: projectData.clientId,
        projectManagerId: projectData.projectManagerId,
        startDate: projectData.startDate || null,
        endDate: projectData.endDate || null,
        status: projectData.status || 'active',
        description: projectData.name.trim(), // Default description
        estimatedHours: 100 // Default placeholder
      };
      
      const result = await apiPost('/api/projects', payload);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to add project.');
      }

      toast({ 
        title: "Project Added", 
        description: `${result.data.name} has been added successfully.`, 
        variant: "success" 
      });
      
      // Reset form
      setProjectData({
        name: '',
        clientId: null,
        projectManagerId: null,
        startDate: '',
        endDate: '',
        status: 'active'
      });
      
      // Call callback if provided
      if (onProjectAdded) {
        onProjectAdded(result.data);
      }
      
      // Close dialog after successful creation
      onOpenChange(false);
    } catch (err) {
      console.error("Add project error:", err);
      toast({ 
        title: "Error", 
        description: `Could not add project: ${err.message}`, 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setProjectData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project Name - Required */}
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Project Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={projectData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="Enter project name"
                className="mt-1"
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            {/* Client - Required */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Client <span className="text-red-500">*</span>
              </label>
              <SearchableClientSelect
                value={projectData.clientId?.toString() || ""}
                onChange={(value) => handleFieldChange('clientId', value)}
                clients={clients}
                disabled={isSubmitting}
                placeholder="Select client"
                className="mt-1"
              />
            </div>

            {/* Project Manager - Required */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Project Manager <span className="text-red-500">*</span>
              </label>
              <SearchablePMInput
                value={projectData.projectManagerId || ""}
                onChange={(value) => handleFieldChange('projectManagerId', value)}
                employees={projectManagerEmployees}
                disabled={isSubmitting}
                placeholder="Select manager"
                className="mt-1"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Start Date
              </label>
              <Input
                type="date"
                value={projectData.startDate}
                onChange={(e) => handleFieldChange('startDate', e.target.value)}
                className="mt-1"
                disabled={isSubmitting}
              />
            </div>

            {/* End Date */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                End Date
              </label>
              <Input
                type="date"
                value={projectData.endDate}
                onChange={(e) => handleFieldChange('endDate', e.target.value)}
                className="mt-1"
                disabled={isSubmitting}
              />
            </div>

            {/* Status */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Status
              </label>
              <Select
                value={projectData.status}
                onValueChange={(value) => handleFieldChange('status', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddProject}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isSubmitting || !projectData.name.trim() || !projectData.clientId || !projectData.projectManagerId}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Plus className="mr-2 h-4 w-4" />
              Add Project
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddProjectDialog;

