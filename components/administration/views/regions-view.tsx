'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shared/card';
import { Building2, MapPin } from 'lucide-react';
import { RegionsList } from '@/components/administration/organizations/regions-list';
import { useAdministrationStore } from '@/lib/store/administration-store';
import { useAuth } from '@/hooks/use-auth';
import type { Region } from '@/types/auth';

interface RegionsViewProps {
  onRegionClick?: (region: Region) => void;
}

export function RegionsView({ onRegionClick }: RegionsViewProps) {
  const { drillDownState } = useAdministrationStore();
  const { userProfile } = useAuth();
  const { organizationId, organizationName } = drillDownState;

  const isGM = userProfile?.role?.name === 'general_manager';
  const isRegionalManager = userProfile?.role?.name === 'regional_manager';
  const isTopLevelForGM = isGM && !organizationName;
  const isTopLevelForRegionalManager = isRegionalManager && !organizationName;

  const isReadOnly = isRegionalManager;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              {isTopLevelForGM || isTopLevelForRegionalManager ? (
                <MapPin className="h-5 w-5 text-primary" />
              ) : (
                <Building2 className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <CardTitle>
                {isTopLevelForGM || isTopLevelForRegionalManager
                  ? 'Regions'
                  : organizationName}
              </CardTitle>
              <CardDescription>
                {isTopLevelForGM || isTopLevelForRegionalManager
                  ? 'Manage regions in your organization'
                  : 'Regions in this organization'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <RegionsList
        isReadOnly={isReadOnly}
        organizationId={organizationId || userProfile?.organizationId}
        organizationName={organizationName}
        regionIds={isRegionalManager ? userProfile?.allowedRegions : undefined}
        onRegionClick={onRegionClick}
      />
    </div>
  );
}
