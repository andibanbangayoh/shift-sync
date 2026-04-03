"use client";

import { useRef } from "react";
import { Provider } from "react-redux";
import { makeStore, type AppStore } from "./store";
import { hydrateFromStorage } from "./slices/authSlice";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = makeStore();
    // Hydrate auth state from localStorage on store creation (client-side only)
    if (typeof window !== "undefined") {
      storeRef.current.dispatch(hydrateFromStorage());
    }
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
}
