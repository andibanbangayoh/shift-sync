import { baseApi } from "./baseApi";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ShiftLocation {
  id: string;
  name: string;
  timezone: string;
}

export interface ShiftSkill {
  id: string;
  name: string;
}

export interface ShiftAssignment {
  id: string;
  status: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface Shift {
  id: string;
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
  headcount: number;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED";
  version: number;
  location: ShiftLocation;
  requiredSkill: ShiftSkill;
  createdBy: { id: string; firstName: string; lastName: string };
  assignments: ShiftAssignment[];
}

export interface EligibleStaff {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  skills: ShiftSkill[];
}

export interface CreateShiftPayload {
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
  requiredSkillId: string;
  headcount: number;
  recurrence?: "none" | "daily" | "weekly";
  recurrenceCount?: number;
}

export interface UpdateShiftPayload {
  id: string;
  body: {
    date?: string;
    startTime?: string;
    endTime?: string;
    requiredSkillId?: string;
    headcount?: number;
    status?: "DRAFT" | "PUBLISHED" | "CANCELLED";
    version: number;
  };
}

export interface MoveShiftPayload {
  id: string;
  body: {
    startTime: string;
    endTime: string;
    date: string;
    version: number;
  };
}

// ─── API slice ─────────────────────────────────────────────────────────────────

export const shiftsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listShifts: builder.query<
      Shift[],
      { weekStart: string; weekEnd: string; locationId?: string }
    >({
      query: ({ weekStart, weekEnd, locationId }) => ({
        url: "/shifts",
        params: { weekStart, weekEnd, ...(locationId && { locationId }) },
      }),
      providesTags: ["Shifts"],
    }),

    getLocations: builder.query<ShiftLocation[], void>({
      query: () => "/shifts/locations",
    }),

    getSkills: builder.query<ShiftSkill[], void>({
      query: () => "/shifts/skills",
    }),

    getEligibleStaff: builder.query<
      EligibleStaff[],
      { locationId: string; skillId?: string }
    >({
      query: ({ locationId, skillId }) => ({
        url: "/shifts/eligible-staff",
        params: { locationId, ...(skillId && { skillId }) },
      }),
    }),

    createShift: builder.mutation<Shift, CreateShiftPayload>({
      query: (body) => ({ url: "/shifts", method: "POST", body }),
      invalidatesTags: ["Shifts", "Dashboard"],
    }),

    updateShift: builder.mutation<Shift, UpdateShiftPayload>({
      query: ({ id, body }) => ({
        url: `/shifts/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Shifts", "Dashboard"],
    }),

    moveShift: builder.mutation<Shift, MoveShiftPayload>({
      query: ({ id, body }) => ({
        url: `/shifts/${id}/move`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Shifts", "Dashboard"],
    }),

    assignStaff: builder.mutation<
      ShiftAssignment & { overtimeWarning?: string | null },
      { shiftId: string; userId: string }
    >({
      query: ({ shiftId, userId }) => ({
        url: `/shifts/${shiftId}/assign`,
        method: "POST",
        body: { userId },
      }),
      invalidatesTags: ["Shifts", "Dashboard"],
    }),

    unassignStaff: builder.mutation<
      { success: boolean },
      { shiftId: string; assignmentId: string }
    >({
      query: ({ shiftId, assignmentId }) => ({
        url: `/shifts/${shiftId}/assign/${assignmentId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Shifts", "Dashboard"],
    }),

    deleteShift: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/shifts/${id}`, method: "DELETE" }),
      invalidatesTags: ["Shifts", "Dashboard"],
    }),
  }),
});

export const {
  useListShiftsQuery,
  useGetLocationsQuery,
  useGetSkillsQuery,
  useGetEligibleStaffQuery,
  useCreateShiftMutation,
  useUpdateShiftMutation,
  useMoveShiftMutation,
  useAssignStaffMutation,
  useUnassignStaffMutation,
  useDeleteShiftMutation,
} = shiftsApi;
