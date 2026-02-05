'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shared/card';
import { Building2 } from 'lucide-react';
import { OrganizationsList } from '@/components/administration/organizations/organizations-list';
import type { Organization } from '@/types/auth';

interface AdministrationListViewProps {
  onOrganizationClick?: (org: Organization) => void;
}

export function AdministrationListView({
  onOrganizationClick,
}: AdministrationListViewProps) {
  return (
    <div className="space-y-4">
      {/* Organizations Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>Manage organizational structure</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <OrganizationsList
        isReadOnly={false}
        onOrganizationClick={onOrganizationClick}
      />
    </div>
  );
}
