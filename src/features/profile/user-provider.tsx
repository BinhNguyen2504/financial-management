"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { browserAuth } from "@/lib/supabase/browser";

const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
const UserContext = createContext<{
  user: User | null;
  loading: boolean;
  error: string;
  configured: boolean;
  signingOut: boolean;
  setSigningOut: (value: boolean) => void;
  reload: () => Promise<void>;
  update: (user: User) => void;
}>({
  user: null,
  loading: true,
  error: "",
  configured,
  signingOut: false,
  setSigningOut: () => {},
  reload: async () => {},
  update: () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const reload = useCallback(async () => {
    if (!configured) return;
    setLoading(true);
    setError("");
    try {
      const result = await browserAuth().auth.getUser();
      if (result.error) {
        if (
          result.error.name === "AuthSessionMissingError" ||
          (result.error.name !== "AuthRetryableFetchError" &&
            [400, 401, 403].includes(result.error.status ?? 0))
        ) {
          setUser(null);
          return;
        }
        throw result.error;
      }
      setUser(result.data.user);
    } catch {
      setError("Chưa tải được thông tin cá nhân. Kiểm tra kết nối và thử lại.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!configured) return;
    const {
      data: { subscription },
    } = browserAuth().auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") setUser(null);
      else if (event !== "INITIAL_SESSION" && session) setUser(session.user);
    });
    void reload();
    return () => subscription.unsubscribe();
  }, [reload]);
  return (
    <UserContext.Provider
      value={{ user, loading, error, configured, signingOut, setSigningOut, reload, update: setUser }}
    >
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
