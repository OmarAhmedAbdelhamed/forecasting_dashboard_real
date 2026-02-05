import type { User as SupabaseUser } from '@supabase/supabase-js';

/**
 * All available user roles in the system
 */
export type UserRole =
  | 'super_admin' // Level 0 - System Owner
  | 'general_manager' // Level 1
  | 'inventory_planner' // Level 2
  | 'buyer' // Level 3
  | 'regional_manager' // Level 4
  | 'marketing' // Level 5
  | 'finance' // Level 6
  | 'store_manager' // Level 7
  | 'production_planning'; // Level 8

/**
 * Permission definition for granular access control
 */
export interface Permission {
  id: string;
  resource: string;
  component?: string;
  action: 'view' | 'edit' | 'export' | 'resolve';
  description?: string;
}

/**
 * Role definition with hierarchy level
 */
export interface Role {
  id: string;
  name: UserRole;
  description?: string;
  level: number;
}

/**
 * Data scope for user access restrictions
 *
 * Values can be:
 * - undefined: User has access to all data of this type
 * - [] (empty array): User has no access to data of this type
 * - [id1, id2, ...]: User has access to only the specified IDs
 */
export interface DataScope {
  allowedRegions?: string[];
  allowedStores?: string[];
  allowedCategories?: string[];
}

/**
 * User profile stored in the database
 */
export interface UserProfile {
  id: string;
  fullName?: string;
  email?: string;
  roleId?: string;
  organizationId?: string;
  role?: Role;
  organization?: Organization;
  /** Data scope for filtering - undefined means "all", [] means "none" */
  dataScope?: DataScope;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Organization role types for organizational management
 */
export type OrganizationRoleType =
  | 'organization_manager'
  | 'regional_manager'
  | 'store_manager';

/**
 * User organizational role assignment
 */
export interface UserOrganizationRole {
  id: string;
  userId: string;
  organizationId: string;
  roleType: OrganizationRoleType;
  regionId?: string | null;
  storeId?: string | null;
  region?: Region;
  store?: Store;
  organization?: Organization;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User profile with organizational roles
 */
export interface UserProfileWithOrgRoles extends UserProfile {
  organizationRoles?: UserOrganizationRole[];
}

/**
 * Extended auth user with profile and permissions
 */
export interface AuthUser extends SupabaseUser {
  userProfile?: UserProfile;
  permissions?: Permission[];
  role?: UserRole;
}

/**
 * Audit log entry for tracking user actions
 */
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource?: string;
  details?: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Organization structure types
 */

/**
 * Organization - Top-level company/entity
 */
export interface Organization {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Region Manager - User assigned to manage a region
 */
export interface RegionManager {
  userId: string;
  fullName: string | null;
  email: string | null;
}

/**
 * Store Manager - User assigned to manage a store
 */
export interface StoreManager {
  userId: string;
  email: string;
  fullName: string | null;
  roleName: string;
}

/**
 * Region form data for create/update operations
 */
export interface RegionFormData {
  name: string;
  organizationId: string;
  managerIds?: string[];
}

/**
 * Region - Geographic area within an organization
 */
export interface Region {
  id: string;
  organizationId: string;
  name: string;
  organization?: Organization;
  managers?: RegionManager[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Store - Physical store within a region
 */
export interface Store {
  id: string;
  regionId: string;
  name: string;
  region?: Region;
  manager?: StoreManager | null; // Legacy single manager (deprecated)
  managers?: StoreManager[]; // Multiple store managers
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Category - Product category
 */
export interface Category {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Option format for UI selectors (matches MultiSelect component)
 */
export interface SelectorOption {
  value: string;
  label: string;
}

/**
 * Product types
 */

/**
 * Product - Master product catalog
 */
export interface Product {
  id: string;
  name: string;
  categoryId: string;
  category?: Category;
  barcode?: string;
  description?: string;
  unit?: string;
  costPrice?: number;
  sellingPrice?: number;
  vatRate?: number;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * StoreProduct - Product availability per store
 */
export interface StoreProduct {
  id: string;
  storeId: string;
  productId: string;
  store?: Store;
  product?: Product;
  isActive?: boolean; // Is this product sold in this store?
  storeSpecificPrice?: number;
  createdAt: Date;
  updatedAt: Date;
}
