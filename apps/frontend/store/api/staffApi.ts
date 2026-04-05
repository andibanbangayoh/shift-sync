import { baseApi } from "./baseApi";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface StaffSkill {
  id: string;
  skillId: string;
  skill: { id: string; name: string };
}

export interface StaffCertification {
  id: string;
  locationId: string;
  certifiedAt: string;
  location: { id: string; name: string };
}

export interface AvailabilitySlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface StaffListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "MANAGER" | "STAFF";
  phone: string | null;
  desiredWeeklyHours: number | null;
  isActive: boolean;
  createdAt: string;
  skills: StaffSkill[];
  certifications: StaffCertification[];
  availabilities: { dayOfWeek: number; startTime: string; endTime: string }[];
}

export interface StaffDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "MANAGER" | "STAFF";
  phone: string | null;
  desiredWeeklyHours: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  managedLocations: {
    id: string;
    locationId: string;
    location: { id: string; name: string; address: string; timezone: string };
  }[];
  skills: StaffSkill[];
  certifications: StaffCertification[];
  availabilities: AvailabilitySlot[];
}

export interface CreateStaffPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "MANAGER" | "STAFF";
  phone?: string;
  desiredWeeklyHours?: number;
}

export interface UpdateStaffPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  desiredWeeklyHours?: number;
  isActive?: boolean;
}

// ── API ────────────────────────────────────────────────────────────────────────

const staffApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listStaff: builder.query<
      StaffListItem[],
      { role?: string; search?: string } | void
    >({
      query: (params) => ({
        url: "/users",
        params: params || {},
      }),
      providesTags: ["Users"],
    }),

    getStaffDetail: builder.query<StaffDetail, string>({
      query: (id) => `/users/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Users", id }],
    }),

    createStaff: builder.mutation<StaffDetail, CreateStaffPayload>({
      query: (body) => ({ url: "/users", method: "POST", body }),
      invalidatesTags: ["Users"],
    }),

    updateStaff: builder.mutation<
      StaffDetail,
      { id: string; body: UpdateStaffPayload }
    >({
      query: ({ id, body }) => ({
        url: `/users/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => ["Users", { type: "Users", id }],
    }),

    // Skills
    addStaffSkill: builder.mutation<
      StaffSkill,
      { userId: string; skillId: string }
    >({
      query: ({ userId, skillId }) => ({
        url: `/users/${userId}/skills`,
        method: "POST",
        body: { skillId },
      }),
      invalidatesTags: (_r, _e, { userId }) => [{ type: "Users", id: userId }],
    }),

    removeStaffSkill: builder.mutation<
      void,
      { userId: string; skillId: string }
    >({
      query: ({ userId, skillId }) => ({
        url: `/users/${userId}/skills/${skillId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { userId }) => [{ type: "Users", id: userId }],
    }),

    // Certifications (locations)
    addStaffCertification: builder.mutation<
      StaffCertification,
      { userId: string; locationId: string }
    >({
      query: ({ userId, locationId }) => ({
        url: `/users/${userId}/certifications`,
        method: "POST",
        body: { locationId },
      }),
      invalidatesTags: (_r, _e, { userId }) => [
        { type: "Users", id: userId },
        "Users",
      ],
    }),

    removeStaffCertification: builder.mutation<
      void,
      { userId: string; locationId: string }
    >({
      query: ({ userId, locationId }) => ({
        url: `/users/${userId}/certifications/${locationId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { userId }) => [
        { type: "Users", id: userId },
        "Users",
      ],
    }),

    // Availability
    setStaffDayAvailability: builder.mutation<
      AvailabilitySlot,
      {
        userId: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
      }
    >({
      query: ({ userId, ...body }) => ({
        url: `/users/${userId}/availability`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { userId }) => [{ type: "Users", id: userId }],
    }),

    clearStaffDayAvailability: builder.mutation<
      void,
      { userId: string; dayOfWeek: number }
    >({
      query: ({ userId, dayOfWeek }) => ({
        url: `/users/${userId}/availability/${dayOfWeek}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { userId }) => [{ type: "Users", id: userId }],
    }),
  }),
});

export const {
  useListStaffQuery,
  useGetStaffDetailQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useAddStaffSkillMutation,
  useRemoveStaffSkillMutation,
  useAddStaffCertificationMutation,
  useRemoveStaffCertificationMutation,
  useSetStaffDayAvailabilityMutation,
  useClearStaffDayAvailabilityMutation,
} = staffApi;
