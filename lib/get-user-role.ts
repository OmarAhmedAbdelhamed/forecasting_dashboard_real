import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types/auth';
import { ROLE_CONFIGS, type RoleConfig } from '@/types/permissions';

/**
 * Categorized error codes for user role lookup
 */
export type UserRoleErrorCode =
  | 'PROFILE_NOT_FOUND'
  | 'RLS_ERROR'
  | 'DATABASE_ERROR'
  | 'NO_ROLE_ASSIGNED'
  | 'UNKNOWN_ROLE'
  | 'SYSTEM_ERROR';

/**
 * Result structure for user role lookup
 */
export interface UserRoleResult {
  /** The user's role name (e.g., 'super_admin') */
  role: UserRole | null;
  /** Full role configuration from ROLE_CONFIGS */
  roleConfig: RoleConfig | null;
  /** User's profile data including organization and scope */
  profile: {
    id: string;
    organization_id: string | null;
    allowed_regions: string[] | null;
    allowed_stores: string[] | null;
    allowed_categories: string[] | null;
  } | null;
  /** Error message if lookup failed */
  error?: string;
  /** Categorized error code for programmatic handling */
  errorCode?: UserRoleErrorCode;
}

/**
 * Get a user's role and permissions with a single optimized query
 *
 * This replaces the inefficient pattern of:
 * 1. Query user_profiles for role_id
 * 2. Query roles for role name
 *
 * Instead uses a single JOIN query to get all data in one trip.
 *
 * @param userId - The user's ID (from auth.user.id)
 * @returns UserRoleResult with role, config, and profile data
 *
 * @example
 * ```ts
 * const user = await getServerUser();
 * const { role, roleConfig, profile, error } = await getUserRole(user.id);
 *
 * if (error || !role || !roleConfig) {
 *   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
 * }
 *
 * if (!roleConfig.allowedSections.includes('user-management')) {
 *   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
 * }
 * ```
 */
export async function getUserRole(userId: string): Promise<UserRoleResult> {
  try {
    const supabase = await createClient();

    // Single query with JOIN - gets profile and role in one trip
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select(
        `
        id,
        organization_id,
        allowed_regions,
        allowed_stores,
        allowed_categories,
        role:roles(*)
      `,
      )
      .eq('id', userId)
      .single();

    if (error) {
      // Distinguish between expected and unexpected errors
      if (error.code === 'PGRST116') {
        // No rows returned - profile doesn't exist
        return {
          role: null,
          roleConfig: null,
          profile: null,
          error: 'User profile not found',
          errorCode: 'PROFILE_NOT_FOUND',
        };
      }

      if (error.code === '42501' || error.code === '42P17') {
        // RLS error - database permission issue
        console.error('[RBAC] RLS error in getUserRole:', error);
        return {
          role: null,
          roleConfig: null,
          profile: null,
          error: 'Permission error accessing user profile',
          errorCode: 'RLS_ERROR',
        };
      }

      // Other database errors
      console.error('[RBAC] Database error in getUserRole:', error);
      return {
        role: null,
        roleConfig: null,
        profile: null,
        error: 'Failed to load user permissions',
        errorCode: 'DATABASE_ERROR',
      };
    }

    // Profile can be null even without error if row doesn't exist
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!profile) {
      return {
        role: null,
        roleConfig: null,
        profile: null,
        error: 'User profile not found',
        errorCode: 'PROFILE_NOT_FOUND',
      };
    }

    const roleName = profile.role?.name as UserRole | null;

    if (!roleName) {
      return {
        role: null,
        roleConfig: null,
        profile: null,
        error: 'User has no role assigned',
        errorCode: 'NO_ROLE_ASSIGNED',
      };
    }

    const roleConfig = ROLE_CONFIGS[roleName];

    if (!roleConfig) {
      return {
        role: null,
        roleConfig: null,
        profile: null,
        error: `Unknown role: ${roleName}`,
        errorCode: 'UNKNOWN_ROLE',
      };
    }

    return {
      role: roleName,
      roleConfig,
      profile: {
        id: profile.id,
        organization_id: profile.organization_id,
        allowed_regions: profile.allowed_regions,
        allowed_stores: profile.allowed_stores,
        allowed_categories: profile.allowed_categories,
      },
    };
  } catch (unexpectedError) {
    // Catch network errors, JSON parsing errors, etc.
    console.error('[RBAC] Unexpected error in getUserRole:', unexpectedError);
    return {
      role: null,
      roleConfig: null,
      profile: null,
      error: 'System error loading permissions',
      errorCode: 'SYSTEM_ERROR',
    };
  }
}

/**
 * Check if a user has permission to access a specific section
 *
 * @param userId - The user's ID
 * @param section - The section to check access for
 * @returns true if user can access the section
 */
export async function canAccessSection(
  userId: string,
  section: keyof RoleConfig['allowedSections'],
): Promise<boolean> {
  const { roleConfig } = await getUserRole(userId);
  return roleConfig?.allowedSections.includes(section) ?? false;
}

/**
 * Check if a user has a specific role
 *
 * @param userId - The user's ID
 * @param role - The role to check for
 * @returns true if user has the specified role
 */
export async function hasRole(userId: string, role: UserRole): Promise<boolean> {
  const { role: userRole } = await getUserRole(userId);
  return userRole === role;
}

/**
 * Check if a user is a super admin
 *
 * @param userId - The user's ID
 * @returns true if user is super_admin
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  return hasRole(userId, 'super_admin');
}

/**
 * Check if a user can manage users (has user-management section access)
 *
 * @param userId - The user's ID
 * @returns true if user can manage users
 */
export async function canManageUsers(userId: string): Promise<boolean> {
  return canAccessSection(userId, 'user-management');
}
