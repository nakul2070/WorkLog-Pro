// Mock data for Timesheet Management System

export const mockProjects = [
  {
    id: 0,
    name: "Awaiting project allocation",
    clientId: null,
    client: "Internal",
    projectManager: "Admin Team",
    isActive: true
  },
  {
    id: 1,
    name: "Internal Development",
    clientId: 6,
    client: "Kadel Labs",
    projectManager: "Sarah Johnson",
    isActive: true
  },
  {
    id: 2,
    name: "Azure Migration",
    clientId: 1,
    client: "Microsoft",
    projectManager: "Michael Chen",
    isActive: true
  },
  {
    id: 3,
    name: "Office 365 Integration",
    clientId: 1,
    client: "Microsoft",
    projectManager: "David Rodriguez",
    isActive: true
  },
  {
    id: 4,
    name: "Teams Enhancement",
    clientId: 1,
    client: "Microsoft",
    projectManager: "Dr. Emily Watson",
    isActive: true
  },
  {
    id: 5,
    name: "Banking Portal Development",
    clientId: 2,
    client: "First National Bank",
    projectManager: "Robert Kim",
    isActive: true
  },
  {
    id: 6,
    name: "Mobile Banking App",
    clientId: 2,
    client: "First National Bank",
    projectManager: "Sarah Johnson",
    isActive: true
  },
  {
    id: 7,
    name: "Cloud Infrastructure",
    clientId: 3,
    client: "TechCorp Solutions",
    projectManager: "Michael Chen",
    isActive: true
  },
  {
    id: 8,
    name: "E-commerce Platform",
    clientId: 4,
    client: "StartupXYZ",
    projectManager: "David Rodriguez",
    isActive: true
  },
  {
    id: 9,
    name: "ERP System",
    clientId: 5,
    client: "Global Manufacturing Inc",
    projectManager: "Robert Kim",
    isActive: true
  },
  {
    id: 10,
    name: "HR Portal",
    clientId: 6,
    client: "Kadel Labs",
    projectManager: "Sarah Johnson",
    isActive: true
  }
];

export const mockSubProjects = {
  1: ["Frontend Development", "Backend APIs", "DevOps Setup"],
  2: ["Data Migration", "Infrastructure Setup", "Testing"],
  3: ["Proof of Concept", "Documentation", "Presentation"],
  4: ["Research Phase 1", "Analysis", "Documentation"],
  5: ["UI/UX Design", "Core Banking Module", "Security Implementation"]
};

export const mockHolidays = [
  { date: "2025-01-01", title: "New Year's Day" },
  { date: "2025-01-26", title: "Republic Day" },
  { date: "2025-03-14", title: "Holi" },
  { date: "2025-08-15", title: "Independence Day" },
  { date: "2025-10-02", title: "Gandhi Jayanti" },
  { date: "2025-12-25", title: "Christmas Day" }
];

export const mockCurrentUser = {
  id: 1,
  name: "John Smith",
  email: "john.smith@kadellabs.com",
  role: "employee",
  department: "Development",
  isAdmin: true, // For demo purposes, user has all roles
  isProjectManager: true
};

// Generate current month data
export const getCurrentMonthData = () => {
  const now = new Date();
  return getMonthData(now.getFullYear(), now.getMonth());
};

// Generate month data for any month
export const getMonthData = (year, month) => {
  const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long' });
  const now = new Date(); // For checking if a day is today
  
  // Get first day of month and calculate weeks
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();
  
  const weeks = [];
  let currentWeek = [];
  let weekNumber = 1;
  
  // Start from first day of month
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    currentWeek.push({
      date: day,
      fullDate: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayOfWeek: dayOfWeek,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      isHoliday: mockHolidays.some(h => h.date === `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`),
      isToday: day === now.getDate() && month === now.getMonth() && year === now.getFullYear()
    });
    
    // If it's Saturday or last day of month, complete the week
    if (dayOfWeek === 6 || day === totalDays) {
      weeks.push({
        weekNumber: weekNumber,
        days: [...currentWeek],
        startDate: currentWeek[0].fullDate,
        endDate: currentWeek[currentWeek.length - 1].fullDate,
        totalHours: 0,
        status: 'draft' // draft, submitted, approved, rejected
      });
      currentWeek = [];
      weekNumber++;
    }
  }
  
  return {
    month: monthName,
    year: year,
    weeks: weeks,
    totalDays: totalDays
  };
};

// Mock timesheet entries for current month
export const mockTimesheetEntries = (() => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStr = String(month).padStart(2, '0');
  
  return {
    // Format: "YYYY-MM-DD": { projects: [{ clientId, projectId, hours, taskDescription }], isHoliday, isOnLeave, totalHours }
    [`${year}-${monthStr}-02`]: { 
      projects: [
        { clientId: 6, projectId: 1, hours: 5, taskDescription: "Frontend component development" },
        { clientId: 1, projectId: 2, hours: 3, taskDescription: "Azure migration planning" }
      ],
      isHoliday: false, 
      isOnLeave: false,
      totalHours: 8
    },
    [`${year}-${monthStr}-03`]: { 
      projects: [
        { clientId: 6, projectId: 1, hours: 4, taskDescription: "API integration" },
        { clientId: 1, projectId: 3, hours: 2, taskDescription: "Office 365 setup" },
        { clientId: 1, projectId: 4, hours: 2, taskDescription: "Teams feature development" }
      ],
      isHoliday: false, 
      isOnLeave: false,
      totalHours: 8
    },
    [`${year}-${monthStr}-06`]: { 
      projects: [
        { clientId: 1, projectId: 2, hours: 8, taskDescription: "Full day Azure migration" }
      ],
      isHoliday: false, 
      isOnLeave: false,
      totalHours: 8
    },
    [`${year}-${monthStr}-09`]: { 
      projects: [
        { clientId: null, projectId: 0, hours: 0, taskDescription: "" }
      ],
      isHoliday: false, 
      isOnLeave: true,
      totalHours: 0
    },
    [`${year}-${monthStr}-08`]: { 
      projects: [
        { clientId: null, projectId: 0, hours: 0, taskDescription: "" }
      ],
      isHoliday: true, 
      isOnLeave: false,
      totalHours: 0
    },
    [`${year}-${monthStr}-10`]: { 
      projects: [
        { clientId: null, projectId: 0, hours: 0, taskDescription: "" }
      ],
      isHoliday: false, 
      isOnLeave: true,
      totalHours: 0
    }
  };
})();

export const getHolidayByDate = (date) => {
  return mockHolidays.find(h => h.date === date);
};

// Mock clients data for use across components
export const mockClients = [
  { id: 1, name: 'Microsoft', type: 'enterprise', industry: 'Technology' },
  { id: 2, name: 'First National Bank', type: 'enterprise', industry: 'Financial Services' },
  { id: 3, name: 'TechCorp Solutions', type: 'client', industry: 'Technology Services' },
  { id: 4, name: 'StartupXYZ', type: 'startup', industry: 'E-commerce' },
  { id: 5, name: 'Global Manufacturing Inc', type: 'enterprise', industry: 'Manufacturing' },
  { id: 6, name: 'Kadel Labs', type: 'internal', industry: 'Technology' }
];