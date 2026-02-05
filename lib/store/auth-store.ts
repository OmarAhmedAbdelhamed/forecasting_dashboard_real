import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase/client';
import type { UserProfile, UserRole, Permission, DataScope } from '@/types/auth';
import { ROLE_CONFIGS, type DashboardSection } from '@/types/permissions';

interface AuthState {
  // Existing state
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;

  // New RBAC state
  userProfile: UserProfile | null;
  permissions: Permission[] | null;
  userRole: UserRole | null;
  profileLoading: boolean;
  profileError: Error | null;

  // Existing methods
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setAuth: (user: User) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;

  // New RBAC methods
  fetchUserProfile: (userId: string) => Promise<void>;
  hasPermission: (resource: string, action?: string) => boolean;
  hasSectionAccess: (section: string) => boolean;
  canViewData: (regions?: string[], stores?: string[], categories?: string[]) => boolean;
  filterDataByScope: <T>(data: T[], scopeKey: keyof DataScope) => T[];
  checkRole: (role: UserRole | UserRole[]) => boolean;
  clearProfile: () => void;
  clearProfileError: () => void;
  retryFetchProfile: () => Promise<void>;

  // Alias methods for use-permissions hook compatibility
  canViewSection: (section: string) => boolean;
  canViewComponent: (component: string, section?: string) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
}

/**
 * Zustand store for authentication state management with RBAC.
 *
 * Uses Supabase for authentication without calling any custom API.
 * Persists auth state to localStorage for session persistence across page refreshes.
 * Includes role-based access control (RBAC) functionality.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      isAuthenticated: false,
      loading: true,
      userProfile: null,
      permissions: null,
      userRole: null,
      profileLoading: false,
      profileError: null,

      /**
       * Sign in with email and password using Supabase.
       * On success, the AuthProvider will handle setting the user state.
       */
      login: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        if (!data.session) {
          throw new Error('No session returned from Supabase');
        }

        // Set loading state while AuthProvider fetches user data
        set({ loading: true });
      },

      /**
       * Sign out from Supabase and clear auth state.
       */
      logout: async () => {
        await supabase.auth.signOut();
        set({ user: null, isAuthenticated: false, loading: false });
        get().clearProfile();
      },

      /**
       * Set authenticated user data and fetch profile.
       * Called by AuthProvider when session is established.
       */
      setAuth: (user) => {
        set({ user, isAuthenticated: true, loading: false });
        // Fetch user profile after setting auth
        get().fetchUserProfile(user.id);
      },

      /**
       * Clear auth state (on sign out).
       */
      clearAuth: () => {
        set({ user: null, isAuthenticated: false, loading: false });
        get().clearProfile();
      },

      /**
       * Set loading state (useful for initial session check).
       */
      setLoading: (loading) => set({ loading }),

      /**
       * Fetch user profile with role and scope from database.
       * Queries user_profiles table and joins with roles table.
       *
       * Permissions are NOT fetched from database - they are defined in
       * TypeScript (types/permissions.ts ROLE_CONFIGS) and checked via
       * hasSectionAccess, hasRole, and other methods.
       */
      fetchUserProfile: async (userId: string) => {
        set({ profileLoading: true, profileError: null });

        try {
          // Fetch user profile with role from user_profiles table
          const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select(`
              id,
              full_name,
              role_id,
              allowed_regions,
              allowed_stores,
              allowed_categories,
              created_at,
              updated_at,
              roles (
                id,
                name,
                description,
                level
              )
            `)
            .eq('id', userId)
            .single();

          if (profileError) {
            console.error('[Auth] Error fetching user profile:', profileError);

            // Detect RLS-specific errors
            const isRLSError =
              profileError.code === '42501' ||
              profileError.code === '42P17' ||
              profileError.message?.includes('permission denied') ||
              profileError.message?.includes('RLS') ||
              profileError.message?.includes('infinite recursion');

            const enhancedError = new Error(
              isRLSError
                ? 'Permission denied: Unable to access user profile due to database permission settings.'
                : `Failed to load user profile: ${profileError.message}`
            );
            enhancedError.name = isRLSError ? 'RLSError' : 'ProfileFetchError';

            set({ profileError: enhancedError, profileLoading: false });
            return;
          }

          if (!profileData) {
            console.warn('No user profile found for user:', userId);
            const notFoundError = new Error('User profile not found. Please contact an administrator.');
            notFoundError.name = 'ProfileNotFound';
            set({ profileError: notFoundError, profileLoading: false });
            return;
          }

          // Transform the profile data to match UserProfile interface
          // Supabase returns single relations as objects, not arrays
          type RoleRelation = {
            id: string;
            name: UserRole;
            description: string | null;
            level: number;
          } | null;

          const roleData = profileData.roles as RoleRelation;
          const hasRole = roleData && typeof roleData === 'object' && 'id' in roleData;

          const userProfile: UserProfile = {
            id: profileData.id,
            fullName: profileData.full_name || undefined,
            roleId: profileData.role_id || undefined,
            role: hasRole && roleData
              ? {
                  id: roleData.id,
                  name: roleData.name,
                  description: roleData.description ?? undefined,
                  level: roleData.level,
                }
              : undefined,
            allowedRegions: profileData.allowed_regions,
            allowedStores: profileData.allowed_stores,
            allowedCategories: profileData.allowed_categories,
            dataScope: {
              regions: profileData.allowed_regions || [],
              stores: profileData.allowed_stores || [],
              categories: profileData.allowed_categories || [],
            },
            createdAt: new Date(profileData.created_at),
            updatedAt: new Date(profileData.updated_at),
          };

          // Permissions are now defined in TypeScript ROLE_CONFIGS, not database
          // The permissions array is kept for backwards compatibility but is empty
          const permissions: Permission[] = [];

          // Set state with fetched data
          set({
            userProfile,
            permissions,
            userRole: userProfile.role?.name || null,
            profileLoading: false,
            profileError: null,
          });
        } catch (error) {
          console.error('[Auth] Unexpected error fetching user profile:', error);
          const unexpectedError = new Error(
            `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          unexpectedError.name = 'UnexpectedError';
          set({ profileError: unexpectedError, profileLoading: false });
        }
      },

      /**
       * Check if user has a specific permission.
       * This method now checks ROLE_CONFIGS in TypeScript, not database permissions.
       * For section access, use hasSectionAccess() instead.
       * For role checks, use hasRole() or checkRole() instead.
       *
       * @deprecated Permission checking is now done via ROLE_CONFIGS.
       * Use hasSectionAccess(section) for dashboard sections,
       * or checkRole(role) for role-based checks.
       */
      hasPermission: (resource: string, action?: string) => {
        const { permissions } = get();

        if (!permissions || permissions.length === 0) {
          return false;
        }

        if (action) {
          return permissions.some(
            (p) => p.resource === resource && p.action === action
          );
        }

        return permissions.some((p) => p.resource === resource);
      },

      /**
       * Check if user can access a specific dashboard section.
       * Maps section names (e.g., 'demand-forecasting' to 'demand_forecasting').
       * Returns true for all sections if user has no role (grants default access).
       */
      hasSectionAccess: (section: string) => {
        const { userRole } = get();

        // Grant access to all sections if user has no role (default access)
        // This allows authenticated users to access the dashboard even without a profile role
        if (!userRole) {
          return true;
        }

        const roleConfig = ROLE_CONFIGS[userRole];
        if (!roleConfig) {
          console.warn('[Auth] No role config found for:', userRole);
          return true;
        }

        // Map section name to match format in ROLE_CONFIGS
        // e.g., 'demand-forecasting' is already in the correct format
        return roleConfig.allowedSections.includes(section as DashboardSection);
      },

      /**
       * Check if user can view data based on their scope.
       * Returns true if user has 'all' scope or if data intersects with allowed scope.
       */
      canViewData: (regions?: string[], stores?: string[], categories?: string[]) => {
        const { userProfile } = get();

        if (!userProfile) {
          return false;
        }

        // Check regions
        if (regions && regions.length > 0) {
          if (userProfile.allowedRegions && userProfile.allowedRegions.length > 0) {
            // If user has specific regions, check if any match
            const hasAllRegions = userProfile.allowedRegions.includes('all');
            const hasMatchingRegion = regions.some((r) =>
              userProfile.allowedRegions?.includes(r)
            );
            if (!hasAllRegions && !hasMatchingRegion) {
              return false;
            }
          }
        }

        // Check stores
        if (stores && stores.length > 0) {
          if (userProfile.allowedStores && userProfile.allowedStores.length > 0) {
            // If user has specific stores, check if any match
            const hasAllStores = userProfile.allowedStores.includes('all');
            const hasMatchingStore = stores.some((s) =>
              userProfile.allowedStores?.includes(s)
            );
            if (!hasAllStores && !hasMatchingStore) {
              return false;
            }
          }
        }

        // Check categories
        if (categories && categories.length > 0) {
          if (userProfile.allowedCategories && userProfile.allowedCategories.length > 0) {
            // If user has specific categories, check if any match
            const hasAllCategories = userProfile.allowedCategories.includes('all');
            const hasMatchingCategory = categories.some((c) =>
              userProfile.allowedCategories?.includes(c)
            );
            if (!hasAllCategories && !hasMatchingCategory) {
              return false;
            }
          }
        }

        return true;
      },

      /**
       * Filter array of data objects based on user's scope.
       * scopeKey specifies which field to check (e.g., 'allowedRegions').
       * Returns all data if user has 'all' scope, empty array if no scope defined.
       */
      filterDataByScope: <T extends Record<string, unknown>>(data: T[], scopeKey: keyof DataScope): T[] => {
        const { userProfile } = get();

        if (!userProfile) {
          return [];
        }

        const userScope = userProfile[scopeKey];

        // If user has 'all' in their scope or no scope restriction, return all data
        if (!userScope || userScope.length === 0 || userScope.includes('all')) {
          return data;
        }

        // Filter data based on scope
        // This assumes data objects have a region, store, or category property
        // Adjust the property name based on your data structure
        const scopePropertyMap: Record<keyof DataScope, string> = {
          regions: 'region',
          stores: 'store',
          categories: 'category',
        };

        const propertyToCheck = scopePropertyMap[scopeKey];

        return data.filter((item) => {
          const itemScope = item[propertyToCheck] as string | undefined;
          return itemScope !== undefined && userScope.includes(itemScope);
        });
      },

      /**
       * Check if user has a specific role or any of the provided roles.
       */
      checkRole: (role: UserRole | UserRole[]): boolean => {
        const { userRole } = get();

        if (!userRole) {
          return false;
        }

        if (Array.isArray(role)) {
          return role.includes(userRole);
        }

        return userRole === role;
      },

      /**
       * Clear profile state (called on logout).
       */
      clearProfile: () => {
        set({
          userProfile: null,
          permissions: null,
          userRole: null,
          profileLoading: false,
          profileError: null,
        });
      },

      /**
       * Clear profile error state (allows retry).
       */
      clearProfileError: () => {
        set({ profileError: null });
      },

      /**
       * Retry fetching user profile.
       */
      retryFetchProfile: async () => {
        const { user } = get();
        if (!user) {
          const noUserError = new Error('No authenticated user found');
          noUserError.name = 'NoUserError';
          set({ profileError: noUserError });
          return;
        }
        await get().fetchUserProfile(user.id);
      },

      /**
       * Alias for hasSectionAccess - check if user can view a dashboard section.
       * Provides compatibility with use-permissions hook.
       */
      canViewSection: (section: string) => {
        return get().hasSectionAccess(section);
      },

      /**
       * Check if user can view a specific component.
       * For now, returns true if user has any permissions.
       * Component-level permissions can be enhanced later if needed.
       */
      canViewComponent: (component: string, section?: string) => {
        const { permissions } = get();
        // If user has permissions, they can view components
        // This can be enhanced later to check component-level permissions
        return permissions ? permissions.length > 0 : false;
      },

      /**
       * Alias for checkRole - check if user has a specific role or roles.
       * Provides compatibility with use-permissions hook.
       */
      hasRole: (role: UserRole | UserRole[]) => {
        return get().checkRole(role);
      },

      /**
       * Check if user has any of the specified roles.
       */
      hasAnyRole: (roles: UserRole[]) => {
        const { userRole } = get();
        if (!userRole) {return false;}
        return roles.includes(userRole);
      },
    }),
    {
      name: 'auth-storage',
      // Persist user data, profile, permissions, and role
      // profileError intentionally omitted (transient, should not persist)
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        userProfile: state.userProfile,
        permissions: state.permissions,
        userRole: state.userRole,
        // profileError intentionally omitted (transient)
      }),
    }
  )
);
