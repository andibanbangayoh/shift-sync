// Mock data for ShiftSync application

export type Location = {
  id: string;
  name: string;
  timezone: string;
};

export type Skill = {
  id: string;
  name: string;
  color: string;
};

export type Staff = {
  id: string;
  name: string;
  email: string;
  skills: string[];
  availability: string[];
  hoursAssigned: number;
  hoursDesired: number;
  locationId: string;
  avatar?: string;
};

export type Shift = {
  id: string;
  locationId: string;
  staffId: string | null;
  skillRequired: string;
  startTime: Date;
  endTime: Date;
  headcount: number;
  status: 'assigned' | 'unassigned' | 'conflict';
  conflictReason?: string;
  isPremium?: boolean;
};

export type SwapRequest = {
  id: string;
  fromStaffId: string;
  toStaffId: string | null;
  shiftId: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  requestedAt: Date;
  reason: string;
  type: 'swap' | 'drop';
};

export type Notification = {
  id: string;
  type: 'shift_assigned' | 'swap_request' | 'conflict' | 'overtime_alert' | 'approval_needed';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
};

// Mock locations
export const locations: Location[] = [
  { id: 'loc-1', name: 'Downtown Branch', timezone: 'America/New_York' },
  { id: 'loc-2', name: 'Westside Mall', timezone: 'America/New_York' },
  { id: 'loc-3', name: 'Harbor View', timezone: 'America/Los_Angeles' },
  { id: 'loc-4', name: 'Airport Plaza', timezone: 'America/Chicago' },
];

// Mock skills with colors
export const skills: Skill[] = [
  { id: 'skill-1', name: 'Cashier', color: '#3b82f6' },
  { id: 'skill-2', name: 'Cook', color: '#ef4444' },
  { id: 'skill-3', name: 'Server', color: '#8b5cf6' },
  { id: 'skill-4', name: 'Manager', color: '#f59e0b' },
  { id: 'skill-5', name: 'Barista', color: '#10b981' },
  { id: 'skill-6', name: 'Host', color: '#ec4899' },
];

// Mock staff
export const staff: Staff[] = [
  {
    id: 'staff-1',
    name: 'Sarah Chen',
    email: 'sarah.chen@shiftsync.com',
    skills: ['skill-1', 'skill-3'],
    availability: ['mon', 'tue', 'wed', 'thu'],
    hoursAssigned: 32,
    hoursDesired: 40,
    locationId: 'loc-1',
  },
  {
    id: 'staff-2',
    name: 'Michael Rodriguez',
    email: 'michael.r@shiftsync.com',
    skills: ['skill-2', 'skill-4'],
    availability: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
    hoursAssigned: 45,
    hoursDesired: 40,
    locationId: 'loc-1',
  },
  {
    id: 'staff-3',
    name: 'Emily Johnson',
    email: 'emily.j@shiftsync.com',
    skills: ['skill-1', 'skill-5'],
    availability: ['wed', 'thu', 'fri', 'sat', 'sun'],
    hoursAssigned: 28,
    hoursDesired: 30,
    locationId: 'loc-1',
  },
  {
    id: 'staff-4',
    name: 'David Kim',
    email: 'david.kim@shiftsync.com',
    skills: ['skill-3', 'skill-6'],
    availability: ['mon', 'tue', 'fri', 'sat', 'sun'],
    hoursAssigned: 38,
    hoursDesired: 35,
    locationId: 'loc-2',
  },
  {
    id: 'staff-5',
    name: 'Lisa Martinez',
    email: 'lisa.m@shiftsync.com',
    skills: ['skill-2', 'skill-3'],
    availability: ['mon', 'tue', 'wed', 'thu', 'fri'],
    hoursAssigned: 25,
    hoursDesired: 40,
    locationId: 'loc-2',
  },
  {
    id: 'staff-6',
    name: 'James Wilson',
    email: 'james.w@shiftsync.com',
    skills: ['skill-1', 'skill-4'],
    availability: ['thu', 'fri', 'sat', 'sun'],
    hoursAssigned: 40,
    hoursDesired: 40,
    locationId: 'loc-1',
  },
  {
    id: 'staff-7',
    name: 'Rachel Green',
    email: 'rachel.g@shiftsync.com',
    skills: ['skill-5', 'skill-6'],
    availability: ['mon', 'wed', 'fri', 'sun'],
    hoursAssigned: 22,
    hoursDesired: 25,
    locationId: 'loc-3',
  },
  {
    id: 'staff-8',
    name: 'Marcus Thompson',
    email: 'marcus.t@shiftsync.com',
    skills: ['skill-2', 'skill-4'],
    availability: ['tue', 'wed', 'thu', 'fri', 'sat'],
    hoursAssigned: 42,
    hoursDesired: 40,
    locationId: 'loc-1',
  },
];

// Mock shifts for the current week
const now = new Date();
const getWeekStart = () => {
  const d = new Date(now);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  return new Date(d.setDate(diff));
};

const weekStart = getWeekStart();

export const shifts: Shift[] = [
  // Monday
  {
    id: 'shift-1',
    locationId: 'loc-1',
    staffId: 'staff-1',
    skillRequired: 'skill-1',
    startTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(), 9, 0),
    endTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(), 17, 0),
    headcount: 1,
    status: 'assigned',
  },
  {
    id: 'shift-2',
    locationId: 'loc-1',
    staffId: 'staff-2',
    skillRequired: 'skill-2',
    startTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(), 10, 0),
    endTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(), 18, 0),
    headcount: 1,
    status: 'assigned',
  },
  {
    id: 'shift-3',
    locationId: 'loc-1',
    staffId: 'staff-6',
    skillRequired: 'skill-4',
    startTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(), 8, 0),
    endTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(), 16, 0),
    headcount: 1,
    status: 'assigned',
    isPremium: true,
  },
  // Tuesday
  {
    id: 'shift-4',
    locationId: 'loc-1',
    staffId: 'staff-1',
    skillRequired: 'skill-3',
    startTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 1, 9, 0),
    endTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 1, 17, 0),
    headcount: 1,
    status: 'assigned',
  },
  {
    id: 'shift-5',
    locationId: 'loc-1',
    staffId: 'staff-2',
    skillRequired: 'skill-2',
    startTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 1, 10, 0),
    endTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 1, 22, 0),
    headcount: 1,
    status: 'conflict',
    conflictReason: 'Exceeds daily maximum hours (11 hours)',
  },
  {
    id: 'shift-6',
    locationId: 'loc-2',
    staffId: null,
    skillRequired: 'skill-1',
    startTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 1, 14, 0),
    endTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 1, 22, 0),
    headcount: 2,
    status: 'unassigned',
  },
  // Wednesday
  {
    id: 'shift-7',
    locationId: 'loc-1',
    staffId: 'staff-3',
    skillRequired: 'skill-5',
    startTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 2, 7, 0),
    endTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 2, 15, 0),
    headcount: 1,
    status: 'assigned',
  },
  {
    id: 'shift-8',
    locationId: 'loc-1',
    staffId: 'staff-8',
    skillRequired: 'skill-4',
    startTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 2, 12, 0),
    endTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 2, 20, 0),
    headcount: 1,
    status: 'assigned',
    isPremium: true,
  },
  // Thursday
  {
    id: 'shift-9',
    locationId: 'loc-1',
    staffId: 'staff-1',
    skillRequired: 'skill-1',
    startTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 3, 9, 0),
    endTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 3, 17, 0),
    headcount: 1,
    status: 'assigned',
  },
  {
    id: 'shift-10',
    locationId: 'loc-1',
    staffId: 'staff-2',
    skillRequired: 'skill-2',
    startTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 3, 11, 0),
    endTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 3, 19, 0),
    headcount: 1,
    status: 'assigned',
  },
  // Friday
  {
    id: 'shift-11',
    locationId: 'loc-1',
    staffId: 'staff-3',
    skillRequired: 'skill-1',
    startTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 4, 16, 0),
    endTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 5, 0, 0),
    headcount: 1,
    status: 'assigned',
    isPremium: true,
  },
  {
    id: 'shift-12',
    locationId: 'loc-1',
    staffId: null,
    skillRequired: 'skill-3',
    startTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 4, 18, 0),
    endTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 5, 2, 0),
    headcount: 2,
    status: 'unassigned',
  },
  // Saturday
  {
    id: 'shift-13',
    locationId: 'loc-1',
    staffId: 'staff-6',
    skillRequired: 'skill-4',
    startTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 5, 10, 0),
    endTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 5, 18, 0),
    headcount: 1,
    status: 'assigned',
  },
  {
    id: 'shift-14',
    locationId: 'loc-2',
    staffId: 'staff-4',
    skillRequired: 'skill-3',
    startTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 5, 12, 0),
    endTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 5, 20, 0),
    headcount: 1,
    status: 'assigned',
  },
  // Sunday
  {
    id: 'shift-15',
    locationId: 'loc-1',
    staffId: null,
    skillRequired: 'skill-2',
    startTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6, 10, 0),
    endTime: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6, 18, 0),
    headcount: 1,
    status: 'unassigned',
  },
];

// Mock swap requests
export const swapRequests: SwapRequest[] = [
  {
    id: 'swap-1',
    fromStaffId: 'staff-1',
    toStaffId: 'staff-3',
    shiftId: 'shift-4',
    status: 'pending',
    requestedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    reason: 'Doctor appointment',
    type: 'swap',
  },
  {
    id: 'swap-2',
    fromStaffId: 'staff-2',
    toStaffId: null,
    shiftId: 'shift-5',
    status: 'pending',
    requestedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
    reason: 'Family emergency',
    type: 'drop',
  },
  {
    id: 'swap-3',
    fromStaffId: 'staff-6',
    toStaffId: 'staff-8',
    shiftId: 'shift-3',
    status: 'approved',
    requestedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    reason: 'Schedule conflict',
    type: 'swap',
  },
  {
    id: 'swap-4',
    fromStaffId: 'staff-3',
    toStaffId: 'staff-7',
    shiftId: 'shift-11',
    status: 'expired',
    requestedAt: new Date(now.getTime() - 72 * 60 * 60 * 1000),
    reason: 'Requested time off',
    type: 'swap',
  },
];

// Mock notifications
export const notifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'approval_needed',
    title: 'New swap request',
    message: 'Sarah Chen requested to swap Tuesday shift with Emily Johnson',
    timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    read: false,
    actionUrl: '/swaps',
  },
  {
    id: 'notif-2',
    type: 'conflict',
    title: 'Schedule conflict detected',
    message: 'Michael Rodriguez assigned shift exceeds daily max hours',
    timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    read: false,
    actionUrl: '/scheduler',
  },
  {
    id: 'notif-3',
    type: 'overtime_alert',
    title: 'Overtime alert',
    message: 'Marcus Thompson approaching 45 hours this week',
    timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000),
    read: false,
    actionUrl: '/analytics',
  },
  {
    id: 'notif-4',
    type: 'shift_assigned',
    title: 'Shift published',
    message: 'Week of April 7 schedule has been published to all staff',
    timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    read: true,
  },
  {
    id: 'notif-5',
    type: 'approval_needed',
    title: 'Drop request pending',
    message: 'Michael Rodriguez requested to drop Tuesday evening shift',
    timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000),
    read: false,
    actionUrl: '/swaps',
  },
];

// Helper functions
export function getStaffById(id: string): Staff | undefined {
  return staff.find((s) => s.id === id);
}

export function getSkillById(id: string): Skill | undefined {
  return skills.find((s) => s.id === id);
}

export function getLocationById(id: string): Location | undefined {
  return locations.find((l) => l.id === id);
}

export function getShiftsByLocation(locationId: string): Shift[] {
  return shifts.filter((s) => s.locationId === locationId);
}

export function getStaffByLocation(locationId: string): Staff[] {
  return staff.filter((s) => s.locationId === locationId);
}
