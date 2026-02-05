import { useMemo } from 'react';
import { useAuth } from './use-auth';
import { useAuthStore } from '@/lib/store/auth-store';
import type {
  DashboardSection,
  ComponentType,
  ResourceType,
  PermissionAction,
  RoleConfig,
  DataScope,
  FilterConfig,
  FilterType,
} from '@/types/permissions';
import type { UserRole, Permission, UserProfile } from '@/types/auth';
import { ROLE_CONFIGS } from '@/types/permissions';

/**
 * Main permissions hook that provides comprehensive access control functionality.
 * Returns user role information, permissions, and helper methods for checking access.
 *
 * @returns {Object} Permissions object with user data, access control methods, and computed properties
 */
export function usePermissions() {
  const { user, userRole, permissions, userProfile, isLoading: authLoading, profileError } = useAuth();
  const { canViewSection, canViewComponent, hasPermission, hasRole, hasAnyRole } = useAuthStore();

  // Get role configuration based on user's role
  const roleConfig = useMemo((): RoleConfig | undefined => {
    if (!userRole) {return undefined;}
    return ROLE_CONFIGS[userRole];
  }, [userRole]);

  // Check if user can view a specific dashboard section
  const checkCanViewSection = useMemo(
    () => (section: DashboardSection): boolean => {
      if (authLoading) {return false;}
      return canViewSection(section);
    },
    [canViewSection, authLoading]
  );

  // Check if user can view a specific component
  const checkCanViewComponent = useMemo(
    () => (component: ComponentType, section?: ResourceType): boolean => {
      if (authLoading) {return false;}
      return canViewComponent(component, section);
    },
    [canViewComponent, authLoading]
  );

  // Check if user has a specific permission
  const checkHasPermission = useMemo(
    () => (resource: string, action?: string): boolean => {
      if (authLoading) {return false;}
      return hasPermission(resource as ResourceType, action as PermissionAction);
    },
    [hasPermission, authLoading]
  );

  // Check if user has a specific role
  const checkHasRole = useMemo(
    () => (role: UserRole | UserRole[]): boolean => {
      if (authLoading) {return false;}
      return hasRole(role);
    },
    [hasRole, authLoading]
  );

  // Check if user has any of the specified roles
  const checkHasAnyRole = useMemo(
    () => (roles: UserRole[]): boolean => {
      if (authLoading) {return false;}
      return hasAnyRole(roles);
    },
    [hasAnyRole, authLoading]
  );

  // Computed array of allowed sections for the current user
  const allowedSections = useMemo((): DashboardSection[] => {
    if (authLoading || !userRole) {return [];}

    const sections: DashboardSection[] = [
      'overview',
      'demand-forecasting',
      'inventory-planning',
      'pricing-promotion',
      'seasonal-planning',
      'alert-center',
      'user-management',
    ];

    return sections.filter((section) => canViewSection(section));
  }, [canViewSection, authLoading, userRole]);

  // Computed object mapping sections to allowed components
  const allowedComponents = useMemo(() => {
    if (authLoading || !userRole) {
      return {};
    }

    const componentMap: Record<string, ComponentType[]> = {};

    // Map sections to their possible components
    const sectionComponents: Record<DashboardSection, ComponentType[]> = {
      overview: ['kpi_metrics', 'revenue_charts'],
      'demand-forecasting': ['forecast_charts', 'tables'],
      'inventory-planning': ['inventory_charts', 'tables'],
      'pricing-promotion': ['promotion_data', 'tables'],
      'seasonal-planning': [],
      'alert-center': ['alerts'],
      'user-management': [],
    };

    allowedSections.forEach((section) => {
      componentMap[section] = sectionComponents[section].filter((component) =>
        canViewComponent(component)
      );
    });

    return componentMap;
  }, [allowedSections, canViewComponent, authLoading, userRole]);

  // Computed data scope for the current user
  const dataScope = useMemo((): DataScope => {
    if (!userProfile || authLoading) {
      return {
        regions: [],
        stores: [],
        categories: [],
      };
    }

    return {
      regions: userProfile.dataScope?.regions || [],
      stores: userProfile.dataScope?.stores || [],
      categories: userProfile.dataScope?.categories || [],
    };
  }, [userProfile, authLoading]);

  // Check if user's data scope is restricted
  const isScopeRestricted = useMemo((): boolean => {
    if (authLoading || !userProfile) {return false;}

    const scope = userProfile.dataScope;
    return (
      !!scope &&
      ((scope.regions?.length ?? 0) > 0 ||
        (scope.stores?.length ?? 0) > 0 ||
        (scope.categories?.length ?? 0) > 0)
    );
  }, [userProfile, authLoading]);

  // Filter data array based on user's scope
  const filterDataByScope = useMemo(
    () => <T,>(data: T[], scopeField: 'region' | 'store' | 'category'): T[] => {
      if (authLoading || !userProfile) {return [];}

      const scope = userProfile.dataScope;
      if (!scope) {return data;}

      let allowedValues: string[] = [];

      switch (scopeField) {
        case 'region':
          allowedValues = scope.regions || [];
          break;
        case 'store':
          allowedValues = scope.stores || [];
          break;
        case 'category':
          allowedValues = scope.categories || [];
          break;
      }

      // If no restrictions on this field, return all data
      if (allowedValues.length === 0) {return data;}

      // Filter data based on scope
      return data.filter((item) => {
        const itemValue = (item as Record<string, unknown>)[scopeField] as string;
        return itemValue !== undefined && allowedValues.includes(itemValue);
      });
    },
    [userProfile, authLoading]
  );

  // Get filter permissions for the current user's role
  const filterPermissions = useMemo((): FilterConfig | undefined => {
    if (authLoading || !userRole) {
      return undefined;
    }
    return roleConfig?.filterPermissions;
  }, [roleConfig, userRole, authLoading]);

  // Check if a specific filter is allowed for the user's role
  const canUseFilter = useMemo(
    () => (filterType: FilterType): boolean => {
      if (authLoading || !userRole) {
        return false;
      }
      const permissions = roleConfig?.filterPermissions;
      if (!permissions) {
        // If no filter permissions defined, allow all filters
        return true;
      }
      return permissions.allowedFilters.includes(filterType);
    },
    [roleConfig, userRole, authLoading]
  );

  // Get allowed filters for the user's role
  const getAllowedFilters = useMemo((): FilterType[] => {
    if (authLoading || !userRole) {
      return [];
    }
    return roleConfig?.filterPermissions?.allowedFilters || [];
  }, [roleConfig, userRole, authLoading]);

  return {
    // User data
    userRole,
    roleConfig,
    permissions,
    userProfile,

    // Loading state
    isLoading: authLoading,
    profileError,

    // Access control methods
    canViewSection: checkCanViewSection,
    canViewComponent: checkCanViewComponent,
    hasPermission: checkHasPermission,
    hasRole: checkHasRole,
    hasAnyRole: checkHasAnyRole,

    // Computed properties
    allowedSections,
    allowedComponents,
    dataScope,
    isScopeRestricted,
    filterDataByScope,

    // Filter permissions
    filterPermissions,
    canUseFilter,
    getAllowedFilters,
  };
}

/**
 * Simple hook to check if user can access a specific resource with optional action.
 * Useful for quick access checks in components.
 *
 * @param {ResourceType} resource - The resource to check access for
 * @param {PermissionAction} [action] - Optional action to check (default: 'view')
 * @returns {Object} Access check result
 *
 * @example
 * const { canAccess, isLoading } = useCanAccess('inventory', 'edit');
 * if (canAccess) { ... }
 */
export function useCanAccess(resource: ResourceType, action: PermissionAction = 'view') {
  const { hasPermission, isLoading } = usePermissions();

  const canAccess = useMemo(() => {
    if (isLoading) {return false;}
    return hasPermission(resource, action);
  }, [hasPermission, resource, action, isLoading]);

  return {
    canAccess,
    isLoading,
  };
}

/**
 * Hook to check if user can access a specific dashboard section
 * and what components are allowed within that section.
 *
 * @param {DashboardSection} section - The section to check access for
 * @returns {Object} Section access information
 *
 * @example
 * const { hasAccess, allowedComponents, isLoading } = useSectionAccess('inventory');
 * if (!hasAccess) return <AccessDenied />;
 * return <InventorySection allowedComponents={allowedComponents} />;
 */
export function useSectionAccess(section: DashboardSection) {
  const { canViewSection, allowedComponents, isLoading } = usePermissions();

  const hasAccess = useMemo(() => {
    if (isLoading) {return false;}
    return canViewSection(section);
  }, [canViewSection, section, isLoading]);

  const sectionComponents = useMemo(() => {
    if (isLoading) {return [];}
    return allowedComponents[section] || [];
  }, [allowedComponents, section, isLoading]);

  return {
    hasAccess,
    allowedComponents: sectionComponents,
    isLoading,
  };
}

/**
 * Type guard to check if a value is a valid UserRole
 */
export function isValidRole(role: string): role is UserRole {
  const validRoles: UserRole[] = [
    'super_admin',
    'general_manager',
    'inventory_planner',
    'buyer',
    'regional_manager',
    'marketing',
    'finance',
    'store_manager',
    'production_planning',
  ];
  return validRoles.includes(role as UserRole);
}

/**
 * Type guard to check if a value is a valid DashboardSection
 */
export function isValidSection(section: string): section is DashboardSection {
  return [
    'overview',
    'demand-forecasting',
    'inventory-planning',
    'pricing-promotion',
    'seasonal-planning',
    'alert-center',
    'user-management',
  ].includes(section);
}

/**
 * Type guard to check if a value is a valid ComponentType
 */
export function isValidComponent(component: string): component is ComponentType {
  return [
    'kpiCards',
    'charts',
    'tables',
    'alerts',
    'filters',
    'actions',
    'calendar',
    'export',
  ].includes(component);
}
