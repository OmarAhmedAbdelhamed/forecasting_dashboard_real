'use client';

import { ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/shared/button';
import { useAdministrationStore } from '@/lib/store/administration-store';
import type { BreadcrumbItem } from '@/types/types';

export function AdministrationBreadcrumb() {
  const { getBreadcrumbs, canNavigateUp, navigateUp } = useAdministrationStore();
  const breadcrumbs = getBreadcrumbs();

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 mb-6">
      {/* Back button */}
      {canNavigateUp() && (
        <Button
          variant="ghost"
          size="sm"
          onClick={navigateUp}
          className="h-7 px-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      )}

      {/* Breadcrumb navigation */}
      <nav className="flex items-center text-sm">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.label} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
            )}
            {index === breadcrumbs.length - 1 ? (
              <span className="font-medium text-foreground">{crumb.label}</span>
            ) : (
              <button
                onClick={() => { navigateUp(); }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {crumb.label}
              </button>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}
