import { createClient } from '@/lib/supabase/server';

/**
 * Audit log entry types for tracking user actions
 */
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'deactivate'
  | 'activate'
  | 'login'
  | 'logout'
  | 'export'
  | 'bulk_update'
  | 'bulk_delete'
  | 'password_reset'
  | 'password_change'
  | 'role_change'
  | 'permission_change';

export type AuditResource =
  | 'user'
  | 'store'
  | 'category'
  | 'product'
  | 'region'
  | 'organization'
  | 'forecast'
  | 'promotion'
  | 'alert'
  | 'settings';

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  user_id: string;
  action: AuditAction;
  resource: AuditResource;
  resource_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  success?: boolean;
  error_message?: string;
}

/**
 * Log an audit entry to the database
 *
 * @param entry - Audit log entry
 * @returns Success status and any error
 *
 * @example
 * ```ts
 * import { logAudit } from '@/lib/audit-log';
 *
 * await logAudit({
 *   user_id: user.id,
 *   action: 'create',
 *   resource: 'store',
 *   resource_id: store.id,
 *   details: { store_name: store.name, region_id: store.region_id },
 * });
 * ```
 */
export async function logAudit(entry: AuditLogEntry): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from('audit_logs').insert({
      user_id: entry.user_id,
      action: entry.action,
      resource: entry.resource,
      resource_id: entry.resource_id || null,
      details: entry.details || {},
      ip_address: entry.ip_address || null,
      user_agent: entry.user_agent || null,
      success: entry.success ?? true,
      error_message: entry.error_message || null,
    });

    if (error) {
      console.error('Failed to log audit entry:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in logAudit:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Log an audit entry to the database safely - NEVER throws
 * Use this for audit logging in critical paths where logging failure should not break the operation
 *
 * This function differs from logAudit() in that:
 * 1. It never throws - all errors are caught and logged only
 * 2. It returns void - you don't need to check the result
 * 3. It logs more detailed error information for debugging
 *
 * @param entry - Audit log entry
 *
 * @example
 * ```ts
 * import { logAuditSafe } from '@/lib/audit-log';
 *
 * // This will never throw, even if audit logging fails
 * logAuditSafe({
 *   user_id: user.id,
 *   action: 'create',
 *   resource: 'store',
 *   resource_id: store.id,
 *   details: { name: store.name },
 * });
 * ```
 */
export async function logAuditSafe(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from('audit_logs').insert({
      user_id: entry.user_id,
      action: entry.action,
      resource: entry.resource,
      resource_id: entry.resource_id || null,
      details: entry.details || {},
      ip_address: entry.ip_address || null,
      user_agent: entry.user_agent || null,
      success: entry.success ?? true,
      error_message: entry.error_message || null,
    });

    if (error) {
      // Log detailed error information for debugging
      console.error('[AUDIT] Failed to log audit entry:', {
        user_id: entry.user_id,
        action: entry.action,
        resource: entry.resource,
        resource_id: entry.resource_id,
        error_code: error.code,
        error_message: error.message,
        error_details: error.details,
        hint: error.hint,
        timestamp: new Date().toISOString(),
      });

      // TODO: Send to external monitoring system (Sentry, etc.)
      // TODO: Consider implementing a dead letter queue for failed audit logs
      return;
    }
  } catch (unexpectedError) {
    // Catch any unexpected errors (network issues, JSON parsing, etc.)
    console.error('[AUDIT] Unexpected error in logAuditSafe:', {
      user_id: entry.user_id,
      action: entry.action,
      resource: entry.resource,
      error: unexpectedError instanceof Error ? unexpectedError.message : String(unexpectedError),
      timestamp: new Date().toISOString(),
    });

    // TODO: Send to external monitoring system
    // Never throw - audit logging failures should not break operations
  }
}

/**
 * Log a successful create operation
 */
export async function logCreate(
  userId: string,
  resource: AuditResource,
  resourceId: string,
  details: Record<string, unknown>,
): Promise<void> {
  await logAudit({
    user_id: userId,
    action: 'create',
    resource,
    resource_id: resourceId,
    details,
    success: true,
  });
}

/**
 * Log a successful update operation
 */
export async function logUpdate(
  userId: string,
  resource: AuditResource,
  resourceId: string,
  details: Record<string, unknown>,
): Promise<void> {
  await logAudit({
    user_id: userId,
    action: 'update',
    resource,
    resource_id: resourceId,
    details,
    success: true,
  });
}

/**
 * Log a successful delete operation
 */
export async function logDelete(
  userId: string,
  resource: AuditResource,
  resourceId: string,
  details?: Record<string, unknown>,
): Promise<void> {
  await logAudit({
    user_id: userId,
    action: 'delete',
    resource,
    resource_id: resourceId,
    details,
    success: true,
  });
}

/**
 * Log a failed operation attempt
 */
export async function logFailure(
  userId: string,
  action: AuditAction,
  resource: AuditResource,
  errorMessage: string,
  details?: Record<string, unknown>,
): Promise<void> {
  await logAudit({
    user_id: userId,
    action,
    resource,
    details,
    success: false,
    error_message: errorMessage,
  });
}

/**
 * Extract IP address from request headers
 *
 * @param request - NextRequest object
 * @returns IP address or undefined
 */
export function extractIPAddress(request: Request): string | undefined {
  // Check various headers for IP address
  const headers = request.headers;
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    undefined
  );
}

/**
 * Extract user agent from request headers
 *
 * @param request - NextRequest object
 * @returns User agent or undefined
 */
export function extractUserAgent(request: Request): string | undefined {
  return request.headers.get('user-agent') || undefined;
}

/**
 * Create audit log helper with request context
 * Automatically extracts IP and user agent from request
 *
 * @param request - NextRequest object
 * @returns Function to log audit entries with context
 *
 * @example
 * ```ts
 * import { auditWith } from '@/lib/audit-log';
 *
 * const audit = auditWith(request);
 *
 * await audit({
 *   user_id: user.id,
 *   action: 'create',
 *   resource: 'store',
 *   resource_id: store.id,
 *   details: { name: store.name },
 * });
 * ```
 */
export function auditWith(request: Request) {
  const ipAddress = extractIPAddress(request);
  const userAgent = extractUserAgent(request);

  return async (entry: Omit<AuditLogEntry, 'ip_address' | 'user_agent'>) => {
    return logAudit({
      ...entry,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  };
}

/**
 * Create a SAFE audit log helper with request context - NEVER throws
 * Use this for critical paths where audit logging failure should not break the operation
 *
 * @param request - NextRequest object
 * @returns Function to log audit entries safely with context
 *
 * @example
 * ```ts
 * import { auditWithSafe } from '@/lib/audit-log';
 *
 * const audit = auditWithSafe(request);
 *
 * // This will never throw, even if audit logging fails
 * await audit({
 *   user_id: user.id,
 *   action: 'create',
 *   resource: 'store',
 *   resource_id: store.id,
 *   details: { name: store.name },
 * });
 * ```
 */
export function auditWithSafe(request: Request) {
  const ipAddress = extractIPAddress(request);
  const userAgent = extractUserAgent(request);

  return async (entry: Omit<AuditLogEntry, 'ip_address' | 'user_agent'>) => {
    await logAuditSafe({
      ...entry,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  };
}

/**
 * Safe version of logCreate - NEVER throws
 */
export async function logCreateSafe(
  userId: string,
  resource: AuditResource,
  resourceId: string,
  details: Record<string, unknown>,
): Promise<void> {
  await logAuditSafe({
    user_id: userId,
    action: 'create',
    resource,
    resource_id: resourceId,
    details,
    success: true,
  });
}

/**
 * Safe version of logUpdate - NEVER throws
 */
export async function logUpdateSafe(
  userId: string,
  resource: AuditResource,
  resourceId: string,
  details: Record<string, unknown>,
): Promise<void> {
  await logAuditSafe({
    user_id: userId,
    action: 'update',
    resource,
    resource_id: resourceId,
    details,
    success: true,
  });
}

/**
 * Safe version of logDelete - NEVER throws
 */
export async function logDeleteSafe(
  userId: string,
  resource: AuditResource,
  resourceId: string,
  details?: Record<string, unknown>,
): Promise<void> {
  await logAuditSafe({
    user_id: userId,
    action: 'delete',
    resource,
    resource_id: resourceId,
    details,
    success: true,
  });
}

/**
 * Safe version of logFailure - NEVER throws
 */
export async function logFailureSafe(
  userId: string,
  action: AuditAction,
  resource: AuditResource,
  errorMessage: string,
  details?: Record<string, unknown>,
): Promise<void> {
  await logAuditSafe({
    user_id: userId,
    action,
    resource,
    details,
    success: false,
    error_message: errorMessage,
  });
}
