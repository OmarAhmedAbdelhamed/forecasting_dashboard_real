'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/auth-store';
import type { UserProfile, Permission, UserRole } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  permissions: Permission[] | null;
  userRole: UserRole | null;
  isLoading: boolean;
  profileLoading: boolean;
  profileError: Error | null;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearProfileError: () => void;
  retryFetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider Component
 *
 * Listens to Supabase auth state changes and syncs with Zustand store.
 * Handles:
 * - SIGNED_IN: User logged in
 * - SIGNED_OUT: User logged out
 * - TOKEN_REFRESHED: Session token refreshed
 * - INITIAL_SESSION: Initial session check on app load
 *
 * No custom API calls - uses Supabase user directly.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setLoading = useAuthStore((state) => state.setLoading);

  // Listen to Supabase auth state changes
  useEffect(() => {
    // Check active session immediately on mount
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          console.log(
            '[AuthProvider] Valid session found:',
            session.user.email,
          );
          setAuth(session.user);
        } else {
          console.log('[AuthProvider] No valid session found');
          clearAuth();
        }
      } catch (error) {
        console.error('[AuthProvider] Session check failed:', error);
        clearAuth();
      }
    };

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearAuth();
        return;
      }

      if (
        (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') &&
        session?.user
      ) {
        // Use Supabase user directly - no API call needed
        setAuth(session.user);
        return;
      }

      if (event === 'INITIAL_SESSION') {
        if (session?.user) {
          setLoading(false);

          const currentUser = useAuthStore.getState().user;
          if (!currentUser) {
            // First load - set user from Supabase session
            setAuth(session.user);
          }
        } else {
          clearAuth();
        }
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [setAuth, clearAuth, setLoading]);

  return (
    <AuthContext.Provider
      value={{
        user: useAuthStore((state) => state.user),
        userProfile: useAuthStore((state) => state.userProfile),
        permissions: useAuthStore((state) => state.permissions),
        userRole: useAuthStore((state) => state.userRole),
        isLoading: useAuthStore(
          (state) => state.loading || state.profileLoading,
        ),
        profileLoading: useAuthStore((state) => state.profileLoading),
        profileError: useAuthStore((state) => state.profileError),
        login: async (email: string, password: string) => {
          try {
            await useAuthStore.getState().login(email, password);
            return { success: true };
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Authentication failed';
            return { success: false, error: message };
          }
        },
        logout: async () => {
          await useAuthStore.getState().logout();
        },
        clearProfileError: () => {
          useAuthStore.getState().clearProfileError();
        },
        retryFetchProfile: async () => {
          await useAuthStore.getState().retryFetchProfile();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context.
 * Must be used within an AuthProvider.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
