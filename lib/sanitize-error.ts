/**
 * Error sanitization utilities
 *
 * Prevents leaking sensitive information from database errors
 * to the client while providing useful error messages.
 */

/**
 * Sanitize a database error for client response
 *
 * @param error - Error object from database operation
 * @param context - Context about what operation failed
 * @returns Sanitized error message
 */
export function sanitizeDatabaseError(
  error: unknown,
  context: string,
): string {
  // If it's already a string, just return a generic message
  if (typeof error === 'string') {
    return `Failed to ${context}. Please try again.`;
  }

  // If it's an Error object with message
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Check for specific database error patterns
    if (message.includes('duplicate key') || message.includes('unique constraint')) {
      return `A record with this information already exists.`;
    }

    if (message.includes('foreign key constraint') || message.includes('violates foreign key')) {
      return `Referenced record does not exist.`;
    }

    if (message.includes('not null')) {
      return `Required information is missing.`;
    }

    if (message.includes('check constraint') || message.includes('violates check')) {
      return `Invalid data provided.`;
    }

    if (message.includes('connection') || message.includes('timeout')) {
      return `Service temporarily unavailable. Please try again.`;
    }

    // Generic message for other database errors
    return `Failed to ${context}. Please try again.`;
  }

  // If it has a code property (Supabase/Postgres error)
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String(error.code);

    // Postgres error codes
    if (code === '23505') {
      // Unique violation
      return `A record with this information already exists.`;
    }

    if (code === '23503') {
      // Foreign key violation
      return `Referenced record does not exist.`;
    }

    if (code === '23502') {
      // Not null violation
      return `Required information is missing.`;
    }

    if (code === '23514') {
      // Check violation
      return `Invalid data provided.`;
    }

    if (code === '08001' || code === '08004' || code === '08006') {
      // Connection errors
      return `Service temporarily unavailable. Please try again.`;
    }
  }

  // Fallback for unknown error types
  return `Failed to ${context}. Please try again.`;
}

/**
 * Create a standardized error response
 *
 * @param context - Context about what operation failed
 * @param error - Error object (optional, for logging)
 * @returns NextResponse with sanitized error
 */
export function createErrorResponse(
  context: string,
  error?: unknown,
  status: number = 500,
): Response {
  // Log the actual error server-side for debugging
  if (error) {
    console.error(`Error in ${context}:`, error);
  }

  // Return sanitized message to client
  return new Response(
    JSON.stringify({
      error: sanitizeDatabaseError(error, context),
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

/**
 * Map of common operations to their error messages
 */
export const ErrorContexts = {
  create: 'create record',
  update: 'update record',
  delete: 'delete record',
  fetch: 'fetch record',
  login: 'login',
  logout: 'logout',
  signup: 'create account',
  resetPassword: 'reset password',
  updateProfile: 'update profile',
} as const;
