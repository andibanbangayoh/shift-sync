import { baseApi } from "./baseApi";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SwapUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface SwapShift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  location: { id: string; name: string; timezone: string };
  requiredSkill: { id: string; name: string };
}

export interface SwapAssignment {
  id: string;
  shift: SwapShift;
}

export interface SwapRequest {
  id: string;
  type: "SWAP" | "DROP";
  status:
    | "PENDING"
    | "ACCEPTED"
    | "MANAGER_APPROVED"
    | "REJECTED"
    | "CANCELLED"
    | "EXPIRED";
  requestedAt: string;
  respondedAt: string | null;
  resolvedAt: string | null;
  expiresAt: string | null;
  cancellationReason: string | null;
  requestor: SwapUser;
  requestorAssignment: SwapAssignment;
  targetUser: SwapUser | null;
  targetAssignment: SwapAssignment | null;
  resolvedBy: { id: string; firstName: string; lastName: string } | null;
}

export interface SwapStats {
  pending: number;
  accepted: number;
  approved: number;
  rejected: number;
  cancelled: number;
  expired: number;
  needsAction: number;
}

export interface Coworker {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  available: boolean;
  conflictReason: string | null;
}

// ─── API slice ─────────────────────────────────────────────────────────────────

export const swapsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listSwaps: builder.query<SwapRequest[], { status?: string } | void>({
      query: (params) => ({
        url: "/swaps",
        params: params || {},
      }),
      providesTags: ["Swaps"],
    }),

    getSwapStats: builder.query<SwapStats, void>({
      query: () => "/swaps/stats",
      providesTags: ["Swaps"],
    }),

    getCoworkers: builder.query<
      Coworker[],
      { locationId: string; shiftStart: string; shiftEnd: string }
    >({
      query: ({ locationId, shiftStart, shiftEnd }) => ({
        url: "/swaps/coworkers",
        params: { locationId, shiftStart, shiftEnd },
      }),
    }),

    createSwap: builder.mutation<
      SwapRequest,
      {
        requestorAssignmentId: string;
        type: "SWAP" | "DROP";
        targetAssignmentId?: string;
        targetUserId?: string;
      }
    >({
      query: (body) => ({ url: "/swaps", method: "POST", body }),
      invalidatesTags: ["Swaps", "Dashboard", "Shifts"],
    }),

    respondToSwap: builder.mutation<
      SwapRequest,
      { id: string; action: "accept" | "reject" }
    >({
      query: ({ id, action }) => ({
        url: `/swaps/${id}/respond`,
        method: "PATCH",
        body: { action },
      }),
      invalidatesTags: ["Swaps", "Dashboard"],
    }),

    resolveSwap: builder.mutation<
      SwapRequest,
      { id: string; action: "approve" | "reject"; reason?: string }
    >({
      query: ({ id, action, reason }) => ({
        url: `/swaps/${id}/resolve`,
        method: "PATCH",
        body: { action, reason },
      }),
      invalidatesTags: ["Swaps", "Dashboard", "Shifts"],
    }),

    cancelSwap: builder.mutation<SwapRequest, string>({
      query: (id) => ({ url: `/swaps/${id}/cancel`, method: "PATCH" }),
      invalidatesTags: ["Swaps", "Dashboard", "Shifts"],
    }),
  }),
});

export const {
  useListSwapsQuery,
  useGetSwapStatsQuery,
  useGetCoworkersQuery,
  useCreateSwapMutation,
  useRespondToSwapMutation,
  useResolveSwapMutation,
  useCancelSwapMutation,
} = swapsApi;
