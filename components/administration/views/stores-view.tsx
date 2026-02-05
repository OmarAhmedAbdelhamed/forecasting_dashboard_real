'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shared/card';
import { Building2, MapPin } from 'lucide-react';
import { StoresList } from '@/components/administration/organizations/stores-list';
import { useAdministrationStore } from '@/lib/store/administration-store';
import { useAuth } from '@/hooks/use-auth';
import type { Store } from '@/types/auth';

interface StoresViewProps {
  onStoreClick?: (store: Store) => void;
}

export function StoresView({ onStoreClick }: StoresViewProps) {
  const { drillDownState } = useAdministrationStore();
  const { userProfile } = useAuth();
  const { regionId, regionName, organizationName } = drillDownState;

  const isStoreManager = userProfile?.role?.name === 'store_manager';
  const isTopLevelForSM = isStoreManager && !organizationName;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              {isTopLevelForSM ? (
                <MapPin className="h-5 w-5 text-primary" />
              ) : (
                <Building2 className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <CardTitle>
                {isTopLevelForSM ? 'Stores' : regionName}
              </CardTitle>
              <CardDescription>
                {isTopLevelForSM
                  ? 'Manage stores in your region'
                  : `${organizationName} • Stores in this region`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <StoresList
        isReadOnly={false}
        regionId={regionId}
        regionName={regionName}
        onStoreClick={onStoreClick}
      />
    </div>
  );
}
