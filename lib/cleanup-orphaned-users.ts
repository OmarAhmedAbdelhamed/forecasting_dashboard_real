/**
 * Cleanup job for orphaned auth users
 *
 * This module provides utilities to detect and clean up auth users that don't have
 * corresponding user_profiles records. This can happen when:
 * - User creation fails at the profile stage after auth user creation
 * - Rollback operations fail after profile creation
 * - Manual database operations leave inconsistent state
 *
 * Run this job periodically via cron or similar scheduler.
 */

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

/**
 * Result from checking for orphaned users
 */
export interface OrphanedUserResult {
  orphanedUserId: string;
  email: string;
  createdAt: string;
}

/**
 * Result from cleanup operation
 */
export interface CleanupResult {
  totalChecked: number;
  orphanedFound: number;
  successfullyDeleted: number;
  failedToDelete: number;
  errors: Array<{ userId: string; email: string; error: string }>;
}

/**
 * Find all auth users that don't have corresponding user_profiles
 *
 * @returns Array of orphaned user information
 *
 * @example
 * ```ts
 * import { findOrphanedAuthUsers } from '@/lib/cleanup-orphaned-users';
 *
 * const orphaned = await findOrphanedAuthUsers();
 * console.log(`Found ${orphaned.length} orphaned users`);
 * ```
 */
export async function findOrphanedAuthUsers(): Promise<OrphanedUserResult[]> {
  const supabase = await createClient();
  const orphanedUsers: OrphanedUserResult[] = [];

  try {
    // Get all auth users via Supabase Admin API
    // Note: This requires service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ACCESS_TOKEN;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[CLEANUP] Missing Supabase configuration');
      return [];
    }

    const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // List all users
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error('[CLEANUP] Failed to list users:', error);
      return [];
    }

    if (!users || users.length === 0) {
      console.log('[CLEANUP] No users found');
      return [];
    }

    console.log(`[CLEANUP] Checking ${users.length} auth users for orphaned records`);

    // Check each user for a corresponding profile
    for (const user of users) {
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (!profile) {
          // No profile found - this is an orphaned auth user
          console.warn('[CLEANUP] Found orphaned auth user:', {
            userId: user.id,
            email: user.email,
            createdAt: user.created_at,
          });

          orphanedUsers.push({
            orphanedUserId: user.id,
            email: user.email || 'unknown',
            createdAt: user.created_at,
          });
        }
      } catch (error) {
        console.error(`[CLEANUP] Error checking user ${user.id}:`, error);
      }
    }

    return orphanedUsers;
  } catch (error) {
    console.error('[CLEANUP] Unexpected error in findOrphanedAuthUsers:', error);
    return [];
  }
}

/**
 * Delete a single auth user by ID
 *
 * @param userId - The auth user ID to delete
 * @returns true if successful, false otherwise
 */
export async function deleteOrphanedUser(userId: string): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ACCESS_TOKEN;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[CLEANUP] Missing Supabase configuration');
    return false;
  }

  const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error(`[CLEANUP] Failed to delete user ${userId}:`, error);
      return false;
    }

    console.log(`[CLEANUP] Successfully deleted orphaned user: ${userId}`);
    return true;
  } catch (error) {
    console.error(`[CLEANUP] Unexpected error deleting user ${userId}:`, error);
    return false;
  }
}

/**
 * Cleanup all orphaned auth users
 *
 * This function:
 * 1. Finds all auth users without profiles
 * 2. Attempts to delete each orphaned user
 * 3. Returns a detailed report of the cleanup operation
 *
 * @returns CleanupResult with statistics and any errors
 *
 * @example
 * ```ts
 * import { cleanupOrphanedAuthUsers } from '@/lib/cleanup-orphaned-users';
 *
 * const result = await cleanupOrphanedAuthUsers();
 * console.log(`Checked ${result.totalChecked} users`);
 * console.log(`Found ${result.orphanedFound} orphaned`);
 * console.log(`Deleted ${result.successfullyDeleted} successfully`);
 * ```
 */
export async function cleanupOrphanedAuthUsers(): Promise<CleanupResult> {
  console.log('[CLEANUP] Starting orphaned auth user cleanup job');

  const orphanedUsers = await findOrphanedAuthUsers();

  const result: CleanupResult = {
    totalChecked: 0, // We don't have a direct count of total users
    orphanedFound: orphanedUsers.length,
    successfullyDeleted: 0,
    failedToDelete: 0,
    errors: [],
  };

  if (orphanedUsers.length === 0) {
    console.log('[CLEANUP] No orphaned users found');
    return result;
  }

  console.log(`[CLEANUP] Found ${orphanedUsers.length} orphaned users, starting cleanup`);

  // Delete each orphaned user
  for (const orphaned of orphanedUsers) {
    const success = await deleteOrphanedUser(orphaned.orphanedUserId);

    if (success) {
      result.successfullyDeleted++;
    } else {
      result.failedToDelete++;
      result.errors.push({
        userId: orphaned.orphanedUserId,
        email: orphaned.email,
        error: 'Failed to delete user',
      });
    }
  }

  // Log summary
  console.log('[CLEANUP] Cleanup job completed:', {
    orphanedFound: result.orphanedFound,
    successfullyDeleted: result.successfullyDeleted,
    failedToDelete: result.failedToDelete,
  });

  return result;
}

/**
 * API route handler for triggering cleanup job
 *
 * This can be called via cron job or webhook.
 * Should be protected with authentication and authorization.
 *
 * @example
 * ```ts
 * // app/api/admin/cleanup-orphaned-users/route.ts
 * import { cleanupOrphanedAuthUsers } from '@/lib/cleanup-orphaned-users';
 * import { NextResponse } from 'next/server';
 *
 * export async function POST() {
 *   const result = await cleanupOrphanedAuthUsers();
 *   return NextResponse.json(result);
 * }
 * ```
 */
export async function handleCleanupRequest(): Promise<{
  success: boolean;
  result?: CleanupResult;
  error?: string;
}> {
  try {
    const result = await cleanupOrphanedAuthUsers();
    return { success: true, result };
  } catch (error) {
    console.error('[CLEANUP] Cleanup job failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
