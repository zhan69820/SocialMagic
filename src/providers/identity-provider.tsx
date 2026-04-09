"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

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

  useEffect(() => {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    setAnonId(id);
    setReady(true);
  }, []);

  return (
    <IdentityContext.Provider value={{ anonId, ready }}>
      {children}
    </IdentityContext.Provider>
  );
}
