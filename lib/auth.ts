import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

/**
 * Categorized authentication error types
 */
export type AuthErrorType =
  | 'not_authenticated'
  | 'invalid_token'
  | 'database'
  | 'network'
  | 'unknown';

/**
 * Result from getServerUserWithResult with error categorization
 */
export interface ServerUserResult {
  user: User | null;
  error?: AuthErrorType;
}

/**
 * Get the current authenticated user from the server session
 * This function should be used in API routes and Server Components
 *
 * @returns The authenticated user or null if not authenticated
 */
export async function getServerUser(): Promise<User | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Get the current authenticated user with error categorization
 * Use this when you need to distinguish between different error types
 *
 * @returns ServerUserResult with user and optional error type
 *
 * @example
 * ```ts
 * const result = await getServerUserWithResult();
 * if (!result.user) {
 *   if (result.error === 'network') {
 *     return NextResponse.json(
 *       { error: 'Service temporarily unavailable' },
 *       { status: 503 }
 *     );
 *   }
 *   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 * }
 * ```
 */
export async function getServerUserWithResult(): Promise<ServerUserResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      // Categorize error type for better error handling
      if (error.message.includes('connection') || error.message.includes('timeout')) {
        return { user: null, error: 'network' };
      }
      if (error.status === 401 || error.message.includes('JWT') || error.message.includes('token')) {
        return { user: null, error: 'invalid_token' };
      }
      // Other database/auth errors
      return { user: null, error: 'database' };
    }

    if (!user) {
      return { user: null, error: 'not_authenticated' };
    }

    return { user };
  } catch (error) {
    // Catch unexpected errors (network issues, JSON parsing, etc.)
    console.error('[AUTH] Unexpected error in getServerUserWithResult:', error);
    return { user: null, error: 'unknown' };
  }
}
