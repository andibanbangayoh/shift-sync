import { baseApi } from "./baseApi";

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  data: Notification[];
  unreadCount: number;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<
      NotificationsResponse,
      { unreadOnly?: boolean; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: "/notifications",
        params: {
          ...(params.unreadOnly && { unreadOnly: "true" }),
          ...(params.page && { page: params.page }),
          ...(params.limit && { limit: params.limit }),
        },
      }),
      providesTags: ["Notifications"],
    }),
    getUnreadCount: builder.query<{ unreadCount: number }, void>({
      query: () => "/notifications/unread-count",
      providesTags: ["Notifications"],
    }),
    markAsRead: builder.mutation<
      { updated: number },
      { notificationIds: string[] }
    >({
      query: (body) => ({
        url: "/notifications/mark-read",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Notifications"],
    }),
    markAllAsRead: builder.mutation<{ updated: number }, void>({
      query: () => ({
        url: "/notifications/mark-all-read",
        method: "POST",
      }),
      invalidatesTags: ["Notifications"],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
} = notificationApi;
