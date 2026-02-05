'use client';

import React, { useEffect } from 'react';
import { useAdministrationStore } from '@/lib/store/administration-store';
import { AdministrationBreadcrumb } from '@/components/administration/administration-breadcrumb';
import { AdministrationListView } from '@/components/administration/views/administration-list-view';
import { UsersView } from '@/components/administration/views/users-view';
import { RegionsView } from '@/components/administration/views/regions-view';
import { StoresView } from '@/components/administration/views/stores-view';
import { StoreManagementView } from '@/components/administration/views/store-management-view';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/shared/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shared/card';
import { Users, Building2, Settings, MapPin } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { Organization, Region, Store } from '@/types/auth';

export function AdministrationSection() {
  const {
    drillDownState,
    selectOrganization,
    selectRegion,
    selectStore,
    setInitialViewForRole,
  } = useAdministrationStore();
  const { userProfile } = useAuth();

  const isSuperAdmin = userProfile?.role?.name === 'super_admin';
  const isGM = userProfile?.role?.name === 'general_manager';
  const isRegionalManager = userProfile?.role?.name === 'regional_manager';
  const isStoreManager = userProfile?.role?.name === 'store_manager';
  const canManageUsers = isSuperAdmin || isGM;

  // Dynamic tab name and icon based on role
  const managementTabName = isSuperAdmin
    ? 'Organization Management'
    : isStoreManager
      ? 'Store Management'
      : 'Region Management';
  const ManagementIcon = isSuperAdmin ? Building2 : MapPin;

  // Reset drill-down state when component mounts
  useEffect(() => {
    return () => {
      // Optional: Reset when leaving the section
      // useAdministrationStore.getState().resetDrillDown();
    };
  }, []);

  // Set initial view based on role when component mounts (only once)
  const hasInitialized = React.useRef(false);

  useEffect(() => {
    // Only initialize once
    if (hasInitialized.current) {return;}

    if (isSuperAdmin) {
      // Super Admin starts at organizations view
      setInitialViewForRole(true);
      hasInitialized.current = true;
    } else if (isStoreManager && userProfile?.allowedStores) {
      // Store Manager starts at stores view
      setInitialViewForRole(
        false,
        userProfile.organizationId,
        undefined,
        userProfile.allowedStores,
      );
      hasInitialized.current = true;
    } else if (isRegionalManager && userProfile?.allowedRegions) {
      // Regional Manager starts at regions view
      setInitialViewForRole(
        false,
        userProfile.organizationId,
        userProfile.allowedRegions,
      );
      hasInitialized.current = true;
    } else if (isGM && userProfile?.organizationId) {
      // GM starts at regions view
      setInitialViewForRole(false, userProfile.organizationId);
      hasInitialized.current = true;
    }
  }, [
    isSuperAdmin,
    isRegionalManager,
    isStoreManager,
    isGM,
    userProfile?.organizationId,
    userProfile?.allowedRegions,
    userProfile?.allowedStores,
    setInitialViewForRole,
  ]);

  const handleOrganizationClick = (org: Organization) => {
    selectOrganization(org.id, org.name);
  };

  const handleRegionClick = (region: Region) => {
    selectRegion(region.id, region.name);
  };

  const handleStoreClick = (store: Store) => {
    selectStore(store.id, store.name);
  };

  const renderManagementView = () => {
    switch (drillDownState.view) {
      case 'list':
        return (
          <AdministrationListView
            onOrganizationClick={handleOrganizationClick}
          />
        );

      case 'regions':
        return (
          <RegionsView
            key={drillDownState.organizationId}
            onRegionClick={handleRegionClick}
          />
        );

      case 'stores':
        return (
          <StoresView
            key={drillDownState.regionId}
            onStoreClick={handleStoreClick}
          />
        );

      case 'store-management':
        return (
          <StoreManagementView
            key={drillDownState.storeId}
            storeId={drillDownState.storeId!}
            storeName={drillDownState.storeName!}
          />
        );

      default:
        return <AdministrationListView />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Administration</CardTitle>
              <CardDescription>
                Manage users and organizational structure
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs
        defaultValue={canManageUsers ? 'users' : 'management'}
        className="w-full"
      >
        <TabsList>
          {canManageUsers && (
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              User Management
            </TabsTrigger>
          )}
          <TabsTrigger value="management">
            <ManagementIcon className="h-4 w-4 mr-2" />
            {managementTabName}
          </TabsTrigger>
        </TabsList>

        {/* User Management Tab */}
        {canManageUsers && (
          <TabsContent value="users" className="space-y-4">
            <UsersView />
          </TabsContent>
        )}

        {/* Organization/Region Management Tab */}
        <TabsContent value="management" className="space-y-4">
          <AdministrationBreadcrumb />
          {renderManagementView()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
