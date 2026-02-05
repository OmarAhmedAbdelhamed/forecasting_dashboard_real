'use client';

import { ReactNode } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { Spinner } from '@/components/ui/shared/spinner';
import type { DashboardSection, ComponentType, ResourceType, PermissionAction } from '@/types/permissions';
import type { UserRole } from '@/types/auth';

/**
 * ProtectedRoute Component
 *
 * Wrapper for page/section level protection that shows loading state while
 * checking authentication and authorization, and conditionally renders children
 * based on section access.
 *
 * @example
 * ```tsx
 * <ProtectedRoute section="inventory-planning">
 *   <InventoryDashboard />
 * </ProtectedRoute>
 *
 * // With custom fallback
 * <ProtectedRoute
 *   section="alert-center"
 *   fallback={<AccessDenied message="You don't have access to alerts" />}
 * >
 *   <AlertCenter />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({
  section,
  fallback = null,
  children,
}: {
  /** The dashboard section to check access for */
  section: DashboardSection;
  /** What to show if user is not authorized (default: null - renders nothing) */
  fallback?: ReactNode;
  /** Content to render if user has access */
  children: ReactNode;
}) {
  const { isLoading: authLoading } = useAuth();
  const { canViewSection, isLoading: permissionsLoading } = usePermissions();
  const isLoading = authLoading || permissionsLoading;

  // Show loading spinner while checking auth/permissions
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner className="size-8" />
      </div>
    );
  }

  // Check if user has access to the section
  const hasAccess = canViewSection(section);

  // Render fallback if no access
  if (!hasAccess) {
    return <>{fallback}</>;
  }

  // Render children if user has access
  return <>{children}</>;
}

/**
 * PermissionWrapper Component
 *
 * Show content only if user has specific permission for a resource/action.
 * Unlike ProtectedRoute which is for page-level protection, this is for
 * component-level permission checks (e.g., showing a button only to users
 * with edit permissions).
 *
 * @example
 * ```tsx
 * // Check view permission (default)
 * <PermissionWrapper resource="inventory_planning">
 *   <InventoryTable />
 * </PermissionWrapper>
 *
 * // Check edit permission
 * <PermissionWrapper resource="inventory_planning" action="edit">
 *   <EditButton />
 * </PermissionWrapper>
 *
 * // With custom fallback
 * <PermissionWrapper
 *   resource="alert_center"
 *   action="resolve"
 *   fallback={<ReadOnlyAlert />}
 * >
 *   <ResolveAlertButton />
 * </PermissionWrapper>
 *
 * // Component-level check
 * <PermissionWrapper
 *   resource="kpi_metrics"
 *   action="view"
 *   section="overview"
 * >
 *   <RevenueKPI />
 * </PermissionWrapper>
 * ```
 */
export function PermissionWrapper({
  resource,
  action = 'view',
  section,
  fallback = null,
  children,
}: {
  /** The resource or component type to check permission for */
  resource: ResourceType | ComponentType;
  /** The permission action to check (default: 'view') */
  action?: PermissionAction;
  /** Optional section for component-level checks */
  section?: ResourceType;
  /** What to show if user is not authorized (default: null - renders nothing) */
  fallback?: ReactNode;
  /** Content to render if user has permission */
  children: ReactNode;
}) {
  const { hasPermission, isLoading } = usePermissions();

  // Show nothing while loading (no spinner for component-level checks)
  if (isLoading) {
    return null;
  }

  // Check if user has permission
  let hasAccess = false;

  if (section) {
    // Component-level check: use canViewComponent
    // We need to check both section access and component access
    // For now, use hasPermission as a fallback
    hasAccess = hasPermission(resource, action);
  } else {
    // Resource-level check
    hasAccess = hasPermission(resource, action);
  }

  // Render fallback if no permission
  if (!hasAccess) {
    return <>{fallback}</>;
  }

  // Render children if user has permission
  return <>{children}</>;
}

/**
 * RoleWrapper Component
 *
 * Show content only for users with specific roles. Supports checking for
 * a single role or multiple roles (with ANY or ALL logic).
 *
 * @example
 * ```tsx
 * // Single role check
 * <RoleWrapper roles="admin">
 *   <AdminPanel />
 * </RoleWrapper>
 *
 * // Multiple roles - ANY (user must have at least one)
 * <RoleWrapper roles={["admin", "manager"]}>
 *   <ManagementPanel />
 * </RoleWrapper>
 *
 * // Multiple roles - ALL (user must have all - rare but possible)
 * <RoleWrapper roles={["admin", "super_admin"]} requireAll={true}>
 *   <SuperAdminPanel />
 * </RoleWrapper>
 *
 * // With custom fallback
 * <RoleWrapper
 *   roles="finance"
 *   fallback={<div className="text-muted">Finance only</div>}
 * >
 *   <FinancialReports />
 * </RoleWrapper>
 * ```
 */
export function RoleWrapper({
  roles,
  fallback = null,
  requireAll = false,
  children,
}: {
  /** The role(s) to check - single role or array of roles */
  roles: UserRole | UserRole[];
  /** What to show if user is not authorized (default: null - renders nothing) */
  fallback?: ReactNode;
  /** If true, user must have ALL roles; if false (default), user must have ANY of the roles */
  requireAll?: boolean;
  /** Content to render if user has required role(s) */
  children: ReactNode;
}) {
  const { hasRole, hasAnyRole, isLoading } = usePermissions();

  // Show nothing while loading (no spinner for component-level checks)
  if (isLoading) {
    return null;
  }

  // Check if user has required role(s)
  let hasAccess = false;

  if (Array.isArray(roles)) {
    // Multiple roles check
    if (requireAll) {
      // User must have ALL roles (rare but possible)
      // Since hasRole checks if user has a role (can be array),
      // we need to check each role individually
      hasAccess = roles.every((role) => hasRole(role));
    } else {
      // User must have ANY of the roles (default)
      hasAccess = hasAnyRole(roles);
    }
  } else {
    // Single role check
    hasAccess = hasRole(roles);
  }

  // Render fallback if no matching role
  if (!hasAccess) {
    return <>{fallback}</>;
  }

  // Render children if user has required role(s)
  return <>{children}</>;
}
