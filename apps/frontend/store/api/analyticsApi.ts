import { baseApi } from "./baseApi";

export interface StaffAnalytics {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  desiredWeeklyHours: number;
  totalHours: number;
  avgWeeklyHours: number;
  desiredTotal: number;
  difference: number;
  shiftCount: number;
  premiumShifts: number;
  regularShifts: number;
}

export interface AnalyticsResponse {
  period: { from: string; to: string; weeks: number };
  summary: {
    totalStaff: number;
    avgWeeklyHours: number;
    overScheduledCount: number;
    underScheduledCount: number;
    balancedCount: number;
    totalPremiumShifts: number;
    fairnessScore: number;
  };
  staff: StaffAnalytics[];
}

export interface AnalyticsFilters {
  from?: string;
  to?: string;
  locationId?: string;
}

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAnalytics: builder.query<AnalyticsResponse, AnalyticsFilters>({
      query: (params) => ({
        url: "/dashboard/analytics",
        params,
      }),
      providesTags: ["Analytics"],
    }),
  }),
});

export const { useGetAnalyticsQuery } = analyticsApi;
