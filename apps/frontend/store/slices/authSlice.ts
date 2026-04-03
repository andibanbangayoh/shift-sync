import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface AuthUser {
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
  managedLocations?: Array<{
    id: string;
    location: {
      id: string;
      name: string;
      address: string;
      timezone: string;
      isActive: boolean;
    };
  }>;
  skills?: Array<{
    id: string;
    skill: { id: string; name: string };
  }>;
  certifications?: Array<{
    id: string;
    location: {
      id: string;
      name: string;
      address: string;
      timezone: string;
      isActive: boolean;
    };
    certifiedAt: string;
  }>;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
}

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isHydrated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        accessToken: string;
        refreshToken: string;
        user: AuthUser;
      }>,
    ) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
      state.isAuthenticated = true;

      if (typeof window !== "undefined") {
        localStorage.setItem("accessToken", action.payload.accessToken);
        localStorage.setItem("refreshToken", action.payload.refreshToken);
        localStorage.setItem("user", JSON.stringify(action.payload.user));
        document.cookie = `accessToken=${action.payload.accessToken}; path=/; max-age=900; SameSite=Lax`;
      }
    },

    clearCredentials: (state) => {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.isAuthenticated = false;

      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        document.cookie = "accessToken=; path=/; max-age=0; SameSite=Lax";
      }
    },

    updateUser: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(action.payload));
      }
    },

    hydrateFromStorage: (state) => {
      if (typeof window !== "undefined") {
        const accessToken = localStorage.getItem("accessToken");
        const refreshToken = localStorage.getItem("refreshToken");
        const userStr = localStorage.getItem("user");

        if (accessToken && refreshToken && userStr) {
          try {
            state.accessToken = accessToken;
            state.refreshToken = refreshToken;
            state.user = JSON.parse(userStr);
            state.isAuthenticated = true;
          } catch {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("user");
          }
        }
      }
      state.isHydrated = true;
    },
  },
});

export const {
  setCredentials,
  clearCredentials,
  updateUser,
  hydrateFromStorage,
} = authSlice.actions;

export default authSlice.reducer;
