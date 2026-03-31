import { useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext, type AuthContextValue } from "@/app/auth-context";
import { getAdminStatus } from "@/services/admin";
import {
  signInWithEmailPassword,
  signInWithGoogle,
  signOutUser,
  subscribeToAuth,
} from "@/services/auth";
import type { UserProfile } from "@/types/user";

const queryClient = new QueryClient();

export function AppProviders({ children }: PropsWithChildren) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((profile) => {
      setUser(profile);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setAdminLoading(false);
      return;
    }

    setAdminLoading(true);
    void getAdminStatus(user.id)
      .then((result) => setIsAdmin(result.isAdmin))
      .finally(() => setAdminLoading(false));
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      adminLoading,
      isAdmin,
      signIn: async (email: string, password: string) => {
        setLoading(true);
        try {
          await signInWithEmailPassword(email, password);
        } finally {
          setLoading(false);
        }
      },
      signInWithGoogle: async (redirectTo?: string) => {
        setLoading(true);
        try {
          await signInWithGoogle(redirectTo);
        } finally {
          setLoading(false);
        }
      },
      signOut: async () => {
        await signOutUser();
        setUser(null);
        setIsAdmin(false);
      },
    }),
    [adminLoading, isAdmin, loading, user],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    </QueryClientProvider>
  );
}
