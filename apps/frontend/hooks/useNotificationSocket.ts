"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAppSelector, useAppDispatch } from "@/store/store";
import { baseApi } from "@/store/api/baseApi";

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
  "http://localhost:8000";

export function useNotificationSocket() {
  const socketRef = useRef<Socket | null>(null);
  const dispatch = useAppDispatch();
  const { accessToken, isAuthenticated } = useAppSelector(
    (state) => state.auth,
  );

  const invalidateNotifications = useCallback(() => {
    dispatch(baseApi.util.invalidateTags(["Notifications"]));
  }, [dispatch]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const socket = io(`${WS_URL}/notifications`, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socket.on("connect", () => {
      // Connected to notification WebSocket
    });

    socket.on("notification", () => {
      // Invalidate RTK Query cache so components refetch
      invalidateNotifications();
    });

    socket.on("disconnect", () => {
      // WebSocket disconnected
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, accessToken, invalidateNotifications]);

  return socketRef;
}
