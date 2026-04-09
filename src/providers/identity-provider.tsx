"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

const STORAGE_KEY = "sm_anon_id";

interface IdentityContextValue {
  anonId: string | null;
  ready: boolean;
}

const IdentityContext = createContext<IdentityContextValue>({
  anonId: null,
  ready: false,
});

export function useIdentity(): IdentityContextValue {
  return useContext(IdentityContext);
}

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [anonId, setAnonId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const initProfile = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/profiles/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anon_id: id }),
      });
      const data = await res.json();
      return data.success === true;
    } catch {
      // Network error — still allow the app to function offline
      return true;
    }
  }, []);

  useEffect(() => {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    setAnonId(id);

    // Sync with server before marking ready
    initProfile(id).then((ok) => {
      setReady(ok);
    });
  }, [initProfile]);

  return (
    <IdentityContext.Provider value={{ anonId, ready }}>
      {children}
    </IdentityContext.Provider>
  );
}
