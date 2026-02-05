import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type {
  DrillDownState,
  AdministrationView,
  BreadcrumbItem,
} from '@/types/types';

interface AdministrationState {
  // Drill-down navigation state
  drillDownState: DrillDownState;

  // Actions
  setDrillDownState: (state: DrillDownState) => void;
  resetDrillDown: () => void;
  navigateUp: () => void;
  canNavigateUp: () => boolean;
  getBreadcrumbs: () => BreadcrumbItem[];

  // Convenience methods for drill-down actions
  selectOrganization: (
    organizationId: string,
    organizationName: string,
  ) => void;
  selectRegion: (
    regionId: string,
    regionName: string,
  ) => void;
  selectStore: (storeId: string, storeName: string) => void;
  setInitialViewForRole: (
    isSuperAdmin: boolean,
    organizationId?: string,
    regionIds?: string[],
    storeIds?: string[],
  ) => void;
  showUsers: () => void;
}

/**
 * Zustand store for administration drill-down navigation state management.
 *
 * Manages hierarchical navigation within the administration section:
 * - Organizations list (top level)
 * - Regions within an organization
 * - Stores within a region
 * - Store management view (categories + products tabs)
 *
 * Persists to localStorage as 'administration-storage' for session persistence.
 */
export const useAdministrationStore = create<AdministrationState>()(
  persist(
    (set, get) => ({
      // Initial state - showing organizations list
      drillDownState: {
        view: 'list',
      },

      /**
       * Set the drill-down state to a specific view with context.
       */
      setDrillDownState: (state: DrillDownState) => {
        set({ drillDownState: state });
      },

      /**
       * Reset drill-down state to top level (organizations list).
       */
      resetDrillDown: () => {
        set({
          drillDownState: {
            view: 'list',
          },
        });
      },

      /**
       * Navigate up one level in the hierarchy.
       * - store-management → stores
       * - stores → regions
       * - regions → list
       * - users → list
       * - list → no effect (already at top)
       */
      navigateUp: () => {
        const { drillDownState } = get();
        const currentView = drillDownState.view;

        switch (currentView) {
          case 'store-management':
            // Navigate up to stores view, preserve region context
            set({
              drillDownState: {
                view: 'stores',
                organizationId: drillDownState.organizationId,
                organizationName: drillDownState.organizationName,
                regionId: drillDownState.regionId,
                regionName: drillDownState.regionName,
              },
            });
            break;

          case 'stores':
            // Navigate up to regions view, preserve organization context
            set({
              drillDownState: {
                view: 'regions',
                organizationId: drillDownState.organizationId,
                organizationName: drillDownState.organizationName,
              },
            });
            break;

          case 'regions':
            // Navigate up to organizations list
            set({
              drillDownState: {
                view: 'list',
              },
            });
            break;

          case 'users':
            // Navigate up to organizations list
            set({
              drillDownState: {
                view: 'list',
              },
            });
            break;

          case 'list':
            // Already at top level, no change
            break;
        }
      },

      /**
       * Check if we can navigate up (i.e., not at top level).
       */
      canNavigateUp: () => {
        const { drillDownState } = get();
        return drillDownState.view !== 'list';
      },

      /**
       * Generate breadcrumb array based on current drill-down state.
       */
      getBreadcrumbs: () => {
        const { drillDownState } = get();
        const breadcrumbs: BreadcrumbItem[] = [];

        // Check if at top level for non-super-admin roles (no breadcrumbs)
        const isRegionalManagerTopLevel =
          drillDownState.view === 'regions' && !drillDownState.organizationName;

        const isStoreManagerTopLevel =
          drillDownState.view === 'stores' && !drillDownState.regionName;

        const isGMTopLevel =
          drillDownState.view === 'regions' && !drillDownState.organizationName;

        // For regional/store managers at top level, don't show breadcrumbs
        if (isRegionalManagerTopLevel || isStoreManagerTopLevel) {
          return [];
        }

        if (isGMTopLevel) {
          // For GM at top level, start with "Regions"
          breadcrumbs.push({
            label: 'Regions',
            view: 'regions',
          });
        } else {
          // For Super Admin or drilled-in views, start with "Organizations"
          breadcrumbs.push({
            label: 'Organizations',
            view: 'list',
          });

          // Add organization if drilled in
          if (
            drillDownState.organizationName &&
            drillDownState.view !== 'list'
          ) {
            breadcrumbs.push({
              label: drillDownState.organizationName,
              view: 'regions',
              state: {
                organizationId: drillDownState.organizationId,
                organizationName: drillDownState.organizationName,
              },
            });
          }
        }

        // Add region if drilled in
        if (
          drillDownState.regionName &&
          drillDownState.view !== 'list' &&
          drillDownState.view !== 'regions'
        ) {
          breadcrumbs.push({
            label: drillDownState.regionName,
            view: 'stores',
            state: {
              organizationId: drillDownState.organizationId,
              organizationName: drillDownState.organizationName,
              regionId: drillDownState.regionId,
              regionName: drillDownState.regionName,
            },
          });
        }

        // Add store if drilled in
        if (
          drillDownState.storeName &&
          drillDownState.view === 'store-management'
        ) {
          breadcrumbs.push({
            label: drillDownState.storeName,
            view: 'store-management',
            state: drillDownState,
          });
        }

        return breadcrumbs;
      },

      /**
       * Convenience method: Select an organization and navigate to regions view.
       */
      selectOrganization: (
        organizationId: string,
        organizationName: string,
      ) => {
        set({
          drillDownState: {
            view: 'regions',
            organizationId,
            organizationName,
          },
        });
      },

      /**
       * Convenience method: Select a region and navigate to stores view.
       */
      selectRegion: (
        regionId: string,
        regionName: string,
      ) => {
        const { drillDownState } = get();

        set({
          drillDownState: {
            view: 'stores',
            organizationId: drillDownState.organizationId,
            organizationName: drillDownState.organizationName,
            regionId,
            regionName,
          },
        });
      },

      /**
       * Convenience method: Select a store and navigate to store management view.
       */
      selectStore: (storeId: string, storeName: string) => {
        const { drillDownState } = get();

        set({
          drillDownState: {
            view: 'store-management',
            organizationId: drillDownState.organizationId,
            organizationName: drillDownState.organizationName,
            regionId: drillDownState.regionId,
            regionName: drillDownState.regionName,
            storeId,
            storeName,
          },
        });
      },

      /**
       * Convenience method: Show users view (no drill-down context).
       */
      showUsers: () => {
        set({
          drillDownState: {
            view: 'users',
          },
        });
      },

      /**
       * Set initial view based on user role.
       * Super Admins start at organizations list.
       * GMs start at regions view (filtered to their organization).
       * Regional Managers start at regions view (filtered to their regions).
       * Store Managers start at stores view (filtered to their stores).
       */
      setInitialViewForRole: (
        isSuperAdmin: boolean,
        organizationId?: string,
        regionIds?: string[],
        storeIds?: string[],
      ) => {
        if (isSuperAdmin) {
          // Super Admin starts at organizations list
          set({
            drillDownState: {
              view: 'list',
            },
          });
        } else if (storeIds && storeIds.length > 0) {
          // Store Manager starts at stores view (filtered)
          set({
            drillDownState: {
              view: 'stores',
              organizationId,
              // Don't set regionId to allow seeing all stores
            },
          });
        } else if (regionIds && regionIds.length > 0) {
          // Regional Manager starts at regions view (filtered)
          set({
            drillDownState: {
              view: 'regions',
              organizationId,
            },
          });
        } else if (organizationId) {
          // GM starts at regions view (org-scoped)
          set({
            drillDownState: {
              view: 'regions',
              organizationId,
            },
          });
        }
      },
    }),
    {
      name: 'administration-storage',
      // Persist drill-down state
      partialize: (state) => ({
        drillDownState: state.drillDownState,
      }),
    },
  ),
);
