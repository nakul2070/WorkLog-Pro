import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useToast } from '../../hooks/use-toast';
import { apiGet, apiPost, apiPut, apiDelete } from '../../utils/api';
import {
  FileText,
  Plane,
  Home,
  Plus,
  Minus,
  Loader2,
  Lock,
  AlertCircle,
  Check,
  ChevronsUpDown
} from 'lucide-react';
import {
  getMonthData,
  getHolidayByDate,
} from '../../data/mock';
import { useAuth } from '../../context/AuthContext'; 

// Proof of loading
console.log("--- HELLO FROM FINAL CORRECTED FILE V12 (Holiday/Leave Save Fix) ---");

// --- Define a default project ID for Holiday/Leave entries ---
// We'll use 'proj-001' ("Kadel Labs - Internal Development") as the placeholder
const DEFAULT_PROJECT_ID_FOR_LEAVE = "proj-001";

// Auto-resizing Textarea Component for Task Description
const AutoResizeTextarea = React.forwardRef(({ value, onChange, placeholder, disabled, maxLength, className, ...props }, ref) => {
  const textareaRef = React.useRef(null);
  const [isFocused, setIsFocused] = React.useState(false);
  const combinedRef = React.useCallback((node) => {
    textareaRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  }, [ref]);

  // Auto-resize function
  const adjustHeight = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const singleLineHeight = 28; // Single line height (h-7 equivalent ~28px)
    const expandedMaxHeight = 200; // Maximum height when expanded
    
    // If not focused, always show as single-line input (like the 2nd screenshot)
    if (!isFocused) {
      textarea.style.height = `${singleLineHeight}px`;
      textarea.style.overflow = 'hidden';
      textarea.style.whiteSpace = 'pre-wrap';
      textarea.style.wordWrap = 'break-word';
    } else {
      // When focused, calculate and show full content with wrapping
      // Reset height to get accurate scrollHeight
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, singleLineHeight), expandedMaxHeight);
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflow = scrollHeight > expandedMaxHeight ? 'auto' : 'hidden';
      textarea.style.whiteSpace = 'pre-wrap';
      textarea.style.wordWrap = 'break-word';
    }
  }, [isFocused]);

  // Adjust height on value change or focus change
  React.useEffect(() => {
    adjustHeight();
  }, [value, isFocused, adjustHeight]);

  const handleFocus = (e) => {
    setIsFocused(true);
    if (props.onFocus) props.onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (props.onBlur) props.onBlur(e);
  };

  return (
    <Textarea
      ref={combinedRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
      style={{
        minHeight: '28px',
        height: '28px',
        lineHeight: '1.5',
        paddingTop: '6px',
        paddingBottom: '6px',
        resize: 'none',
        overflow: 'hidden',
      }}
      {...props}
    />
  );
});

AutoResizeTextarea.displayName = "AutoResizeTextarea";

// Searchable Client Select Component
const SearchableClientSelect = ({ value, onChange, clients, disabled }) => {
  console.log('🔵 SearchableClientSelect rendered', { value, clientsCount: clients?.length, disabled });
  
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const selectedClient = clients?.find(c => c.id.toString() === value);
  
  // Filter clients based on search
  const filteredClients = clients?.filter(client =>
    client.name?.toLowerCase().includes(searchValue.toLowerCase())
  ) || [];
  
  console.log('🔵 SearchableClientSelect state', { open, searchValue, filteredClientsCount: filteredClients.length });
  
  const handleClientSelect = (clientId, clientName) => {
    console.log('🟢 handleClientSelect called', { clientId, clientName });
    onChange(clientId.toString());
    setOpen(false);
    setSearchValue("");
    console.log('🟢 handleClientSelect completed');
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          aria-expanded={open}
          className={`w-full justify-between h-8 text-sm ${disabled ? 'cursor-not-allowed' : 'hover:bg-slate-50'}`}
          title="Click to search and select client"
        >
          <span className="truncate">
            {selectedClient ? selectedClient.name : "Search client..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[300px] p-0 z-[100]" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Type to search client..." 
            className="h-9" 
            value={searchValue}
            hideIcon
            onValueChange={(val) => {
              console.log('🟡 Search value changed:', val);
              setSearchValue(val);
            }}
          />
          <CommandEmpty>No client found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {filteredClients.map((client) => {
              console.log('🔵 Rendering client item:', client.name, client.id);
              
              return (
                <CommandItem
                  key={client.id}
                  value={client.name}
                  onSelect={() => {
                    console.log('🟢 CommandItem onSelect fired', { clientName: client.name, clientId: client.id });
                    handleClientSelect(client.id, client.name);
                  }}
                  className="cursor-pointer"
                  data-client-id={client.id}
                  data-client-name={client.name}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      console.log('🟢 Button clicked inside CommandItem', { clientName: client.name, clientId: client.id });
                      e.preventDefault();
                      e.stopPropagation();
                      handleClientSelect(client.id, client.name);
                    }}
                    onMouseDown={(e) => {
                      console.log('🟢 Button onMouseDown', { clientName: client.name });
                      e.stopPropagation();
                    }}
                    className="flex items-center justify-between w-full text-left cursor-pointer hover:bg-accent px-2 py-1.5 -mx-2 -my-1.5"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <span>{client.name}</span>
                    <Check
                      className={`ml-auto h-4 w-4 ${
                        value === client.id.toString() ? "opacity-100" : "opacity-0"
                      }`}
                    />
                  </button>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const TimesheetEntry = ({ selectedMonth, onHoursChange, onCanSubmitChange, onSubmitTimesheet, onSaveTimesheet, onStatusChange, onSubmitLoadingChange, onSaveLoadingChange }) => {
  const [monthData, setMonthData] = useState(null);
  const [entries, setEntries] = useState({});
  const [currentTimesheetId, setCurrentTimesheetId] = useState(null);
  const [totalMonthHours, setTotalMonthHours] = useState(0);
  const [timesheetStatus, setTimesheetStatus] = useState('draft');
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth(); 

  // Get localStorage key for partial entries (user-specific and month-specific)
  const getLocalStorageKey = useCallback(() => {
    if (!user?.id || !selectedMonth) return null;
    return `timesheet_draft_${user.id}_${selectedMonth}`;
  }, [user?.id, selectedMonth]);

  // Save entries to localStorage for persistence
  const saveEntriesToLocalStorage = useCallback((entriesToSave) => {
    const key = getLocalStorageKey();
    if (!key) {
      console.warn('⚠️ Cannot save to localStorage: missing key (user or month not available)');
      return;
    }
    
    try {
      // Filter out empty entries (days with no data) to save space
      const entriesToSaveFiltered = {};
      Object.keys(entriesToSave).forEach(date => {
        const entry = entriesToSave[date];
        if (entry && (
          (entry.projects && entry.projects.length > 0 && entry.projects.some(p => (p.hours > 0 || (p.taskDescription && p.taskDescription.trim())) || p.clientId || p.projectId)) ||
          entry.isHoliday ||
          entry.isOnLeave
        )) {
          entriesToSaveFiltered[date] = entry;
        }
      });
      
      const entriesData = JSON.stringify(entriesToSaveFiltered);
      localStorage.setItem(key, entriesData);
      console.log(`💾 Saved ${Object.keys(entriesToSaveFiltered).length} day entries to localStorage (key: ${key})`);
    } catch (error) {
      console.error('❌ Failed to save entries to localStorage:', error);
      // If quota exceeded, try to clear old entries
      if (error.name === 'QuotaExceededError') {
        console.warn('⚠️ localStorage quota exceeded, attempting to clear old entries...');
        try {
          // Filter entries again for retry
          const entriesToSaveFiltered = {};
          Object.keys(entriesToSave).forEach(date => {
            const entry = entriesToSave[date];
            if (entry && (
              (entry.projects && entry.projects.length > 0 && entry.projects.some(p => (p.hours > 0 || (p.taskDescription && p.taskDescription.trim())) || p.clientId || p.projectId)) ||
              entry.isHoliday ||
              entry.isOnLeave
            )) {
              entriesToSaveFiltered[date] = entry;
            }
          });
          
          // Clear entries for other months (keep only current month)
          Object.keys(localStorage).forEach(storageKey => {
            if (storageKey.startsWith('timesheet_draft_') && storageKey !== key) {
              localStorage.removeItem(storageKey);
            }
          });
          // Retry save
          localStorage.setItem(key, JSON.stringify(entriesToSaveFiltered));
          console.log('✅ Retried save after clearing old entries');
        } catch (retryError) {
          console.error('❌ Failed to save even after clearing old entries:', retryError);
        }
      }
    }
  }, [getLocalStorageKey, selectedMonth]);

  // Load entries from localStorage
  const loadEntriesFromLocalStorage = useCallback(() => {
    const key = getLocalStorageKey();
    if (!key) return null;
    
    try {
      const savedData = localStorage.getItem(key);
      if (savedData) {
        const parsedEntries = JSON.parse(savedData);
        console.log(`📂 Loaded ${Object.keys(parsedEntries).length} day entries from localStorage for ${selectedMonth}`);
        return parsedEntries;
      }
    } catch (error) {
      console.error('❌ Failed to load entries from localStorage:', error);
    }
    return null;
  }, [getLocalStorageKey, selectedMonth]);

  // Clear localStorage entries for current month
  const clearLocalStorageEntries = useCallback(() => {
    const key = getLocalStorageKey();
    if (!key) return;
    
    try {
      localStorage.removeItem(key);
      console.log(`🗑️ Cleared localStorage entries for ${selectedMonth}`);
    } catch (error) {
      console.error('❌ Failed to clear localStorage:', error);
    }
  }, [getLocalStorageKey, selectedMonth]); 

  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]); 
  const [isLoadingClientsProjects, setIsLoadingClientsProjects] = useState(true);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [messages, setMessages] = useState(null);
  const [submitStartDate, setSubmitStartDate] = useState(null); // Day of month (1-31)
  const [submitEndDate, setSubmitEndDate] = useState(null); // Day of month (1-31)

  const saveTimeoutRef = useRef(null);
  // Track pending saves to prevent duplicate saves for the same date+project
  const pendingSavesRef = useRef(new Map()); // Key: `${date}_${projectId}`, Value: timeout ID
  // Track latest entryId for each date+project to prevent duplicate POSTs
  const entryIdCacheRef = useRef(new Map()); // Key: `${date}_${projectId}`, Value: entryId

  const transformEntries = useCallback((apiEntries = [], allDaysInMonth = []) => {
    const entriesMap = {};
    allDaysInMonth.forEach(dayStr => {
      entriesMap[dayStr] = { projects: [], totalHours: 0, isHoliday: false, isOnLeave: false, leaveType: null, dayStatus: null };
    });
  
    // Allow multiple entries for the same project on the same date
    // Track entries by their unique entryId to support duplicates
    apiEntries.forEach(entry => {
      const dateStr = entry.entryDate; 
  
      if (!dateStr || !entriesMap[dateStr]) {
        console.warn("Skipping entry with invalid or out-of-month date:", entry);
        return;
      }
  
      if (!entriesMap[dateStr].projects) entriesMap[dateStr].projects = [];
      
      // Use type-safe comparison for project lookup (handle string/number mismatches)
      const project = projects.find(p => p.id?.toString() === entry.projectId?.toString()); 
      // Use projectId from entry directly - don't require project to exist in projects list
      // This ensures work entries are displayed even if project lookup fails
      const projectId = entry.projectId?.toString() || null;
      
      // Handle different entry types:
      // - Holiday: Set isHoliday flag, don't add to projects
      // - Full-day leave: Set isOnLeave flag with leaveType='full-day', don't add to projects
      // - Half-day leave: Set isOnLeave flag with leaveType='half-day', ADD to projects (work entries)
      // - Regular work: Add to projects
      const isHolidayEntry = entry.isHoliday;
      const isLeaveEntry = entry.isOnLeave || entry.isLeave;
      const leaveType = entry.leaveType || null;
      // Check for half-day leave: is_halfday flag OR leaveType === 'half-day' OR (is_leave=1 and hours=4)
      const isHalfDayFlag = entry.is_halfday === 1 || entry.isHalfday === 1;
      
      // Log entry details for debugging half-day leave entries
      if (isHalfDayFlag) {
        console.log(`🔍 Processing half-day entry for ${dateStr}:`, {
          entryId: entry.id,
          projectId,
          hours: entry.hours,
          isLeave: entry.isLeave,
          isOnLeave: entry.isOnLeave,
          is_halfday: entry.is_halfday,
          isHalfday: entry.isHalfday,
          leaveType: entry.leaveType,
          hasProject: !!project
        });
      }
      
      // Cache entryId using entryId as key (not date+projectId, since we allow duplicates)
      if (entry.id) {
        entryIdCacheRef.current.set(entry.id.toString(), entry.id.toString());
      }
      const isHalfDayLeave = isHalfDayFlag || (isLeaveEntry && (leaveType === 'half-day' || leaveType === 'halfday'));
      const isFullDayLeave = isLeaveEntry && !isHalfDayLeave && (leaveType === 'full-day' || leaveType === 'fullday' || (!leaveType && !isHolidayEntry));
      
      // CRITICAL: Half-day leave work entries have is_halfday=1 but is_leave=0
      // These are actual work entries that should be displayed in the projects list
      // Check explicitly: is_halfday flag is set AND it's NOT a leave entry (is_leave=0)
      const isHalfDayWorkEntry = (entry.is_halfday === 1 || entry.isHalfday === 1) && !isLeaveEntry;
      
      // Determine if this entry should be added to projects list
      // Rules:
      // 1. NOT a holiday entry
      // 2. NOT a full-day leave entry  
      // 3. NOT a leave entry (is_leave=1) - this excludes the 4-hour leave entry
      // 4. Must have a valid projectId (work entries should have real project IDs)
      // 5. Half-day work entries (is_halfday=1, is_leave=0) should ALWAYS be added if they have a projectId
      const isRegularWorkEntry = !isHolidayEntry && !isFullDayLeave && !isLeaveEntry && projectId;
      
      // For half-day work entries, be more permissive - add them if they have any projectId
      // This ensures saved work entries are always displayed
      if (isHalfDayWorkEntry && projectId) {
        // Half-day work entry - always add if it has a projectId
        const projectEntry = {
          entryId: entry.id?.toString(), 
          clientId: entry.clientId?.toString() || (project ? project.clientId?.toString() : null), 
          projectId: projectId,
          hours: entry.hours || 0,
          taskDescription: entry.taskDescription || "",
        };
        entriesMap[dateStr].projects.push(projectEntry);
        console.log(`✅ Added half-day work entry to projects for ${dateStr}:`, {
          entryId: projectEntry.entryId,
          projectId: projectEntry.projectId,
          hours: projectEntry.hours,
          taskDescription: projectEntry.taskDescription,
          isHalfDayFlag,
          isLeaveEntry
        });
      } else if (isRegularWorkEntry) {
        // Regular work entry
        const projectEntry = {
          entryId: entry.id?.toString(), 
          clientId: entry.clientId?.toString() || (project ? project.clientId?.toString() : null), 
          projectId: projectId,
          hours: entry.hours || 0,
          taskDescription: entry.taskDescription || "",
        };
        entriesMap[dateStr].projects.push(projectEntry);
        console.log(`✅ Added work entry to projects for ${dateStr}:`, {
          entryId: projectEntry.entryId,
          projectId: projectEntry.projectId,
          hours: projectEntry.hours
        });
      } else if (!isHolidayEntry && !isFullDayLeave && projectId) {
        // Log why entry was not added (for debugging)
        console.log(`⏭️  Skipping entry for ${dateStr}:`, {
          entryId: entry.id,
          projectId,
          isHolidayEntry,
          isFullDayLeave,
          isLeaveEntry,
          isHalfDayFlag: entry.is_halfday === 1 || entry.isHalfday === 1,
          isHalfDayWorkEntry,
          leaveType,
          hours: entry.hours
        });
      }
  
      // Set day-level flags
      if (isHolidayEntry) {
        entriesMap[dateStr].isHoliday = true;
        entriesMap[dateStr].dayStatus = 'holiday'; // Set dayStatus for holiday
      }
      // Set leave flags: check for leave entry (is_leave=1) OR half-day work entries (is_halfday=1, is_leave=0)
      // This handles both the 4-hour leave entry and work entries for half-day leave
      if (isLeaveEntry || isHalfDayWorkEntry) {
        entriesMap[dateStr].isOnLeave = true;
        // Determine leaveType: prioritize half-day flag, then check leaveType from API
        if (isHalfDayLeave || isHalfDayFlag || isHalfDayWorkEntry) {
          entriesMap[dateStr].leaveType = 'half-day';
          entriesMap[dateStr].dayStatus = 'half-day-leave'; // Set dayStatus for half-day leave
          console.log(`✅ Set half-day leave flag for ${dateStr} from entry:`, { isHalfDayFlag, isHalfDayWorkEntry, isLeaveEntry, leaveType });
        } else if (isFullDayLeave || (isLeaveEntry && leaveType === 'full-day')) {
          entriesMap[dateStr].leaveType = 'full-day';
          entriesMap[dateStr].dayStatus = 'full-day-leave'; // Set dayStatus for full-day leave
        } else if (leaveType) {
          // Use leaveType from API
          entriesMap[dateStr].leaveType = leaveType;
          entriesMap[dateStr].dayStatus = leaveType === 'half-day' ? 'half-day-leave' : 'full-day-leave';
        } else {
          // Infer from hours for backward compatibility (4h = half-day, 8h = full-day)
          entriesMap[dateStr].leaveType = entry.hours === 4 ? 'half-day' : 'full-day';
          entriesMap[dateStr].dayStatus = entry.hours === 4 ? 'half-day-leave' : 'full-day-leave';
        }
      }
    });
  
    // Calculate totalHours for each day after processing all entries
    Object.keys(entriesMap).forEach(dateStr => {
      const dayEntry = entriesMap[dateStr];
      // Calculate total hours from all project entries
      dayEntry.totalHours = dayEntry.projects.reduce((sum, p) => sum + (Number(p.hours) || 0), 0);
      
      // Log half-day leave days for debugging
      if (dayEntry.isOnLeave && dayEntry.leaveType === 'half-day') {
        console.log(`📊 Half-day leave day ${dateStr}:`, {
          totalHours: dayEntry.totalHours,
          projectCount: dayEntry.projects.length,
          projects: dayEntry.projects.map(p => ({ projectId: p.projectId, hours: p.hours }))
        });
      }
    });
    
    return entriesMap;
  }, [projects]); // <-- The function depends on the 'projects' list

  // --- Load Messages from API ---
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const result = await apiGet('/api/messages');
        if (result.success && result.data) {
          setMessages(result.data);
        } else {
          console.error("Failed to load messages, using fallback");
          // Fallback to default messages if API fails
          setMessages({
            validation: {
              dailyMaxHours: "Maximum 12 hours per day allowed. Please adjust your hours.",
              dailyMaxHoursTitle: "Daily Hours Limit Exceeded",
              monthlyMinHours: "You must have a minimum of 160 total working hours (including leave and holiday hours) to submit the timesheet.",
              monthlyMinHoursTitle: "Insufficient Monthly Hours",
              submitDateRestriction: "Cannot submit timesheets for future months. For previous months, only draft or rejected timesheets can be submitted.",
              submitDateRestrictionTitle: "Submission Not Allowed"
            },
            ui: {
              timesheetSubmitted: "Your timesheet is submitted for approval.",
              timesheetSubmittedTitle: "Timesheet Submitted"
            }
          });
        }
      } catch (error) {
        console.error("Error loading messages:", error);
        // Use fallback messages
        setMessages({
          validation: {
            dailyMaxHours: "Maximum 12 hours per day allowed. Please adjust your hours.",
            dailyMaxHoursTitle: "Daily Hours Limit Exceeded",
            monthlyMinHours: "You must have a minimum of 160 total working hours (including leave and holiday hours) to submit the timesheet.",
            monthlyMinHoursTitle: "Insufficient Monthly Hours",
            submitDateRestriction: "Cannot submit timesheets for future months. For previous months,  timesheets can be submitted.",
            submitDateRestrictionTitle: "Submission Not Allowed"
          },
          ui: {
            timesheetSubmitted: "Your timesheet is submitted for approval.",
            timesheetSubmittedTitle: "Timesheet Submitted"
          }
        });
      }
    };
    fetchMessages();
  }, []);

  // --- Fetch Timesheet Configuration (Submit Date Range) ---
  useEffect(() => {
    const fetchTimesheetConfig = async () => {
      try {
        console.log('📅 Fetching timesheet configuration...');
        const result = await apiGet('/api/configurations/timesheet');
        console.log('📅 API Response:', result);
        
        if (result.success && result.data) {
          const config = result.data;
          console.log('📅 Config data received:', config);
          
          let startDay = null;
          let endDay = null;
          
          if (config.submit_start_date) {
            startDay = parseInt(config.submit_start_date, 10);
            if (!isNaN(startDay) && startDay >= 1 && startDay <= 31) {
              setSubmitStartDate(startDay);
              console.log('✅ Set submitStartDate to:', startDay);
            } else {
              console.warn('⚠️ Invalid submit_start_date:', config.submit_start_date);
            }
          } else {
            console.log('ℹ️ No submit_start_date in config');
          }
          
          if (config.submit_end_date) {
            endDay = parseInt(config.submit_end_date, 10);
            if (!isNaN(endDay) && endDay >= 1 && endDay <= 31) {
              setSubmitEndDate(endDay);
              console.log('✅ Set submitEndDate to:', endDay);
            } else {
              console.warn('⚠️ Invalid submit_end_date:', config.submit_end_date);
            }
          } else {
            console.log('ℹ️ No submit_end_date in config');
          }
          
          console.log('📅 Timesheet submission window configured:', {
            startDate: config.submit_start_date,
            endDate: config.submit_end_date,
            startDateParsed: startDay,
            endDateParsed: endDay
          });
        } else {
          console.log('⚠️ No configuration data received or API failed:', result);
        }
      } catch (error) {
        console.error("❌ Error loading timesheet configuration:", error);
        // If config not found, allow submission (backward compatibility)
      }
    };
    fetchTimesheetConfig();
  }, []);

  // --- Data Fetching ---
  useEffect(() => { 
    const fetchDropdownData = async () => {
      setIsLoadingClientsProjects(true);
      let clientsData = [];
      let projectsData = [];
      try {
        const clientResult = await apiGet('/api/projects/clients/all');
        if (clientResult.success && Array.isArray(clientResult.data)) {
          clientsData = clientResult.data;
        } else { console.error("API Error fetching clients:", clientResult); }
        
        const projectResult = await apiGet('/api/projects');
        if (projectResult.success && Array.isArray(projectResult.data)) {
          projectsData = projectResult.data;
        } else { console.error("API Error fetching projects:", projectResult); }

        setClients(clientsData);
        setProjects(projectsData);

      } catch (error) {
        console.error("Network Error fetching dropdown data:", error);
        toast({ title: "Error", description: "Could not fetch clients/projects.", variant: "destructive" });
      } finally {
        setIsLoadingClientsProjects(false);
      }
    };
    fetchDropdownData();
    
    // Listen for client added/updated/deleted events to refresh clients
    const handleClientAdded = () => {
      console.log('🔄 Client added event received, refreshing clients...');
      fetchDropdownData();
    };

    const handleClientUpdated = () => {
      console.log('🔄 Client updated event received, refreshing clients...');
      fetchDropdownData();
    };

    const handleClientDeleted = () => {
      console.log('🔄 Client deleted event received, refreshing clients...');
      fetchDropdownData();
    };

    window.addEventListener('clientAdded', handleClientAdded);
    window.addEventListener('clientUpdated', handleClientUpdated);
    window.addEventListener('clientDeleted', handleClientDeleted);
    return () => {
      window.removeEventListener('clientAdded', handleClientAdded);
      window.removeEventListener('clientUpdated', handleClientUpdated);
      window.removeEventListener('clientDeleted', handleClientDeleted);
    };
  }, [toast]);

  const fetchTimesheetAndEntries = useCallback(async () => {
    if (!selectedMonth || !user || !user.id || projects.length === 0) return; 
    
    // Check if user has authentication token
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.warn('No authentication token found. User may need to log in again.');
      toast({ 
        title: "Authentication Required", 
        description: "Please log in to access your timesheet data.", 
        variant: "destructive" 
      });
      return;
    }

    setIsLoadingEntries(true);
    setCurrentTimesheetId(null);
    setEntries({});
    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
    
    const currentUserId = user.id; 
    const [year, monthNum] = selectedMonth.split('-').map(Number);

    try {
      console.log(`Fetching timesheet for user ${currentUserId}, month ${selectedMonth}`);
      const timesheetResult = await apiGet(`/api/timesheets?userId=${currentUserId}&year=${year}&month=${monthNum}`);

      let timesheetId = null;
      let fetchedEntries = [];
      let currentStatus = 'draft'; // Default status

      if (timesheetResult.success && Array.isArray(timesheetResult.data) && timesheetResult.data.length > 0) {
        const timesheet = timesheetResult.data[0];
        timesheetId = timesheet.id;
        console.log(`Found existing timesheet ID: ${timesheetId}, Status: ${timesheet.status}`);
        setCurrentTimesheetId(timesheetId);
        
        // Set status and read-only state
        currentStatus = timesheet.status || 'draft';
        console.log(`Setting timesheet status to: ${currentStatus}, isReadOnly: ${currentStatus !== 'draft'}`);
        setTimesheetStatus(currentStatus);
        setIsReadOnly(currentStatus !== 'draft');
        
        // Notify parent component of status change
        if (onStatusChange) {
          onStatusChange(currentStatus);
        }

        console.log(`Fetching entries for timesheet ID: ${timesheetId}`);
        const entriesResult = await apiGet(`/api/timesheets/${timesheetId}/entries`);

        if (entriesResult.success && Array.isArray(entriesResult.data)) {
          fetchedEntries = entriesResult.data;
          console.log(`Fetched ${fetchedEntries.length} entries.`);
        } else {
           console.error("API Error fetching entries:", entriesResult);
           toast({ title: "Warning", description: "Could not fetch saved entries for this month.", variant: "destructive" });
        }
      } else if (timesheetResult.success && timesheetResult.data.length === 0) {
          console.log(`No existing timesheet found for ${selectedMonth}.`);
          setCurrentTimesheetId(null);
          currentStatus = 'draft';
          setTimesheetStatus('draft');
          setIsReadOnly(false);
          if (onStatusChange) {
            onStatusChange('draft');
          }
      } else {
        console.error("API Error fetching timesheet:", timesheetResult);
        throw new Error(timesheetResult.error || "Failed to fetch timesheet information.");
      }

      const calendarData = getMonthData(year, monthNum - 1);
      setMonthData(calendarData);
      const allDaysInMonth = calendarData.weeks.flatMap(week => week.days).map(d => d.fullDate);
      
      const transformed = transformEntries(fetchedEntries, allDaysInMonth);
      
      // Prioritize database entries over localStorage for draft timesheets
      // Only use localStorage if there are no database entries (user hasn't saved yet)
      if (currentStatus === 'draft') {
        const hasBackendEntries = Object.keys(transformed).length > 0;
        
        if (hasBackendEntries) {
          // Database has saved entries - use them as source of truth
          console.log(`📂 Using ${Object.keys(transformed).length} saved entries from database`);
          // Ensure all calendar dates have proper structure
          allDaysInMonth.forEach(date => {
            if (!transformed[date]) {
              transformed[date] = { projects: [], totalHours: 0, isHoliday: false, isOnLeave: false, leaveType: null, dayStatus: null };
            }
          });
          setEntries(transformed);
          // Clear localStorage since database is now the source of truth
          clearLocalStorageEntries();
        } else {
          // No database entries yet - check localStorage for unsaved edits
          const savedEntries = loadEntriesFromLocalStorage();
          if (savedEntries && Object.keys(savedEntries).length > 0) {
            console.log(`📂 No database entries found, using ${Object.keys(savedEntries).length} entries from localStorage`);
            // Ensure all calendar dates have proper structure
            allDaysInMonth.forEach(date => {
              if (!savedEntries[date]) {
                savedEntries[date] = { projects: [], totalHours: 0, isHoliday: false, isOnLeave: false, leaveType: null, dayStatus: null };
              }
            });
            setEntries(savedEntries);
          } else {
            console.log('📂 No entries found in database or localStorage');
            // Initialize empty entries for all days
            const emptyEntries = {};
            allDaysInMonth.forEach(date => {
              emptyEntries[date] = { projects: [], totalHours: 0, isHoliday: false, isOnLeave: false, leaveType: null, dayStatus: null };
            });
            setEntries(emptyEntries);
          }
        }
      } else {
        // For submitted timesheets, use backend entries only and clear localStorage
        console.log('📂 Timesheet is not draft, using backend entries only and clearing localStorage');
        // Ensure all calendar dates have proper structure
        allDaysInMonth.forEach(date => {
          if (!transformed[date]) {
            transformed[date] = { projects: [], totalHours: 0, isHoliday: false, isOnLeave: false, leaveType: null, dayStatus: null };
          }
        });
        setEntries(transformed);
        clearLocalStorageEntries();
      }

    } catch (error) {
      console.error("Error fetching timesheet/entries:", error);
      toast({ title: "Error", description: `Could not load timesheet data: ${error.message}`, variant: "destructive" });
       const calendarData = getMonthData(year, monthNum - 1);
       setMonthData(calendarData);
       setEntries({});
    } finally {
      setIsLoadingEntries(false);
    }
  }, [selectedMonth, user, projects, toast, transformEntries]);

  // Fetch timesheet status only (without entries) when month changes
  const fetchTimesheetStatus = useCallback(async () => {
    if (!selectedMonth || !user || !user.id) return;
    
    const token = localStorage.getItem('authToken');
    if (!token) return; // Skip if not authenticated
    
    const currentUserId = user.id;
    const [year, monthNum] = selectedMonth.split('-').map(Number);
    
    try {
      const timesheetResult = await apiGet(`/api/timesheets?userId=${currentUserId}&year=${year}&month=${monthNum}`);
      
      if (timesheetResult.success && Array.isArray(timesheetResult.data) && timesheetResult.data.length > 0) {
        const timesheet = timesheetResult.data[0];
        const status = timesheet.status || 'draft';
        console.log(`📋 Timesheet status for ${selectedMonth}: ${status}`);
        setCurrentTimesheetId(timesheet.id);
        setTimesheetStatus(status);
        setIsReadOnly(status !== 'draft');
        if (onStatusChange) {
          onStatusChange(status);
        }
      } else {
        // No timesheet exists yet
        setCurrentTimesheetId(null);
        setTimesheetStatus('draft');
        setIsReadOnly(false);
        if (onStatusChange) {
          onStatusChange('draft');
        }
      }
    } catch (error) {
      console.error("Error fetching timesheet status:", error);
      // On error, assume draft status
      setTimesheetStatus('draft');
      setIsReadOnly(false);
    }
  }, [selectedMonth, user, onStatusChange]);

  // Initialize monthData when selectedMonth changes and load partial entries from localStorage
  useEffect(() => {
    if (!selectedMonth || !user?.id) return;
    
    const [year, monthNum] = selectedMonth.split('-').map(Number);
    const calendarData = getMonthData(year, monthNum - 1);
    setMonthData(calendarData);
    
    // Load partial entries from localStorage first (for persistence across refreshes)
    const savedEntries = loadEntriesFromLocalStorage();
    if (savedEntries && Object.keys(savedEntries).length > 0) {
      console.log('📂 Restoring partial entries from localStorage on month change');
      setEntries(savedEntries);
    } else {
    setEntries({});
    }
    
    // Fetch only the timesheet status (not entries) to know if it's already submitted
    fetchTimesheetStatus();
  }, [selectedMonth, fetchTimesheetStatus, loadEntriesFromLocalStorage, user?.id]);

  // Reload from localStorage when status changes to 'draft' (in case it was just created or changed)
  useEffect(() => {
    if (timesheetStatus === 'draft' && selectedMonth && user?.id && monthData) {
      const savedEntries = loadEntriesFromLocalStorage();
      if (savedEntries && Object.keys(savedEntries).length > 0) {
        // Only update if we have saved entries and current entries are empty or different
        const currentEntriesKeys = Object.keys(entries).filter(key => {
          const entry = entries[key];
          return entry && (
            (entry.projects && entry.projects.length > 0 && entry.projects.some(p => p.hours > 0 || p.taskDescription)) ||
            entry.isHoliday ||
            entry.isOnLeave
          );
        });
        
        const savedEntriesKeys = Object.keys(savedEntries).filter(key => {
          const entry = savedEntries[key];
          return entry && (
            (entry.projects && entry.projects.length > 0 && entry.projects.some(p => p.hours > 0 || p.taskDescription)) ||
            entry.isHoliday ||
            entry.isOnLeave
          );
        });
        
        // If localStorage has more entries or different entries, use it
        if (savedEntriesKeys.length > currentEntriesKeys.length || 
            savedEntriesKeys.some(key => !currentEntriesKeys.includes(key))) {
          console.log('📂 Reloading entries from localStorage after status change to draft');
          // Ensure all calendar dates are present
          const allDaysInMonth = monthData.weeks.flatMap(week => week.days).map(d => d.fullDate);
          const merged = { ...savedEntries };
          allDaysInMonth.forEach(date => {
            if (!merged[date]) {
              merged[date] = { projects: [], totalHours: 0, isHoliday: false, isOnLeave: false, leaveType: null, dayStatus: null };
            }
          });
          setEntries(merged);
        }
      }
    }
  }, [timesheetStatus, selectedMonth, user?.id, monthData, loadEntriesFromLocalStorage, entries]);

  // Ensure working days always have a default P1 entry on initial load
  useEffect(() => {
    if (!monthData || isReadOnly) return;
    
    const allDaysInMonth = monthData.weeks.flatMap(week => week.days);
    let hasChanges = false;
    
    setEntries(prev => {
      const updated = { ...prev };
      
      allDaysInMonth.forEach(day => {
        const holiday = getHolidayByDate(day.fullDate);
        const isDisabled = day.isWeekend || !!holiday;
        const entry = updated[day.fullDate] || { projects: [], totalHours: 0, isHoliday: false, isOnLeave: false, leaveType: null, dayStatus: null };
        const isMarkedHoliday = entry.isHoliday && !isDisabled;
        const isMarkedFullDayLeave = entry.isOnLeave && entry.leaveType === 'full-day' && !isDisabled;
        const hideProjectRows = isDisabled || isMarkedHoliday || isMarkedFullDayLeave;
        
        // Only add default entry for working days that don't have any projects
        if (!hideProjectRows && (!entry.projects || entry.projects.length === 0)) {
          updated[day.fullDate] = {
            ...entry,
            dayStatus: entry.dayStatus || 'working-day', // Set default to working-day if not set (but preserve half-day-leave)
            projects: [{ clientId: null, projectId: null, hours: 0, taskDescription: "", entryId: null }]
          };
          hasChanges = true;
        } else if (!hideProjectRows && !entry.dayStatus && !entry.isOnLeave) {
          // Set default dayStatus to working-day for working days that don't have it set
          // Don't override if it's a leave day (half-day or full-day)
          updated[day.fullDate] = {
            ...entry,
            dayStatus: 'working-day'
          };
          hasChanges = true;
        }
      });
      
      return hasChanges ? updated : prev;
    });
  }, [monthData, isReadOnly]);

  // Load timesheet data from database when user logs in and projects are loaded
  // This ensures saved data persists after sign-out and sign-in
  useEffect(() => {
    // Only fetch if we have all required data: user, selectedMonth, and projects
    // This will trigger after:
    // 1. User logs in (user?.id becomes available)
    // 2. Projects are loaded (projects.length > 0)
    // 3. Month is selected (selectedMonth is set)
    if (user?.id && selectedMonth && projects.length > 0 && !isLoadingClientsProjects) {
      console.log('🔄 Loading saved timesheet data from database (user logged in, projects loaded)');
      fetchTimesheetAndEntries();
    }
  }, [user?.id, selectedMonth, projects.length, isLoadingClientsProjects, fetchTimesheetAndEntries]);

  // --- Calculations ---
  useEffect(() => { 
    // Calculate total working hours
    // Formula: Total Hours = Sum of working-hours-per-day + (8 × holidayCount) + (8 × fullDayLeaveCount) + (actual hours for halfDayLeave)
    const workingHours = Object.values(entries).reduce((sum, entry) => {
      // Count hours for regular working days and half-day leaves
      if (entry?.isHoliday) {
        return sum; // Exclude holidays from working hours (they get 8h credit separately)
      }
      if (entry?.isOnLeave && entry?.leaveType === 'half-day') {
        // Half-day leave: include actual hours worked (up to 6h)
        return sum + (entry?.totalHours || 0);
      }
      if (entry?.isOnLeave && entry?.leaveType === 'full-day') {
        return sum; // Exclude full-day leaves from working hours (they get 8h credit separately)
      }
      // Regular working day
      return sum + (entry?.totalHours || 0);
    }, 0);
    
    // Add 8 hours for each full-day leave
    const fullDayLeaveDays = Object.values(entries).filter(entry => entry?.isOnLeave && entry?.leaveType === 'full-day').length;
    const fullDayLeaveHours = fullDayLeaveDays * 8;
    
    // Add 4 hours for each half-day leave (automatically calculated: 8h workday - up to 6h work = 4h leave)
    const halfDayLeaveDays = Object.values(entries).filter(entry => entry?.isOnLeave && entry?.leaveType === 'half-day').length;
    const halfDayLeaveHours = halfDayLeaveDays * 4;
    
    // Add 8 hours for each holiday
    const holidayDays = Object.values(entries).filter(entry => entry?.isHoliday).length;
    const holidayHours = holidayDays * 8;
    
    // Total monthly hours (working + full-day leave + half-day leave + holiday)
    // Note: Half-day leave work hours are already included in workingHours, but we need to add the 4h leave portion
    const total = workingHours + fullDayLeaveHours + halfDayLeaveHours + holidayHours;
    
    setTotalMonthHours(total);
    if (onHoursChange) onHoursChange(total);
  }, [entries, onHoursChange]);

  useEffect(() => { 
    const checkCanSubmit = () => {
        if (!selectedMonth) {
          if (onCanSubmitChange) onCanSubmitChange(false);
          return;
        }

        const now = new Date();
        const currentDay = now.getDate();
        const [selectedYear, selectedMonthNum] = selectedMonth.split('-').map(Number);
        const selectedDate = new Date(selectedYear, selectedMonthNum - 1, 1);
        const currentDate = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Determine if selected month is current, previous, or future
        const isCurrentMonth = selectedDate.getTime() === currentDate.getTime();
        const isPreviousMonth = selectedDate < currentDate;
        const isFutureMonth = selectedDate > currentDate;
        
        // Block future months
        if (isFutureMonth) {
          if (onCanSubmitChange) onCanSubmitChange(false);
          return;
        }
        
        // Check admin-configured submission window for current month
        if (isCurrentMonth && submitStartDate !== null && submitEndDate !== null) {
          // Ensure values are numbers for comparison
          const startDay = Number(submitStartDate);
          const endDay = Number(submitEndDate);
          
          // Check if current day is within the submission window
          const isWithinWindow = currentDay >= startDay && currentDay <= endDay;
          
          console.log('📅 Date window check:', {
            currentDay,
            startDay,
            endDay,
            isWithinWindow,
            submitStartDate,
            submitEndDate,
            message: isWithinWindow 
              ? `✅ Day ${currentDay} is within window (${startDay}-${endDay})` 
              : `❌ Day ${currentDay} is OUTSIDE window (${startDay}-${endDay}) - Submit button will be disabled`
          });
          
          if (!isWithinWindow) {
            console.log('❌ Outside submission window - disabling submit button');
            if (onCanSubmitChange) onCanSubmitChange(false);
            return;
          } else {
            console.log('✅ Within submission window - continuing validation');
          }
        } else if (isCurrentMonth) {
          console.log('ℹ️ No date window configured - allowing submission any day (backward compatibility)');
        }
        
        // For current month: if date range is configured and we're within window, continue
        // If date range is not configured, allow submission any day (backward compatibility)
        if (isCurrentMonth) {
          // Date range check already done above, continue to entry validation
        } 
        // For previous month: allow only if timesheet is draft or rejected (not submitted/approved)
        else if (isPreviousMonth) {
          const status = timesheetStatus?.toLowerCase() || 'draft';
          // Allow submission if status is 'draft' (never submitted) or 'rejected' (can resubmit)
          if (status !== 'draft' && status !== 'rejected') {
            // Already submitted or approved - cannot resubmit
            if (onCanSubmitChange) onCanSubmitChange(false);
            return;
          }
        }
        
        // Allow submit if at least one entry exists
        if (!monthData || Object.keys(entries).length === 0) {
          if (onCanSubmitChange) onCanSubmitChange(false);
          return;
        }
        
        // Check if at least one day has hours > 0 or has entries
        const allDays = monthData.weeks.flatMap(week => week.days);
        const hasAnyEntries = allDays.some(day => {
            const entry = entries[day.fullDate];
            return entry && (
                (entry.totalHours > 0) || 
                (entry.projects && entry.projects.length > 0) ||
                entry.isHoliday || 
                entry.isOnLeave
            );
        });
        
        if (onCanSubmitChange) onCanSubmitChange(hasAnyEntries);
    };
    checkCanSubmit();
  }, [entries, monthData, selectedMonth, timesheetStatus, onCanSubmitChange, submitStartDate, submitEndDate]);

  // --- API Save/Delete ---
  const saveEntryToApi = useCallback(async (date, projectEntryData, timesheetId) => {
      const { entryId, clientId, projectId, hours, taskDescription, isHoliday, isOnLeave } = projectEntryData;
      const dayEntry = entries[date] || {};
      // Use flags from projectEntryData if provided (for holiday/leave checkbox updates), otherwise use dayEntry
      const isHolidayOrLeave = (isHoliday !== undefined ? isHoliday : dayEntry.isHoliday) || (isOnLeave !== undefined ? isOnLeave : dayEntry.isOnLeave);
      const hasWorkToSave = (Number(hours) > 0 || (taskDescription && taskDescription.trim() !== ""));
      
      // Daily validation: Check if total hours for the day exceeds 12
      if (!isHolidayOrLeave && hasWorkToSave) {
        const dayTotalHours = dayEntry.totalHours || 0;
        if (dayTotalHours > 12) {
          const msg = messages?.validation?.dailyMaxHours || "Maximum 12 hours per day allowed. Please adjust your hours.";
          const title = messages?.validation?.dailyMaxHoursTitle || "Daily Hours Limit Exceeded";
          toast({ 
            title: title, 
            description: msg, 
            variant: "destructive" 
          });
          return; // Prevent saving
        }
      }

      if (!hasWorkToSave && !isHolidayOrLeave) {
          console.log("Save skipped: No work and not holiday/leave.");
          if (entryId) deleteEntryFromApi(entryId); 
          return;
      }
      
      if (!timesheetId) {
        console.warn("TimesheetId missing, attempting to create timesheet first.");
        const newTimesheetId = await createTimesheetForMonth();
        if (!newTimesheetId) {
             toast({ title: "Save Error", description: `Cannot save entry, failed to create parent timesheet for ${selectedMonth}.`, variant: "destructive" });
             return;
        }
        timesheetId = newTimesheetId; 
        setCurrentTimesheetId(newTimesheetId);
     }

      if (hasWorkToSave && (!clientId || !projectId)) {
          console.warn("Save skipped: Missing clientId or projectId.", { date, projectEntryData });
          toast({ title: "Incomplete Entry", description: `Please select a Client AND Project for ${date}.`, variant: "destructive" });
          return; 
      }
      
      // --- FIX: Use a valid project ID for holiday/leave entries ---
      const payloadProjectId = (hasWorkToSave) ? projectId : DEFAULT_PROJECT_ID_FOR_LEAVE;
      
      // --- FIX: Auto-apply 8 hours for holidays or leave when no work hours are entered ---
      let finalHours = Number(hours) || 0;
      
      // If it's a holiday or leave with no work hours, set to 8 hours
      if (isHolidayOrLeave && !hasWorkToSave) {
          finalHours = 8;
      }
      
      // --- FIX: When saving a working day entry (hasWorkToSave), explicitly clear holiday/leave flags ---
      // This prevents a day that was previously marked as holiday/leave from remaining as holiday/leave
      // when the user fills in actual work hours
      let finalIsHoliday, finalIsOnLeave;
      if (hasWorkToSave) {
        // For working day entries, always set flags to false
        finalIsHoliday = false;
        finalIsOnLeave = false;
      } else {
        // For holiday/leave entries, use flags from projectEntryData if provided, otherwise use dayEntry
        finalIsHoliday = isHoliday !== undefined ? isHoliday : (dayEntry.isHoliday || false);
        finalIsOnLeave = isOnLeave !== undefined ? isOnLeave : (dayEntry.isOnLeave || false);
      }
      
      // Calculate totalHours based on current entries state (which should already include the current change)
      // This ensures we're sending the exact value that matches what's displayed on frontend
      // Use same calculation logic as submit and full save
      const workingHours = Object.values(entries).reduce((sum, entry) => {
        if (entry?.isHoliday) {
          return sum; // Exclude holidays from working hours
        }
        if (entry?.isOnLeave && entry?.leaveType === 'half-day') {
          // Half-day leave: include actual hours worked (up to 6h)
          return sum + (entry?.totalHours || 0);
        }
        if (entry?.isOnLeave && entry?.leaveType === 'full-day') {
          return sum; // Exclude full-day leaves from working hours
        }
        // Regular working day
        return sum + (entry?.totalHours || 0);
      }, 0);
      // Count full-day leaves only (exclude half-day leaves from leave count)
      const fullDayLeaveDays = Object.values(entries).filter(entry => entry?.isOnLeave && entry?.leaveType === 'full-day').length;
      // Count half-day leaves separately (they contribute 4 hours leave + work hours)
      const halfDayLeaveDays = Object.values(entries).filter(entry => entry?.isOnLeave && entry?.leaveType === 'half-day').length;
      const holidayDays = Object.values(entries).filter(entry => entry?.isHoliday).length;
      // Total hours = working hours + (full-day leaves * 8) + (half-day leaves * 4) + (holidays * 8)
      // Note: Half-day leave work hours are already included in workingHours
      const calculatedTotalHours = workingHours + (fullDayLeaveDays * 8) + (halfDayLeaveDays * 4) + (holidayDays * 8);
      
      // Truncate task description to 1000 characters if it exceeds the limit
      const maxDescriptionLength = 1000;
      let finalTaskDescription = (isHolidayOrLeave && !hasWorkToSave) ? (finalIsHoliday ? "Holiday" : "On Leave") : (taskDescription || "");
      if (finalTaskDescription && finalTaskDescription.length > maxDescriptionLength) {
        finalTaskDescription = finalTaskDescription.substring(0, maxDescriptionLength);
      }
      
      const payload = {
          projectId: payloadProjectId,
          entryDate: date,
          hours: finalHours,
          taskDescription: finalTaskDescription,
          isHoliday: finalIsHoliday,
          isOnLeave: finalIsOnLeave,
          totalHours: calculatedTotalHours, // Send calculated totalHours to backend (matches frontend display)
      };

      // IMPORTANT: Use the entryId from projectEntryData if available
      // This allows multiple entries for the same project - each entry has its own unique entryId
      const actualEntryId = entryId || null;
      
      console.log("Attempting to save entry:", { 
        providedEntryId: entryId, 
        foundEntryId: existingProjectEntry?.entryId,
        actualEntryId,
        timesheetId, 
        date,
        projectId: payloadProjectId,
        payload 
      });
      
      try {
          let response;
          let result;

          if (actualEntryId) {
              // UPDATE (PUT) - We have an entryId, so update the existing entry
              console.log(`📝 Using PUT to update entry ${actualEntryId}`);
              result = await apiPut(`/api/timesheets/entries/${actualEntryId}`, payload);
              // Check for explicit failure
              if (result && result.success === false) {
                throw new Error(result.error || 'Update failed');
              }
              // If result is null/undefined, this is an error
              if (!result) {
                throw new Error('Update failed: No response from server');
              }
              // If success field is missing or not true, this is an error
              if (result.success !== true) {
                throw new Error(result.error || 'Update failed: Invalid response from server');
              }
              console.log("✅ Update successful:", result);
              
              // Ensure entryId is set in state (in case backend returns updated entry with ID)
              const updatedEntryId = result.data?.id?.toString() || actualEntryId;
              
              // Update entryId cache using entryId as key (not date+projectId, since we allow duplicates)
              if (updatedEntryId) {
                entryIdCacheRef.current.set(updatedEntryId, updatedEntryId);
              }
              
              setEntries(prev => {
                  const dayEntry = prev[date] ? { ...prev[date] } : { projects: [], totalHours: 0, isHoliday: false, isOnLeave: false, leaveType: null, dayStatus: null };
                  const updatedProjects = Array.isArray(dayEntry.projects) ? [...dayEntry.projects] : [];
                  
                  // Convert payloadProjectId to string for comparison
                  const payloadProjectIdStr = payloadProjectId?.toString();
                  
                  // Find by entryId when available (allows multiple entries for same project)
                  // Use type-safe comparison
                  const projectIndex = updatedEntryId 
                    ? updatedProjects.findIndex(p => p.entryId?.toString() === updatedEntryId)
                    : updatedProjects.findIndex(p => {
                        const pProjectId = p.projectId?.toString();
                        return pProjectId === payloadProjectIdStr && !p.entryId;
                      });
                  
                  if (projectIndex !== -1) {
                      // Ensure entryId is set for the matching project and update all fields
                      updatedProjects[projectIndex] = { 
                        ...updatedProjects[projectIndex], 
                        entryId: updatedEntryId,
                        // Ensure all fields are up to date from the saved data
                        clientId: projectEntryData.clientId || updatedProjects[projectIndex].clientId,
                        projectId: payloadProjectId || updatedProjects[projectIndex].projectId,
                        hours: Number(hours) || updatedProjects[projectIndex].hours || 0,
                        taskDescription: taskDescription || updatedProjects[projectIndex].taskDescription || ""
                      };
                      
                      // Clear holiday/leave flags if this is a working entry
                      const updatedDayEntry = { ...dayEntry, projects: updatedProjects };
                      if (hasWorkToSave) {
                          updatedDayEntry.isHoliday = false;
                          updatedDayEntry.isOnLeave = false;
                      }
                      
                      // Recalculate totalHours
                      updatedDayEntry.totalHours = updatedProjects.reduce((sum, p) => sum + (Number(p.hours) || 0), 0);
                      
                      console.log(`✅ Updated project entry in state with entryId ${updatedEntryId} for date ${date}`);
                      return { ...prev, [date]: updatedDayEntry };
                  } else {
                      // If entry not found, add it (shouldn't happen for updates, but handle gracefully)
                      console.warn(`⚠️ Project entry not found in state for update (entryId: ${updatedEntryId}), adding it`);
                      const newProjectEntry = {
                          entryId: updatedEntryId,
                          clientId: projectEntryData.clientId || null,
                          projectId: payloadProjectId,
                          hours: Number(hours) || 0,
                          taskDescription: taskDescription || ""
                      };
                      updatedProjects.push(newProjectEntry);
                      const totalHours = updatedProjects.reduce((sum, p) => sum + (Number(p.hours) || 0), 0);
                      return { ...prev, [date]: { ...dayEntry, projects: updatedProjects, totalHours } };
                  }
              });

          } else {
              // CREATE (POST) - No entryId found, create a new entry
              // Allow multiple entries for the same project on the same date
              console.log(`🆕 Using POST to create new entry for project ${payloadProjectId} on date ${date}`);
              result = await apiPost(`/api/timesheets/${timesheetId}/entries`, payload);
                  // Check for explicit failure
                  if (result && result.success === false) {
                    throw new Error(result.error || 'Create/Update failed');
                  }
                  // If result is null/undefined, this is an error
                  if (!result) {
                    throw new Error('Create/Update failed: No response from server');
                  }
                  // If success field is missing or not true, this is an error
                  if (result.success !== true) {
                    throw new Error(result.error || 'Create/Update failed: Invalid response from server');
                  }
                  // Check for required data fields
                  if (!result.data || !result.data.id) {
                    throw new Error('Create/Update succeeded but did not return entry ID');
                  }
              console.log("✅ Create/Update successful:", result);

              const newEntryId = result.data.id.toString();
                  
                  // Cache the new entryId using entryId as key
                  entryIdCacheRef.current.set(newEntryId, newEntryId);
                  
              setEntries(prev => {
                      const dayEntry = prev[date] ? { ...prev[date] } : { projects: [], totalHours: 0, isHoliday: false, isOnLeave: false, leaveType: null, dayStatus: null };
                  const updatedProjects = Array.isArray(dayEntry.projects) ? [...dayEntry.projects] : [];
                  
                  // Convert payloadProjectId to string for comparison
                  const payloadProjectIdStr = payloadProjectId?.toString();
                  
                  // Find the first entry with matching projectId that doesn't have an entryId yet
                  // This allows multiple entries for the same project - each gets its own entryId
                  // Use type-safe comparison (convert both to strings)
                  const projectIndex = updatedProjects.findIndex(p => {
                    const pProjectId = p.projectId?.toString();
                    return pProjectId === payloadProjectIdStr && !p.entryId;
                  });
                  
                  if (projectIndex !== -1) {
                      // Update the entryId for the matching project entry and ensure all fields are preserved
                      updatedProjects[projectIndex] = { 
                        ...updatedProjects[projectIndex], 
                        entryId: newEntryId,
                        // Ensure all fields are up to date from the saved data
                        clientId: projectEntryData.clientId || updatedProjects[projectIndex].clientId,
                        projectId: payloadProjectId || updatedProjects[projectIndex].projectId,
                        hours: Number(hours) || updatedProjects[projectIndex].hours || 0,
                        taskDescription: taskDescription || updatedProjects[projectIndex].taskDescription || ""
                      };
                      
                      // Clear holiday/leave flags if this is a working entry
                      const updatedDayEntry = { ...dayEntry, projects: updatedProjects };
                      if (hasWorkToSave) {
                          updatedDayEntry.isHoliday = false;
                          updatedDayEntry.isOnLeave = false;
                      }
                      
                      // Recalculate totalHours
                      updatedDayEntry.totalHours = updatedProjects.reduce((sum, p) => sum + (Number(p.hours) || 0), 0);
                      
                      console.log(`✅ Updated project entry in state with entryId ${newEntryId} for date ${date}`);
                      return { ...prev, [date]: updatedDayEntry };
                  } else {
                      // If project not found, add it (this can happen when entries are loaded from backend
                      // but the project list hasn't loaded yet, or when saving entries for dates outside current view)
                      // This is handled gracefully by adding the project entry
                      if (process.env.NODE_ENV === 'development') {
                          console.log(`Project ${payloadProjectId} not found in state for date ${date}, adding it (this is normal when loading saved entries)`);
                      }
                      
                      const newProjectEntry = {
                          entryId: newEntryId,
                          clientId: projectEntryData.clientId || null,
                          projectId: payloadProjectId,
                          hours: Number(hours) || 0,
                          taskDescription: taskDescription || ""
                      };
                      
                      updatedProjects.push(newProjectEntry);
                      
                      // Recalculate totalHours
                      const totalHours = updatedProjects.reduce((sum, p) => sum + (Number(p.hours) || 0), 0);
                      
                      console.log(`✅ Added new project entry to state with entryId ${newEntryId} for date ${date}`);
                      return { ...prev, [date]: { ...dayEntry, projects: updatedProjects, totalHours } };
                  }
              });
              }
      } catch (error) {
          // Only show error toast for actual errors (not network timeouts that might have succeeded)
          console.error("Failed to save entry:", error);
          // Check if this is a network error that might have actually succeeded
          const isNetworkError = error.message && (
            error.message.includes('Failed to fetch') || 
            error.message.includes('NetworkError') ||
            error.message.includes('network')
          );
          if (isNetworkError) {
            console.warn("⚠️ Network error during save - operation may have succeeded on server");
            // Don't show error toast for network errors as the operation might have succeeded
            return;
          }
          toast({ title: "Save Error", description: `Could not save entry: ${error.message}`, variant: "destructive" });
      }
  }, [toast, entries, selectedMonth, messages]); 

  const createTimesheetForMonth = useCallback(async () => {
    if (!selectedMonth || !user || !user.id) {
        console.error("Cannot create timesheet: Missing month or user.");
        toast({ 
          title: "Error", 
          description: "Cannot create timesheet: Missing month or user information.", 
          variant: "destructive" 
        });
        return null;
    }
    console.log(`Attempting to create timesheet for ${selectedMonth}`);
    const currentUserId = user.id;
    const [year, monthNum] = selectedMonth.split('-').map(Number);
    try {
        const result = await apiPost('/api/timesheets', {
            userId: currentUserId,
            year: year,
            month: monthNum,
        });
        if (result.success && result.data && result.data.id) {
            console.log("Timesheet created successfully:", result.data);
            return result.data.id;
        } else {
            const errorMsg = result.error || "Failed to create timesheet.";
            console.error("Error creating timesheet:", errorMsg);
            toast({ 
              title: "Error Creating Timesheet", 
              description: errorMsg, 
              variant: "destructive" 
            });
            return null;
        }
    } catch (error) {
        console.error("Error creating timesheet:", error);
        const errorMsg = error.message || "Failed to create timesheet. Please try again.";
        toast({ 
          title: "Error Creating Timesheet", 
          description: errorMsg, 
          variant: "destructive" 
        });
        return null;
    }
  }, [selectedMonth, user, toast]); 


  const deleteEntryFromApi = useCallback(async (entryId) => {
       if (!entryId) return;
       console.log(`Deleting entry ${entryId}`);
       try {
           const result = await apiDelete(`/api/timesheets/entries/${entryId}`);
           // Check for explicit failure
           if (result && result.success === false) {
             throw new Error(result.error || 'Delete failed');
           }
           // If result exists but success is not true, check if it's an actual error
           // DELETE operations can return empty responses, so we're lenient here
           if (result && result.success !== true && result.error) {
             throw new Error(result.error || 'Delete failed');
           }
           // If no result or success is not explicitly true, log but don't error (DELETE may return empty)
           if (!result || result.success !== true) {
             console.log("⚠️ Delete response was empty or missing success field - assuming success (DELETE can return empty)");
             return; // Exit early - deletion likely succeeded
           }
           console.log("Delete successful");
       } catch (error) {
           console.error("Failed to delete entry:", error);
           // Check if this is a network error that might have actually succeeded
           const isNetworkError = error.message && (
             error.message.includes('Failed to fetch') || 
             error.message.includes('NetworkError') ||
             error.message.includes('network')
           );
           if (isNetworkError) {
             console.warn("⚠️ Network error during delete - operation may have succeeded on server");
             // Don't show error toast for network errors as the operation might have succeeded
             return;
           }
           toast({ title: "Delete Error", description: `Could not delete entry: ${error.message}`, variant: "destructive" });
       }
   }, [toast]);

  const triggerSave = useCallback((date, projectEntryData, timesheetId) => {
    // Use entryId if available for precise tracking, otherwise use date+projectId for debouncing
    // This allows multiple entries for the same project on the same date
    const entryId = projectEntryData.entryId?.toString();
    const projectId = projectEntryData.projectId?.toString() || 'default';
    const saveKey = entryId || `${date}_${projectId}`;
    
    // Cancel any pending save for this entry
    const existingTimeout = pendingSavesRef.current.get(saveKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      pendingSavesRef.current.delete(saveKey);
    }
    
    // Create new debounced save
    const timeoutId = setTimeout(() => {
      // Get the latest entryId from cache (updated by previous saves)
      const cachedEntryId = entryIdCacheRef.current.get(saveKey);
      if (cachedEntryId && !projectEntryData.entryId) {
        // Use cached entryId if not provided in projectEntryData
        projectEntryData.entryId = cachedEntryId;
      }
      
        saveEntryToApi(date, projectEntryData, timesheetId);
      pendingSavesRef.current.delete(saveKey);
    }, 1000);
    
    pendingSavesRef.current.set(saveKey, timeoutId);
  }, [saveEntryToApi]); 


  const updateDayStatus = (date, status) => {
    setEntries(prev => {
        const prevDayEntry = prev[date] || { projects: [], totalHours: 0, isHoliday: false, isOnLeave: false, leaveType: null, dayStatus: null };
        let dayEntry = { ...prevDayEntry };
        
        // Reset all status flags
        dayEntry.isHoliday = false;
        dayEntry.isOnLeave = false;
        dayEntry.leaveType = null;
        
        // Set status based on selection
        if (status === 'working-day') {
          // Explicitly mark as working day - clear holiday/leave flags
          dayEntry.isHoliday = false;
          dayEntry.isOnLeave = false;
          dayEntry.leaveType = null;
          dayEntry.dayStatus = 'working-day'; // Track explicit selection
          // Ensure at least one project entry exists for immediate editing
          if (!dayEntry.projects || dayEntry.projects.length === 0) {
            dayEntry.projects = [{ clientId: null, projectId: null, hours: 0, taskDescription: "", entryId: null }];
          }
          // Reset totalHours if it was set to 8 (from full-day leave)
          if (dayEntry.totalHours === 8 && prevDayEntry.isOnLeave && prevDayEntry.leaveType === 'full-day') {
            dayEntry.totalHours = 0;
          }
        } else if (status === 'holiday') {
          dayEntry.isHoliday = true;
          dayEntry.dayStatus = 'holiday'; // Track explicit selection
          // Clear all project entries and set hours to 0
          dayEntry.projects = [];
          dayEntry.totalHours = 0;
        } else if (status === 'half-day-leave') {
          dayEntry.isOnLeave = true;
          dayEntry.leaveType = 'half-day';
          dayEntry.dayStatus = 'half-day-leave'; // Track explicit selection
          // Ensure at least one project entry exists for immediate editing
          if (!dayEntry.projects || dayEntry.projects.length === 0) {
            dayEntry.projects = [{ clientId: null, projectId: null, hours: 0, taskDescription: "", entryId: null }];
          }
          // Reset totalHours if it was set to 8 (from full-day leave)
          if (dayEntry.totalHours === 8 && prevDayEntry.isOnLeave && prevDayEntry.leaveType === 'full-day') {
            dayEntry.totalHours = 0;
          }
        } else if (status === 'full-day-leave') {
          dayEntry.isOnLeave = true;
          dayEntry.leaveType = 'full-day';
          dayEntry.dayStatus = 'full-day-leave'; // Track explicit selection
          // Clear all project entries and set hours to 8h (company policy for full-day leave)
          dayEntry.projects = [];
          dayEntry.totalHours = 8;
        } else if (status === 'no-entry') {
          // Reset to default state
          dayEntry.isHoliday = false;
          dayEntry.isOnLeave = false;
          dayEntry.leaveType = null;
          dayEntry.dayStatus = null; // Clear explicit selection
        }
        
        const updated = { ...prev, [date]: dayEntry };
        
        // Save to localStorage for persistence (only for draft timesheets)
        if (timesheetStatus === 'draft') {
          saveEntriesToLocalStorage(updated);
        }
        
        return updated;
      });
  };

  const updateProjectEntry = (date, projectIndex, field, value) => {
    let updatedProjectEntry = null; 
    let shouldSave = false;

    setEntries(prev => {
      const dayEntry = prev[date] ? { ...prev[date] } : { projects: [], totalHours: 0, isHoliday: false, isOnLeave: false, leaveType: null, dayStatus: null };
      const updatedProjects = Array.isArray(dayEntry.projects) ? [...dayEntry.projects] : [];

      if (!updatedProjects[projectIndex]) {
        updatedProjects[projectIndex] = { clientId: null, projectId: null, hours: 0, taskDescription: "", entryId: null };
      } else {
         updatedProjects[projectIndex] = { ...updatedProjects[projectIndex] };
      }

      let processedValue = value;
      if (field === 'hours') {
        // Validate decimal places: allow only up to 2 decimal places
        if (value && value.toString().trim() !== '') {
          const stringValue = value.toString();
          // Check if value contains a decimal point
          if (stringValue.includes('.')) {
            const decimalPart = stringValue.split('.')[1];
            // If decimal part exists and has more than 2 digits, reject the input
            if (decimalPart && decimalPart.length > 2) {
              toast({ 
                title: "Invalid Hours Format", 
                description: "Hours can only have up to 2 decimal places. For example: 1.25 is allowed, but 1.2345 is not.", 
                variant: "destructive" 
              });
              return prev;
            }
          }
        }
        
        processedValue = value ? parseFloat(value) : 0;
        
        // Check if this is a half-day leave (max 6h restriction)
        const isHalfDayLeave = dayEntry.isOnLeave && dayEntry.leaveType === 'half-day';
        
        // Daily validation: Check if total hours for the day exceeds limits
        const currentTotal = updatedProjects.reduce((sum, p, idx) => {
          if (idx === projectIndex) {
            return sum + processedValue;
          }
          return sum + (Number(p.hours) || 0);
        }, 0);
        
        // Half-day leave: max 6h
        if (isHalfDayLeave && currentTotal > 6) {
          const msg = "Half Day Leave allows maximum 6 hours. Please adjust your hours.";
          const title = "Half Day Leave Hours Limit";
          toast({ 
            title: title, 
            description: msg, 
            variant: "destructive" 
          });
          return prev;
        }
        
        // Regular working day: max 12h
        if (!dayEntry.isHoliday && !dayEntry.isOnLeave && currentTotal > 12) {
          const msg = messages?.validation?.dailyMaxHours || "Maximum 12 hours per day allowed. Please adjust your hours.";
          const title = messages?.validation?.dailyMaxHoursTitle || "Daily Hours Limit Exceeded";
          toast({ 
            title: title, 
            description: msg, 
            variant: "destructive" 
          });
          return prev;
        }
      } else if (field === 'taskDescription') {
        // Validate character limit for task description
        const maxLength = 1000;
        if (value && value.length > maxLength) {
          toast({ 
            title: "Character Limit Exceeded", 
            description: `Task description cannot exceed ${maxLength} characters. Current length: ${value.length} characters.`, 
            variant: "destructive" 
          });
          // Truncate to max length
          processedValue = value.substring(0, maxLength);
        } else {
          processedValue = value;
        }
      }
      updatedProjects[projectIndex][field] = processedValue;

      if (field === 'clientId') {
        updatedProjects[projectIndex].projectId = null;
      }

      const totalHours = updatedProjects.reduce((sum, p) => sum + (Number(p.hours) || 0), 0);
      
      // Final check: Ensure total doesn't exceed limits after update
      const isHalfDayLeave = dayEntry.isOnLeave && dayEntry.leaveType === 'half-day';
      
      if (isHalfDayLeave && totalHours > 6) {
        const msg = "Half Day Leave allows maximum 6 hours. Please adjust your hours.";
        const title = "Half Day Leave Hours Limit";
        toast({ 
          title: title, 
          description: msg, 
          variant: "destructive" 
        });
        return prev;
      }
      
      if (!dayEntry.isHoliday && !dayEntry.isOnLeave && totalHours > 12) {
        const msg = messages?.validation?.dailyMaxHours || "Maximum 12 hours per day allowed. Please adjust your hours.";
        const title = messages?.validation?.dailyMaxHoursTitle || "Daily Hours Limit Exceeded";
        toast({ 
          title: title, 
          description: msg, 
          variant: "destructive" 
        });
        return prev;
      }
      
      updatedProjectEntry = updatedProjects[projectIndex];
      shouldSave = true;

      const updated = {
        ...prev,
        [date]: { ...dayEntry, projects: updatedProjects, totalHours: totalHours }
      };
      
      // Save to localStorage for persistence (only for draft timesheets)
      if (timesheetStatus === 'draft') {
        saveEntriesToLocalStorage(updated);
      }
      
      return updated;
    });

     // Removed auto-save: Entries will only be saved when user clicks Submit button
     // No API calls are made while user is filling the timesheet
  };

  const addProjectRow = (date) => {
    setEntries(prev => {
      const dayEntry = prev[date] || { projects: [], totalHours: 0, isHoliday: false, isOnLeave: false, leaveType: null, dayStatus: null };
      const currentProjects = Array.isArray(dayEntry.projects) ? dayEntry.projects : [];
      const updatedProjects = [...currentProjects, { clientId: null, projectId: null, hours: 0, taskDescription: "", entryId: null }];
      const updated = { ...prev, [date]: { ...dayEntry, projects: updatedProjects } };
      
      // Save to localStorage for persistence (only for draft timesheets)
      if (timesheetStatus === 'draft') {
        saveEntriesToLocalStorage(updated);
      }
      
      return updated;
    });
  };

  const removeProjectRow = (date, projectIndex) => {
    let entryToDeleteId = null; 
    let projectIdToRemove = null;

    setEntries(prev => {
      const dayEntry = prev[date];
      if (!dayEntry || !Array.isArray(dayEntry.projects)) return prev;
      
      const projectToRemove = dayEntry.projects[projectIndex];
      if (projectToRemove) {
        entryToDeleteId = projectToRemove.entryId;
        projectIdToRemove = projectToRemove.projectId?.toString() || 'default';
      }

      if (dayEntry.projects.length === 1 && !projectToRemove?.entryId && !projectToRemove?.clientId && !projectToRemove?.projectId) {
          return prev;
      }
      
      if (dayEntry.projects.length > 1) {
          const updatedProjects = dayEntry.projects.filter((_, index) => index !== projectIndex);
          const totalHours = updatedProjects.reduce((sum, p) => sum + (Number(p.hours) || 0), 0);
          const updated = { ...prev, [date]: { ...dayEntry, projects: updatedProjects, totalHours: totalHours } };
          
          // Save to localStorage for persistence (only for draft timesheets)
          if (timesheetStatus === 'draft') {
            saveEntriesToLocalStorage(updated);
          }
          
          return updated;
      }

      if (dayEntry.projects.length === 1 && projectToRemove?.entryId) {
           const clearedProject = { ...projectToRemove, hours: 0, taskDescription: "", projectId: null, clientId: null };
           const totalHours = 0;
           const updated = { ...prev, [date]: { ...dayEntry, projects: [clearedProject], totalHours: totalHours }};
           
           // Save to localStorage for persistence (only for draft timesheets)
           if (timesheetStatus === 'draft') {
             saveEntriesToLocalStorage(updated);
           }
           
           return updated;
      }
      return prev;
    });

    // Removed auto-delete: Entries will only be saved/deleted when user clicks Submit button
    // No API calls are made while user is filling the timesheet
    // When submit is clicked, only entries in state will be saved (removed entries won't be saved)
  };


  const canSaveTimesheet = () => { 
      return true;
  };
  const getStatusBadge = (entry, isDisabled) => {
    if (isDisabled) return <Badge className="bg-gray-100 text-gray-600 border-0 text-xs">N/A</Badge>;
    
    const totalHours = entry?.totalHours || 0;
    
    // Show status based on day marking
    if (entry?.isHoliday) {
      return <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">Holiday</Badge>;
    }
    if (entry?.isOnLeave) {
      if (entry?.leaveType === 'half-day') {
        return <Badge className="bg-yellow-100 text-yellow-700 border-0 text-xs">Half Day Leave</Badge>;
      }
      return <Badge className="bg-red-100 text-red-700 border-0 text-xs">Full Day Leave</Badge>;
    }
    
    // Show hours status for working days (no badge for empty entries)
    if (totalHours === 8) return <Badge className="bg-green-100 text-green-700 border-0 text-xs">✓</Badge>;
    if (totalHours > 0) return <Badge className="bg-yellow-100 text-yellow-700 border-0 text-xs">{totalHours}h</Badge>;
    return null; // No badge for empty entries
  };

  // Helper function to get day suffix (1st, 2nd, 3rd, etc.)
  const getDaySuffix = (day) => {
    if (day >= 11 && day <= 13) {
      return 'th';
    }
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

   const handleSubmit = useCallback(async () => {
    // Prevent multiple submissions
    if (isSubmitting) {
      console.log("⚠️ Submit already in progress, ignoring duplicate click");
      return;
    }

    // Set loading state immediately
    setIsSubmitting(true);

    try {
    // Validate submission eligibility based on month and status
    if (!selectedMonth) {
      toast({ 
        title: "Error", 
        description: "Please select a month to submit.", 
        variant: "destructive" 
      });
      setIsSubmitting(false);
      return;
    }

    const now = new Date();
    const currentDay = now.getDate();
    const [selectedYear, selectedMonthNum] = selectedMonth.split('-').map(Number);
    const selectedDate = new Date(selectedYear, selectedMonthNum - 1, 1);
    const currentDate = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Determine if selected month is current, previous, or future
    const isCurrentMonth = selectedDate.getTime() === currentDate.getTime();
    const isPreviousMonth = selectedDate < currentDate;
    const isFutureMonth = selectedDate > currentDate;
    
    // Block future months
    if (isFutureMonth) {
      const msg = messages?.validation?.submitDateRestriction || "Cannot submit timesheets for future months.";
      const title = messages?.validation?.submitDateRestrictionTitle || "Submission Not Allowed";
      toast({ 
        title: title, 
        description: msg, 
        variant: "destructive" 
      });
      setIsSubmitting(false);
      return;
    }
    
    // For current month: check admin-configured submission window
    if (isCurrentMonth) {
      // Check if date range is configured
      if (submitStartDate !== null && submitEndDate !== null) {
        // Ensure values are numbers for comparison
        const startDay = Number(submitStartDate);
        const endDay = Number(submitEndDate);
        
        // Validate that current day is within the submission window
        const isWithinWindow = currentDay >= startDay && currentDay <= endDay;
        
        console.log('📅 Submit validation - Date window check:', {
          currentDay,
          startDay,
          endDay,
          isWithinWindow
        });
        
        if (!isWithinWindow) {
          const msg = messages?.validation?.submitDateRestriction || `Timesheet submission is only allowed between the ${startDay}${getDaySuffix(startDay)} and ${endDay}${getDaySuffix(endDay)} of each month.`;
          const title = messages?.validation?.submitDateRestrictionTitle || "Submission Not Allowed";
          toast({ 
            title: title, 
            description: msg, 
            variant: "destructive" 
          });
          setIsSubmitting(false);
          return;
        }
      }
      // If date range is not configured, allow submission any day (backward compatibility)
    } 
    // For previous month: allow only if timesheet is draft or rejected
    else if (isPreviousMonth) {
      const status = timesheetStatus?.toLowerCase() || 'draft';
      // Allow submission if status is 'draft' (never submitted) or 'rejected' (can resubmit)
      if (status !== 'draft' && status !== 'rejected') {
        const msg = messages?.validation?.submitDateRestriction || "This timesheet has already been submitted or approved. Only draft or rejected timesheets can be submitted for previous months.";
        const title = messages?.validation?.submitDateRestrictionTitle || "Submission Not Allowed";
        toast({ 
          title: title, 
          description: msg, 
          variant: "destructive" 
        });
        setIsSubmitting(false);
        return;
      }
    }
    
      // Validate monthly total hours (including leaves and holidays)
      // IMPORTANT: Use same calculation logic as display
      const workingHours = Object.values(entries).reduce((sum, entry) => {
        if (entry?.isHoliday) {
          return sum; // Exclude holidays from working hours
        }
        if (entry?.isOnLeave && entry?.leaveType === 'half-day') {
          // Half-day leave: include actual hours worked
          return sum + (entry?.totalHours || 0);
        }
        if (entry?.isOnLeave && entry?.leaveType === 'full-day') {
          return sum; // Exclude full-day leaves from working hours
        }
        return sum + (entry?.totalHours || 0);
      }, 0);
    const fullDayLeaveDays = Object.values(entries).filter(entry => entry?.isOnLeave && entry?.leaveType === 'full-day').length;
    // Count half-day leaves separately (they contribute 4 hours leave + work hours)
    const halfDayLeaveDays = Object.values(entries).filter(entry => entry?.isOnLeave && entry?.leaveType === 'half-day').length;
    const holidayDays = Object.values(entries).filter(entry => entry?.isHoliday).length;
    // Total hours = working hours + (full-day leaves * 8) + (half-day leaves * 4) + (holidays * 8)
    // Note: Half-day leave work hours are already included in workingHours
    const totalMonthlyHours = workingHours + (fullDayLeaveDays * 8) + (halfDayLeaveDays * 4) + (holidayDays * 8);
    
    if (totalMonthlyHours < 160) {
      const msg = messages?.validation?.monthlyMinHours || "You must have a minimum of 160 total working hours (including leave and holiday hours) to submit the timesheet.";
      const title = messages?.validation?.monthlyMinHoursTitle || "Insufficient Monthly Hours";
      toast({ 
        title: title, 
        description: msg, 
        variant: "destructive" 
      });
        setIsSubmitting(false);
      return;
    }
    
    let timesheetIdToSubmit = currentTimesheetId;
    
    // If timesheet doesn't exist, create it first
    if (!timesheetIdToSubmit) {
        console.log("Timesheet ID not found, creating timesheet before submission...");
        const newTimesheetId = await createTimesheetForMonth();
        if (!newTimesheetId) {
            toast({ title: "Error", description: "Cannot submit: Failed to create timesheet.", variant: "destructive"});
              setIsSubmitting(false);
            return;
        }
        timesheetIdToSubmit = newTimesheetId;
        setCurrentTimesheetId(newTimesheetId);
        // Small delay to ensure timesheet is created
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Check current status before submitting
    console.log(`Current timesheet status before submit: ${timesheetStatus}`);
    console.log(`Submitting timesheet ID: ${timesheetIdToSubmit}`);
    
    // If already submitted, don't try to submit again
    if (timesheetStatus !== 'draft') {
        const msg = messages?.ui?.alreadySubmitted?.replace('{status}', timesheetStatus) || `This timesheet is already ${timesheetStatus}. Cannot submit again.`;
        const title = messages?.ui?.alreadySubmittedTitle || "Already Submitted";
        toast({ 
          title: title, 
          description: msg,
          variant: "destructive"
        });
          setIsSubmitting(false);
        return;
    }
        // First, verify the timesheet status from the server before submitting
        console.log('🔍 Verifying timesheet status from server before submission...');
        const verifyResult = await apiGet(`/api/timesheets/${timesheetIdToSubmit}`);
        
        if (!verifyResult.success || !verifyResult.data) {
            throw new Error('Could not verify timesheet status');
        }
        
        const serverStatus = verifyResult.data.status || 'draft';
        console.log(`📋 Server timesheet status: "${serverStatus}" (frontend status: "${timesheetStatus}")`);
        
        if (serverStatus !== 'draft') {
            // Update frontend state to match server
            setTimesheetStatus(serverStatus);
            setIsReadOnly(serverStatus !== 'draft');
            if (onStatusChange) {
                onStatusChange(serverStatus);
            }
            
            const cannotSubmitMsg = messages?.ui?.cannotSubmit?.replace('{status}', serverStatus) || `Timesheet status is "${serverStatus}". Only draft timesheets can be submitted.`;
            const cannotSubmitTitle = messages?.ui?.cannotSubmitTitle || "Cannot Submit";
            toast({ 
                title: cannotSubmitTitle, 
                description: cannotSubmitMsg,
                variant: "destructive"
            });
            setIsSubmitting(false);
            return;
        }
        
        // Prepare raw per-day data for backend
        // Frontend sends: date, workingHours, isHoliday, isLeave, projectEntries (exact values as displayed)
        // Backend will save all values exactly as received without any calculations or modifications
        console.log('💾 Preparing raw per-day data for backend...');
        
        const dailyEntries = [];
        
        // Sort entries by date to ensure consistent order (fixes issue where first entry might be skipped)
        // Object.entries() doesn't guarantee order, so we sort by date string (YYYY-MM-DD format sorts correctly)
        const sortedEntries = Object.entries(entries).sort(([dateA], [dateB]) => {
          return dateA.localeCompare(dateB);
        });
        
        console.log(`📅 Processing ${sortedEntries.length} entries in date order...`);
        
        // Collect all entries from state - send raw per-day data exactly as displayed
        for (const [date, dayEntry] of sortedEntries) {
          // Calculate workingHours for this day (sum of project hours, excluding holiday/leave days)
          // For half-day leave, include the actual hours worked
          let workingHours = 0;
          if (dayEntry.isOnLeave && dayEntry.leaveType === 'half-day') {
            // Half-day leave: include actual hours worked (up to 6h)
            workingHours = dayEntry.totalHours || 0;
          } else if (!dayEntry.isHoliday && !dayEntry.isOnLeave) {
            // Regular working day: include all hours
            workingHours = dayEntry.totalHours || 0;
          }
          // For holiday and full-day leave, workingHours remains 0 (they get 8h credit separately)
          
          // Collect project entries for this day (raw data, no modifications)
          const projectEntries = [];
          if (Array.isArray(dayEntry.projects) && dayEntry.projects.length > 0) {
            for (const projectEntry of dayEntry.projects) {
                // Include all project entries exactly as stored
                if (projectEntry.clientId && projectEntry.projectId) {
                  // Truncate task description to 1000 characters if it exceeds the limit
                  const maxDescriptionLength = 1000;
                  let taskDesc = projectEntry.taskDescription || "";
                  if (taskDesc && taskDesc.length > maxDescriptionLength) {
                    taskDesc = taskDesc.substring(0, maxDescriptionLength);
                  }
                  projectEntries.push({
                    projectId: projectEntry.projectId,
                    hours: Number(projectEntry.hours) || 0,
                    taskDescription: taskDesc
                  });
                }
            }
          }
          
          // Send raw per-day data exactly as received - backend will save without modification
          // Include is_halfday flag when leaveType is 'half-day'
          const isHalfDay = dayEntry.isOnLeave && dayEntry.leaveType === 'half-day';
          dailyEntries.push({
            date,
            workingHours: workingHours, // Per-day working hours (excludes holiday/leave)
            isHoliday: dayEntry.isHoliday || false,
            isLeave: dayEntry.isOnLeave || false,
            leaveType: dayEntry.leaveType || null, // 'half-day', 'full-day', or null
            is_halfday: isHalfDay ? 1 : 0, // Explicitly set is_halfday flag
            isHalfday: isHalfDay ? 1 : 0, // Support camelCase too
            projectEntries: projectEntries
          });
        }
        
        console.log('✅ Prepared daily entries:', {
          totalDays: dailyEntries.length,
          holidaysCount: dailyEntries.filter(d => d.isHoliday).length,
          leavesCount: dailyEntries.filter(d => d.isLeave).length,
          workingDaysCount: dailyEntries.filter(d => !d.isHoliday && !d.isLeave).length
        });
        
        // Validate payload before sending
        if (!timesheetIdToSubmit) {
          throw new Error('Timesheet ID is missing');
        }
        
        // Reuse the already calculated values from validation above
        // (workingHours, leaveDays, holidayDays, totalMonthlyHours are already calculated)
        
        // Prepare payload - backend will save all values exactly as received
        const submitPayload = {
          dailyEntries: dailyEntries,
          totalHours: totalMonthlyHours, // Frontend-calculated total, backend saves as-is
          // Working days: regular working days + half-day leave days (they have work hours)
          totalWorkingDays: Object.values(entries).filter(e => {
            if (e?.isHoliday) return false;
            if (e?.isOnLeave && e?.leaveType === 'full-day') return false;
            // Include regular working days and half-day leave days (they have work entries)
            return (e?.totalHours || 0) > 0;
          }).length,
          totalHolidays: holidayDays, // Reuse from validation above
          // Total leaves: only count full-day leaves (half-day leaves are counted separately in working days)
          totalLeaves: fullDayLeaveDays // Reuse from validation above
        };
        
        console.log('📤 Submitting payload (backend will save exactly as received):', {
          dailyEntriesCount: submitPayload.dailyEntries.length,
          totalHours: submitPayload.totalHours
        });
        
        // API call (now optimized - emails sent in background, response is faster)
        const result = await apiPost(`/api/timesheets/${timesheetIdToSubmit}/submit`, submitPayload);
        if (!result.success) throw new Error(result.error || 'Submit failed');

        // Show success message immediately after API confirms success
        const submitMsg = messages?.ui?.timesheetSubmitted || "Your timesheet is submitted for approval.";
        const submitTitle = messages?.ui?.timesheetSubmittedTitle || "Timesheet Submitted";
        toast({ title: submitTitle, description: submitMsg, variant: "success" });
        
        // Update UI state immediately
        clearLocalStorageEntries();
        setTimesheetStatus('submitted');
        setIsReadOnly(true);
        if (onStatusChange) {
          onStatusChange('submitted');
        }
        
        // Refresh to get latest status from server (non-blocking)
        setTimeout(async () => {
          console.log("Refreshing timesheet data after submission...");
          await fetchTimesheetAndEntries();
        }, 300);

    } catch (error) {
        console.error("Failed to submit timesheet:", error);
        toast({ title: "Submit Error", description: `Could not submit: ${error.message}`, variant: "destructive"});
      } finally {
          // Always clear loading state, even if there was an error
          setIsSubmitting(false);
    }
   }, [currentTimesheetId, toast, onStatusChange, fetchTimesheetAndEntries, timesheetStatus, messages, entries, selectedMonth, clearLocalStorageEntries, isSubmitting, submitStartDate, submitEndDate]);

   const handleSave = useCallback(async () => {
    // Prevent multiple saves
    if (isSaving || isSubmitting) {
      console.log("⚠️ Save already in progress, ignoring duplicate click");
      return;
    }

    // Set loading state immediately
    setIsSaving(true);

    try {
      let timesheetIdToSave = currentTimesheetId;
      
      // If timesheet doesn't exist, create it first
      if (!timesheetIdToSave) {
        console.log("Timesheet ID not found, creating timesheet before saving...");
        const newTimesheetId = await createTimesheetForMonth();
        if (!newTimesheetId) {
          toast({ title: "Error", description: "Cannot save: Failed to create timesheet.", variant: "destructive"});
          setIsSaving(false);
          return;
        }
        timesheetIdToSave = newTimesheetId;
        setCurrentTimesheetId(newTimesheetId);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Prepare daily entries for save (same format as submit)
      const dailyEntries = Object.keys(entries).map(date => {
        const entry = entries[date];
        const projectEntries = (entry.projects || []).filter(p => p.projectId && (p.hours > 0 || p.taskDescription));
        
        // Include is_halfday flag when leaveType is 'half-day'
        const isHalfDay = entry.isOnLeave && entry.leaveType === 'half-day';
        return {
          date,
          workingHours: entry.totalHours || 0,
          isHoliday: entry.isHoliday || false,
          isLeave: entry.isOnLeave || false,
          leaveType: entry.leaveType || null, // 'half-day', 'full-day', or null
          is_halfday: isHalfDay ? 1 : 0, // Explicitly set is_halfday flag
          isHalfday: isHalfDay ? 1 : 0, // Support camelCase too
           projectEntries: projectEntries.map(p => {
             // Truncate task description to 1000 characters if it exceeds the limit
             const maxDescriptionLength = 1000;
             let taskDesc = p.taskDescription || '';
             if (taskDesc && taskDesc.length > maxDescriptionLength) {
               taskDesc = taskDesc.substring(0, maxDescriptionLength);
             }
             return {
               projectId: p.projectId,
               hours: p.hours || 0,
               taskDescription: taskDesc
             };
           })
        };
      });

      // Calculate totals (same logic as submit)
      const workingHours = Object.values(entries).reduce((sum, entry) => {
        if (entry?.isHoliday) {
          return sum;
        }
        if (entry?.isOnLeave && entry?.leaveType === 'half-day') {
          return sum + (entry?.totalHours || 0);
        }
        if (entry?.isOnLeave && entry?.leaveType === 'full-day') {
          return sum;
        }
        return sum + (entry?.totalHours || 0);
      }, 0);
      // Count full-day leaves only (exclude half-day leaves from leave count)
      const fullDayLeaveDays = Object.values(entries).filter(entry => entry?.isOnLeave && entry?.leaveType === 'full-day').length;
      // Count half-day leaves separately (they contribute 4 hours leave + work hours)
      const halfDayLeaveDays = Object.values(entries).filter(entry => entry?.isOnLeave && entry?.leaveType === 'half-day').length;
      const holidayDays = Object.values(entries).filter(entry => entry?.isHoliday).length;
      // Total hours = working hours + (full-day leaves * 8) + (half-day leaves * 4) + (holidays * 8)
      // Note: Half-day leave work hours are already included in workingHours
      const totalMonthlyHours = workingHours + (fullDayLeaveDays * 8) + (halfDayLeaveDays * 4) + (holidayDays * 8);

      // Prepare payload for save
      const savePayload = {
        dailyEntries: dailyEntries,
        totalHours: totalMonthlyHours,
        // Working days: regular working days + half-day leave days (they have work hours)
        totalWorkingDays: Object.values(entries).filter(e => {
          if (e?.isHoliday) return false;
          if (e?.isOnLeave && e?.leaveType === 'full-day') return false;
          // Include regular working days and half-day leave days (they have work entries)
          return (e?.totalHours || 0) > 0;
        }).length,
        totalHolidays: holidayDays,
        // Total leaves: only count full-day leaves (half-day leaves are counted separately in working days)
        totalLeaves: fullDayLeaveDays
      };

      console.log('💾 Saving timesheet (draft):', {
        dailyEntriesCount: savePayload.dailyEntries.length,
        totalHours: savePayload.totalHours
      });

      // API call to save endpoint
      const result = await apiPost(`/api/timesheets/${timesheetIdToSave}/save`, savePayload);
      if (!result.success) throw new Error(result.error || 'Save failed');

      // Show success message
      toast({ title: "Timesheet Saved", description: "Your progress has been saved. You can continue editing later.", variant: "success" });
      
      // Clear localStorage after successful save - database is now source of truth
      clearLocalStorageEntries();
      
      // Refresh data from database to ensure UI matches saved state
      await fetchTimesheetAndEntries();
      
      // Don't change status or set isReadOnly - keep it as draft and editable

    } catch (error) {
      console.error("Failed to save timesheet:", error);
      toast({ title: "Save Error", description: `Could not save: ${error.message}`, variant: "destructive"});
    } finally {
      setIsSaving(false);
    }
   }, [currentTimesheetId, toast, entries, selectedMonth, isSaving, isSubmitting, clearLocalStorageEntries, fetchTimesheetAndEntries]);

   const handleResubmit = useCallback(async () => {
    // Prevent multiple resubmissions
    if (isResubmitting) {
        console.log("⚠️ Resubmit already in progress, ignoring duplicate click");
        return;
    }

    if (!currentTimesheetId) {
        toast({ title: "Error", description: "Cannot resubmit: Timesheet ID not found.", variant: "destructive"});
        return;
    }
    
    // Verify status is rejected
    if (timesheetStatus !== 'rejected') {
        toast({ 
          title: "Cannot Resubmit", 
          description: `Timesheet status is "${timesheetStatus}". Only rejected timesheets can be resubmitted.`,
          variant: "destructive"
        });
        return;
    }
    
    // Set loading state immediately
    setIsResubmitting(true);
    
    try {
        console.log(`🔄 Resubmitting timesheet ${currentTimesheetId}...`);
        const result = await apiPut(`/api/timesheets/${currentTimesheetId}/resubmit`, {});
        
        if (!result.success) {
            throw new Error(result.error || 'Resubmit failed');
        }
        
        console.log("Resubmit successful, refreshing timesheet data...");
        const resetMsg = messages?.ui?.timesheetReset || "Timesheet reset to draft. You can now edit and submit again.";
        const resetTitle = messages?.ui?.timesheetResetTitle || "Timesheet Reset";
        toast({ 
            title: resetTitle, 
            description: resetMsg,
            variant: "default"
        });
        
        // Update status to draft and make it editable
        setTimesheetStatus('draft');
        setIsReadOnly(false);
        if (onStatusChange) {
            onStatusChange('draft');
        }
        
    } catch (error) {
        console.error("Failed to resubmit timesheet:", error);
        const resubmitErrorMsg = messages?.ui?.resubmitError?.replace('{error}', error.message) || `Could not resubmit: ${error.message}`;
        const resubmitErrorTitle = messages?.ui?.resubmitErrorTitle || "Resubmit Error";
        toast({ 
            title: resubmitErrorTitle, 
            description: resubmitErrorMsg, 
            variant: "destructive"
        });
    } finally {
        // Always clear loading state immediately after API response (success or error)
        // This ensures the button is re-enabled as soon as the backend responds
        setIsResubmitting(false);
        
        // Refresh timesheet data to get updated status from server (non-blocking, after state is cleared)
        // Use setTimeout to ensure state update happens first
        setTimeout(async () => {
            console.log("Refreshing timesheet data after resubmit...");
            try {
                await fetchTimesheetAndEntries();
            } catch (refreshError) {
                console.error("Error refreshing timesheet data:", refreshError);
                // Don't show error toast for refresh failures - resubmit already succeeded
            }
        }, 100);
    }
   }, [currentTimesheetId, timesheetStatus, toast, onStatusChange, fetchTimesheetAndEntries, messages, isResubmitting]);

   useEffect(() => {
       if (onSubmitTimesheet) {
           onSubmitTimesheet(() => handleSubmit()); 
       }
   }, [onSubmitTimesheet, handleSubmit]);

   useEffect(() => {
       if (onSaveTimesheet) {
           onSaveTimesheet(() => handleSave()); 
       }
   }, [onSaveTimesheet, handleSave]);

   // Notify parent component of loading state changes
   useEffect(() => {
       if (onSubmitLoadingChange) {
           onSubmitLoadingChange(isSubmitting);
       }
   }, [isSubmitting, onSubmitLoadingChange]);

   useEffect(() => {
       if (onSaveLoadingChange) {
           onSaveLoadingChange(isSaving);
       }
   }, [isSaving, onSaveLoadingChange]);


  // --- Render ---
  if (isLoadingClientsProjects || !monthData) {
    return (
        <div className="flex items-center justify-center h-64">
             <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
             <span className="ml-2 text-slate-600">Loading component data...</span>
        </div>
    );
  }

  const allDays = monthData.weeks.flatMap(week => week.days);

  return (
    <>
      {isLoadingEntries && (
           <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
               <span className="ml-2 text-slate-600">Loading entries for {selectedMonth}...</span>
          </div>
      )}
      <div className={`space-y-6 ${isLoadingEntries ? 'opacity-50 pointer-events-none' : ''}`}>
        
        
        {/* Read-Only Alert Banner */}
        {isReadOnly && (
          <Alert className={`border-2 ${
            timesheetStatus === 'submitted' ? 'border-blue-500 bg-blue-50' :
            timesheetStatus === 'approved' ? 'border-green-500 bg-green-50' :
            timesheetStatus === 'rejected' ? 'border-red-500 bg-red-50' :
            'border-orange-500 bg-orange-50'
          }`}>
            <Lock className={`h-4 w-4 ${
              timesheetStatus === 'submitted' ? 'text-blue-600' :
              timesheetStatus === 'approved' ? 'text-green-600' :
              timesheetStatus === 'rejected' ? 'text-red-600' :
              'text-orange-600'
            }`} />
            <AlertDescription className={`${
              timesheetStatus === 'submitted' ? 'text-blue-800' :
              timesheetStatus === 'approved' ? 'text-green-800' :
              timesheetStatus === 'rejected' ? 'text-red-800' :
              'text-orange-800'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <strong className="font-semibold">
                    Timesheet {
                      timesheetStatus === 'submitted' ? 'Submitted for Approval' :
                      timesheetStatus === 'approved' ? 'Approved' :
                      timesheetStatus === 'rejected' ? 'Rejected' :
                      timesheetStatus.charAt(0).toUpperCase() + timesheetStatus.slice(1)
                    }.
                  </strong>
                  {' '}To edit this timesheet, please check with your manager.
                </div>
                {timesheetStatus === 'rejected' && (
                  <Button
                    onClick={handleResubmit}
                    className="ml-4 bg-red-600 hover:bg-red-700 text-white"
                    size="sm"
                    disabled={isResubmitting}
                  >
                    {isResubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Resubmitting...
                      </>
                    ) : (
                      'Resubmit for Approval'
                    )}
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        <Card className="bg-white border border-slate-200 shadow-sm flex flex-col max-h-[calc(100vh-10rem)]">
          <CardHeader className="sticky top-16 z-10 bg-white border-b border-slate-200 shadow-sm flex-shrink-0 pb-3 pt-3"> 
             <CardTitle className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <span>Daily Timesheet Entries</span>
              </span>
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-normal text-slate-500">
                    Fill 8 hours for each working day
                  </span>
                  <span className="text-xs font-normal text-slate-400 italic">
                    Tip: Click client dropdown to search
                  </span>
                </div>
                {timesheetStatus === 'draft' && (
                  <Button
                    onClick={handleSave}
                    variant="outline"
                    className="whitespace-nowrap flex-shrink-0 h-8 px-3 text-xs font-medium border-slate-300 hover:bg-slate-50"
                    disabled={isSaving || isSubmitting}
                    size="sm"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 flex-shrink-0 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                        <span>Save</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-y-auto flex-1 min-h-0 pt-2">
            <div className="space-y-1">
              {allDays.map((day) => {
                const entry = entries[day.fullDate] || { projects: [], totalHours: 0, isHoliday: false, isOnLeave: false, leaveType: null, dayStatus: null };
                const holiday = getHolidayByDate(day.fullDate);
                const isDisabled = day.isWeekend || !!holiday;
                const isMarkedHoliday = entry.isHoliday && !isDisabled;
                const isMarkedFullDayLeave = entry.isOnLeave && entry.leaveType === 'full-day' && !isDisabled;
                const isMarkedHalfDayLeave = entry.isOnLeave && entry.leaveType === 'half-day' && !isDisabled;
                // Hide project rows only for holiday or full-day leave (half-day allows entries)
                const hideProjectRows = isDisabled || isMarkedHoliday || isMarkedFullDayLeave;
                const currentDayProjects = Array.isArray(entry.projects) ? entry.projects : [];
                
                // Determine current day status for dropdown
                // Default to 'working-day' for working days, otherwise infer from flags
                let currentDayStatus = (!isDisabled && !holiday) ? 'working-day' : 'no-entry';
                // Use explicit dayStatus if set, otherwise infer from flags
                if (entry.dayStatus) {
                  currentDayStatus = entry.dayStatus;
                } else if (entry.isHoliday) {
                  currentDayStatus = 'holiday';
                } else if (entry.isOnLeave) {
                  currentDayStatus = entry.leaveType === 'half-day' ? 'half-day-leave' : 'full-day-leave';
                }
                // Default to working-day for working days if no explicit status is set
                
                // Determine if inputs should be disabled
                const inputsDisabled = isReadOnly || isDisabled || isMarkedHoliday || isMarkedFullDayLeave;

                // Apply disabled styling for weekend, system holidays, and user-marked Holiday/Full Day Leave
                const shouldShowAsDisabled = isDisabled || isMarkedHoliday || isMarkedFullDayLeave;
                
                return (
                  <div key={day.fullDate} className={`rounded border ${shouldShowAsDisabled ? 'bg-slate-50/50 border-slate-200' : 'bg-white border-slate-200 hover:bg-slate-50/50 transition-colors'}`}>
                    {/* Day Row Header: Date, Dropdown, Status/Projects Container, Total Hours */}
                    <div className="flex items-start gap-1.5 py-1.5 pl-1 pr-2">
                      {/* Left Section: Date and Dropdown */}
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                          {/* Date Label */}
                          <div className="flex items-center gap-1 min-w-[85px] flex-shrink-0">
                            <div className={`text-xs font-medium whitespace-nowrap ${day.isToday ? 'text-blue-600 font-semibold' : 'text-slate-700'}`}>
                              {day.dayName}, {day.date}
                            </div>
                            {isReadOnly && <Lock className="h-3 w-3 text-gray-400 flex-shrink-0" />}
                          </div>

                        {/* Mark Day As Dropdown - Always visible for all days (disabled for weekends/holidays) */}
                        <div className="flex-shrink-0">
                          <div className="flex items-center space-x-1">
                            <Select
                              value={isDisabled ? (day.isWeekend ? 'weekend' : 'holiday') : currentDayStatus}
                              onValueChange={(value) => updateDayStatus(day.fullDate, value)}
                              disabled={isReadOnly || isDisabled}
                            >
                              <SelectTrigger className={`h-7 w-[140px] text-xs ${isDisabled ? 'bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed opacity-100 hover:bg-slate-50' : ''}`}>
                                <SelectValue placeholder="Mark Day As" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="working-day">Working Day</SelectItem>
                                <SelectItem value="holiday">Holiday</SelectItem>
                                <SelectItem value="half-day-leave">Half Day Leave</SelectItem>
                                <SelectItem value="full-day-leave">Leave</SelectItem>
                                <SelectItem value="weekend" disabled>Weekend</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Status Badge - Show only for user-marked Holiday/Leave (not for weekends/system holidays) */}
                        {(() => {
                          // Show N/A badge for weekend/system holidays and user-marked Holiday/Leave
                          if (isDisabled || isMarkedHoliday || isMarkedFullDayLeave) {
                            if (isMarkedHoliday || isMarkedFullDayLeave) {
                              // Show N/A badge for user-marked Holiday/Leave (same as weekend)
                              return (
                                <div className="flex-shrink-0">
                                  <Badge className="bg-gray-100 text-gray-600 border-0 text-xs">N/A</Badge>
                                </div>
                              );
                            } else {
                              // Show status badge for weekend/system holidays
                              const statusBadge = getStatusBadge(entry, isDisabled);
                              if (statusBadge) {
                                return (
                                  <div className="flex-shrink-0">
                                    {statusBadge}
                                  </div>
                                );
                              }
                            }
                          }
                          return null;
                        })()}
                      </div>

                      {/* Center Section: Project Entries Container (Full Width) */}
                      <div className="flex-1 min-w-0">
                        {!hideProjectRows && currentDayProjects.length > 0 ? (
                          <div className="flex flex-col gap-1.5 w-full">
                            {currentDayProjects.map((projectEntry, projectIndex) => {
                              const availableProjects = projectEntry.clientId
                                ? projects.filter(p => p.clientId === projectEntry.clientId)
                                : [];
                              const totalProjects = currentDayProjects.length;
                              const isEmptyEntry = !projectEntry.clientId && !projectEntry.projectId && !projectEntry.hours && !projectEntry.taskDescription && !projectEntry.entryId;

                              return (
                                <div 
                                  key={projectEntry.entryId || `${day.fullDate}-${projectIndex}`} 
                                  className={`flex items-center gap-1.5 w-full ${projectIndex === 0 ? '' : 'pt-0'}`}
                                >
                                  {/* Project Label */}
                                  <div className="text-xs text-slate-500 font-medium flex items-center gap-1 flex-shrink-0 min-w-[30px]">
                                    <span>P{projectIndex + 1}</span>
                                    {isReadOnly && <Lock className="h-3 w-3 text-gray-400" />}
                                  </div>
                                  
                                  {/* Client Select */}
                                  <div className="flex-1 min-w-[120px] flex-shrink-0">
                                    <SearchableClientSelect
                                      value={projectEntry.clientId?.toString() || ""}
                                      onChange={(value) => updateProjectEntry(day.fullDate, projectIndex, 'clientId', value)}
                                      clients={clients}
                                      disabled={inputsDisabled}
                                    />
                                  </div>
                                  
                                  {/* Project Select */}
                                  <div className="flex-1 min-w-[140px] flex-shrink-0">
                                    <Select
                                      value={projectEntry.projectId?.toString() || ""}
                                      onValueChange={(value) => updateProjectEntry(day.fullDate, projectIndex, 'projectId', value)}
                                      disabled={!projectEntry.clientId || inputsDisabled}
                                    >
                                      <SelectTrigger className="h-7 text-xs">
                                        <SelectValue placeholder={!projectEntry.clientId ? "Select client" : "Select project"} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {availableProjects.map(proj => (
                                          <SelectItem key={proj.id} value={proj.id.toString()}>{proj.name}</SelectItem>
                                        ))}
                                        {availableProjects.length === 0 && projectEntry.clientId && (
                                          <SelectItem value="0" disabled>No projects</SelectItem>
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  {/* Hours Input */}
                                  <div className="w-[60px] flex-shrink-0">
                                    <Input 
                                      type="number" 
                                      min="0" 
                                      max={isMarkedHalfDayLeave ? "6" : "12"} 
                                      step="0.01" 
                                      value={projectEntry.hours || ''} 
                                      onChange={(e) => {
                                        const inputValue = e.target.value;
                                        // Validate decimal places before updating
                                        if (inputValue && inputValue.includes('.')) {
                                          const decimalPart = inputValue.split('.')[1];
                                          if (decimalPart && decimalPart.length > 2) {
                                            // Prevent input if more than 2 decimal places
                                            return;
                                          }
                                        }
                                        updateProjectEntry(day.fullDate, projectIndex, 'hours', inputValue);
                                      }} 
                                      className="h-7 text-xs" 
                                      placeholder="0h" 
                                      disabled={inputsDisabled}
                                    />
                                  </div>
                                  
                                  {/* Description Input */}
                                  <div className="flex-1 min-w-[150px] flex-shrink-0 relative">
                                    <AutoResizeTextarea
                                      value={projectEntry.taskDescription || ''} 
                                      onChange={(e) => updateProjectEntry(day.fullDate, projectIndex, 'taskDescription', e.target.value)} 
                                      placeholder={isEmptyEntry ? "Task Desc.." : "Description"} 
                                      className="text-xs pr-16 resize-none overflow-hidden"
                                      disabled={inputsDisabled}
                                      maxLength={1000}
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                                      <span className={((projectEntry.taskDescription || '').length > 900) ? 'text-orange-500' : ((projectEntry.taskDescription || '').length >= 1000) ? 'text-red-500' : ''}>
                                        {(projectEntry.taskDescription || '').length}/1000
                                      </span>
                                    </div>
                                  </div>

                                  {/* Add/Remove Buttons */}
                                  <div className="flex items-center gap-0.5 flex-shrink-0">
                                    {projectIndex === totalProjects - 1 && !inputsDisabled && (
                                      <Button variant="outline" size="icon" onClick={() => addProjectRow(day.fullDate)} className="h-6 w-6 text-blue-500 hover:text-blue-700 hover:bg-blue-50" aria-label="Add project row"><Plus className="h-3 w-3" /></Button>
                                    )}
                                    {!inputsDisabled && ( 
                                      <Button variant="outline" size="icon" onClick={() => removeProjectRow(day.fullDate, projectIndex)} className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50" aria-label="Remove project row"><Minus className="h-3 w-3" /></Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : hideProjectRows ? (
                          <div className="flex items-center justify-center w-full h-full text-xs text-slate-400">
                            {isDisabled ? (
                              day.isWeekend ? 'Weekend' : holiday ? holiday.title : 'N/A'
                            ) : isMarkedHoliday ? (
                              'Holiday'
                            ) : isMarkedFullDayLeave ? (
                              'Full Day Leave'
                            ) : (
                              'N/A'
                            )}
                          </div>
                        ) : null}
                      </div>

                      {/* Right Section: Total Hours Indicator - Fixed at Far Right */}
                      <div className={`flex-shrink-0 text-xs font-medium text-slate-700 min-w-[40px] text-right ${currentDayProjects.length > 1 ? 'self-start pt-1.5' : 'self-center'}`}>
                        {isMarkedHoliday || isMarkedFullDayLeave || (isDisabled && day.isWeekend) ? (
                          'N/A'
                        ) : entry.totalHours > 0 ? (
                          `${entry.totalHours}h`
                        ) : (
                          '0h'
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default TimesheetEntry;