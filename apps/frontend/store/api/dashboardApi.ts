import { baseApi } from "./baseApi";

export interface DashboardOnDutyItem {
  id: string;
  user: { id: string; firstName: string; lastName: string; email: string };
  shiftId: string;
  location: { id: string; name: string; timezone: string };
  skill: string;
  endTime: string;
}

export interface DashboardOvertimeAlert {
  userId: string;
  firstName: string;
  lastName: string;
  hoursAssigned: number;
  desiredHours: number;
}

export interface DashboardUpcomingShift {
  id: string;
  location: { id: string; name: string; timezone: string };
  skill: string;
  startTime: string;
  endTime: string;
  headcount: number;
  assignedCount: number;
  assignments: Array<{
    id: string;
    user: { id: string; firstName: string; lastName: string };
  }>;
}

export interface DashboardNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardStats {
  onDutyNow: DashboardOnDutyItem[];
  todaysOnDutyCount: number;
  unassignedCount: number;
  overtimeAlerts: DashboardOvertimeAlert[];
  pendingSwaps: number;
  upcomingShifts: DashboardUpcomingShift[];
  recentNotifications: DashboardNotification[];
  unreadNotificationCount: number;
  myHoursThisWeek: number;
}

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardStats: builder.query<DashboardStats, void>({
      query: () => "/dashboard/stats",
      providesTags: ["Dashboard"],
    }),
  }),
});

export const { useGetDashboardStatsQuery } = dashboardApi;
