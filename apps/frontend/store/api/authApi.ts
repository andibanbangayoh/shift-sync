import { baseApi } from "./baseApi";
import type { AuthUser } from "../slices/authSlice";

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

interface UpdateSettingsPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  notifyInApp?: boolean;
  notifyEmail?: boolean;
  desiredWeeklyHours?: number | null;
}

interface AddAvailabilityPayload {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
    }),

    getProfile: builder.query<AuthUser, void>({
      query: () => "/auth/me",
      providesTags: ["Profile"],
    }),

    updateSettings: builder.mutation<AuthUser, UpdateSettingsPayload>({
      query: (body) => ({
        url: "/auth/me",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Profile"],
    }),

    setMyDayAvailability: builder.mutation<
      { id: string; dayOfWeek: number; startTime: string; endTime: string },
      AddAvailabilityPayload
    >({
      query: (body) => ({
        url: "/auth/me/availability",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Profile"],
    }),

    clearMyDayAvailability: builder.mutation<void, number>({
      query: (dayOfWeek) => ({
        url: `/auth/me/availability/${dayOfWeek}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Profile"],
    }),

    addMySkill: builder.mutation<
      { id: string; skillId: string; skill: { id: string; name: string } },
      string
    >({
      query: (skillId) => ({
        url: "/auth/me/skills",
        method: "POST",
        body: { skillId },
      }),
      invalidatesTags: ["Profile"],
    }),

    removeMySkill: builder.mutation<void, string>({
      query: (skillId) => ({
        url: `/auth/me/skills/${skillId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Profile"],
    }),

    logout: builder.mutation<void, { refreshToken: string }>({
      query: (body) => ({
        url: "/auth/logout",
        method: "POST",
        body,
      }),
    }),

    refreshToken: builder.mutation<AuthResponse, { refreshToken: string }>({
      query: (body) => ({
        url: "/auth/refresh",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useGetProfileQuery,
  useUpdateSettingsMutation,
  useSetMyDayAvailabilityMutation,
  useClearMyDayAvailabilityMutation,
  useAddMySkillMutation,
  useRemoveMySkillMutation,
  useLogoutMutation,
  useRefreshTokenMutation,
} = authApi;
