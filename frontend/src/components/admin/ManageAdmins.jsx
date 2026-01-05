import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
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
import { apiGet, apiPut } from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import { 
  Shield,
  Trash2,
  Loader2,
  AlertCircle,
  ChevronsUpDown,
  Check
} from 'lucide-react';
import { cn } from '../../lib/utils';

// Proof of loading
console.log("--- LOADING ManageAdmins V3 (isAdmin field fix) ---");

// Searchable Employee Select Component
const SearchableEmployeeSelect = ({ value, onChange, employees = [], disabled, placeholder = "Select Employee" }) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  
  // Find selected employee
  const selectedEmployee = employees.find(emp => emp.id.toString() === value?.toString());
  const displayValue = selectedEmployee ? selectedEmployee.name : '';
  
  // Filter employees based on search (case-insensitive)
  const searchLower = searchValue.toLowerCase();
  const filteredEmployees = employees.filter(employee => 
    employee.name.toLowerCase().includes(searchLower) ||
    (employee.email && employee.email.toLowerCase().includes(searchLower)) ||
    (employee.department && employee.department.toLowerCase().includes(searchLower))
  );
  
  const hasResults = filteredEmployees.length > 0;
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", !displayValue && "text-muted-foreground")}
          disabled={disabled}
        >
          <span className="truncate">{displayValue || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start" sideOffset={4}>
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search employees..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {!hasResults && (
              <CommandEmpty>
                {employees.length === 0 
                  ? "All employees already have admin access."
                  : "No employees found."}
              </CommandEmpty>
            )}
            {hasResults && (
              <CommandGroup>
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
                          value === employee.id.toString() ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium truncate">{employee.name}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {employee.email} • {employee.department || 'N/A'}
                        </span>
                      </div>
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

const ManageAdmins = () => {
  const { toast } = useToast();
  const { user: currentUser } = useContext(AuthContext);

  // Data States
  const [allEmployees, setAllEmployees] = useState([]); // Single source of truth
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  // Loading/Error States
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Delete Dialog State
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [adminToRevoke, setAdminToRevoke] = useState(null);

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch Office 365 employees (full list, filtered to active employees only)
      const managersResult = await apiGet('/api/projects/managers');
      if (!managersResult.success || !Array.isArray(managersResult.employees)) {
        throw new Error(managersResult.error || 'Failed to fetch employees from Office 365.');
      }

      // Only use employees, ignore groups (same logic as project manager dropdown)
      const o365Employees = managersResult.employees || [];

      // Fetch database employees to get isAdmin status
      const dbResult = await apiGet('/api/employees');
      if (!dbResult.success || !Array.isArray(dbResult.data)) {
        throw new Error(dbResult.error || 'Failed to fetch employee admin status.');
      }

      // Create a map of database employees by email and office365_id for matching
      const dbEmployeesMap = new Map();
      dbResult.data.forEach(emp => {
        if (emp.email) {
          dbEmployeesMap.set(emp.email.toLowerCase(), emp);
        }
        if (emp.office365Id) {
          dbEmployeesMap.set(emp.office365Id, emp);
        }
      });

      // Merge Office 365 employees with database admin status
      // Only include employees that have database records (required for admin status updates)
      const mergedEmployees = o365Employees
        .map(o365Emp => {
          // Try to find matching database record by email or office365_id
          const dbEmp = dbEmployeesMap.get(o365Emp.email?.toLowerCase()) || 
                        dbEmployeesMap.get(o365Emp.id);
          
          // Only include if we have a database record (required for admin updates)
          if (!dbEmp) {
            console.warn(`Employee ${o365Emp.name} (${o365Emp.email}) found in Office 365 but not in database. Skipping.`);
            return null;
          }
          
          return {
            id: dbEmp.id, // Use database ID (required for API updates)
            office365Id: o365Emp.id,
            name: o365Emp.name,
            email: o365Emp.email,
            department: o365Emp.department || dbEmp.department || null,
            isAdmin: !!dbEmp.isAdmin, // Get admin status from database
          };
        })
        .filter(emp => emp !== null); // Remove null entries

      console.log(`✅ Loaded ${mergedEmployees.length} active employees from Office 365 (${o365Employees.length - mergedEmployees.length} skipped - no database record)`);
      setAllEmployees(mergedEmployees);
    } catch (err) {
      console.error("Error fetching employees:", err);
      setError(err.message);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Derived Lists ---
  // Memoized list of current admins (excluding the currently logged-in admin)
  const adminList = useMemo(() => {
    // Filter admins and exclude the currently logged-in user
    const allAdmins = allEmployees.filter(emp => !!emp.isAdmin);
    
    // Exclude current user if they are an admin (by ID or email)
    if (currentUser) {
      return allAdmins.filter(admin => 
        admin.id !== currentUser.id && 
        admin.email?.toLowerCase() !== currentUser.email?.toLowerCase()
      );
    }
    
    return allAdmins;
  }, [allEmployees, currentUser]);

  // Memoized list of employees available to be admins
  const availableEmployees = useMemo(() => {
    // <-- FIX: Use 'isAdmin' from the API response
    return allEmployees.filter(emp => !emp.isAdmin);
  }, [allEmployees]);

  
  // --- Action Handlers ---

  // Function to update admin status (used by Add and Remove)
  const updateAdminStatus = async (employeeId, name, isAdmin) => {
    setIsSubmitting(true);
    try {
      const result = await apiPut(`/api/employees/${employeeId}`, { 
        is_admin: isAdmin ? 1 : 0 
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update status.');
      }

      toast({
          title: `Access ${isAdmin ? 'Granted' : 'Revoked'}`,
          description: `${name} ${isAdmin ? 'is now an admin' : 'is no longer an admin'}.`,
          variant: isAdmin ? "success" : "destructive"
      });
      
      setSelectedEmployeeId(''); // Reset dropdown
      fetchData(); // Refetch all data to update lists

    } catch (err) {
        console.error(`Error updating admin status for ${employeeId}:`, err);
        // Better error handling
        const errorMessage = err.message || (typeof err === 'string' ? err : 'Unknown error occurred');
        toast({ 
          title: "Error", 
          description: `Could not update status: ${errorMessage}`, 
          variant: "destructive" 
        });
    } finally {
        setIsSubmitting(false);
    }
  };


  const handleAddAdmin = () => {
    if (!selectedEmployeeId) {
      toast({ title: "No Employee Selected", variant: "destructive" });
      return;
    }
    const employee = availableEmployees.find(e => e.id === selectedEmployeeId);
    if (employee) {
      updateAdminStatus(employee.id, employee.name, true);
    }
  };

  const handleRemoveAdmin = (id, name) => {
    // Open revoke confirmation dialog
    setAdminToRevoke({ id, name });
    setShowRevokeDialog(true);
  };

  const handleRevokeConfirm = () => {
    if (!adminToRevoke) return;
    updateAdminStatus(adminToRevoke.id, adminToRevoke.name, false);
    setShowRevokeDialog(false);
    setAdminToRevoke(null);
  };


  // --- Render ---

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2">Loading administrators...</span>
      </div>
    );
  }

  if (error) {
     return (
       <div className="bg-red-50 p-6 rounded-lg border border-red-200 text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <p className="text-red-700 font-medium">Failed to load employees</p>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <Button onClick={fetchData}>Try Again</Button>
        </div>
     );
  }

  return (
    <div className="space-y-4">
      {/* Select Employee Section - Moved to Top */}
      <div className="pb-4 border-b">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Grant Admin Access</h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Select Employee
            </label>
            <SearchableEmployeeSelect
              value={selectedEmployeeId}
              onChange={setSelectedEmployeeId}
              employees={availableEmployees}
              disabled={isSubmitting}
              placeholder="Search and select employee..."
            />
          </div>
          <Button 
            onClick={handleAddAdmin} 
            className="bg-red-600 hover:bg-red-700"
            disabled={!selectedEmployeeId || isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
            Grant Admin Access
          </Button>
        </div>
      </div>

      {/* Admin List */}
      <Card>
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-1.5">
              <Shield className="h-5 w-5 text-red-600" />
              Current Administrators
            </CardTitle>
            <Badge className="bg-red-100 text-red-800 border-0 text-sm px-3 py-1">
              {adminList.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {adminList.length === 0 ? (
            <div className="text-center p-6 text-sm text-gray-500">
              No other administrators found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left p-2 text-sm font-semibold text-black">Name</th>
                    <th className="text-left p-2 text-sm font-semibold text-black">Email</th>
                    <th className="text-left p-2 text-sm font-semibold text-black">Department</th>
                    <th className="text-center p-2 text-sm font-semibold text-black w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminList.map((admin) => (
                    <tr key={admin.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-2 text-sm text-black font-medium">
                        {admin.name}
                      </td>
                      <td className="p-2 text-sm text-black">
                        {admin.email || '-'}
                      </td>
                      <td className="p-2 text-sm text-black">
                        {admin.department || 'N/A'}
                      </td>
                      <td className="p-2 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveAdmin(admin.id, admin.name)}
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={isSubmitting}
                          aria-label={`Remove admin access for ${admin.name}`}
                        >
                          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoke Admin Access Confirmation Dialog */}
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Admin Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke admin access for <strong>{adminToRevoke?.name}</strong>? 
              This action cannot be undone. They will lose all administrator privileges immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setShowRevokeDialog(false);
                setAdminToRevoke(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={handleRevokeConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Trash2 className="mr-2 h-4 w-4" />
              Revoke Access
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageAdmins;