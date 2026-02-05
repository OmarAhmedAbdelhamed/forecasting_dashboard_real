'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/shared/button';
import { Input } from '@/components/ui/shared/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/shared/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shared/dialog';
import { Card, CardContent } from '@/components/ui/shared/card';
import { MultiSelect } from '@/components/ui/shared/multi-select';
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  UserCog,
} from 'lucide-react';
import type { Region, Organization, RegionManager } from '@/types/auth';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

interface RegionsListProps {
  isReadOnly?: boolean;
  organizationId?: string;
  organizationName?: string;
  regionIds?: string[];
  onRegionClick?: (region: Region) => void;
}

interface RegionalManagerUser {
  id: string;
  fullName: string | null;
  email: string | null;
}

export function RegionsList({
  isReadOnly = false,
  organizationId,
  organizationName,
  regionIds,
  onRegionClick,
}: RegionsListProps) {
  const { userProfile } = useAuth();
  const [regions, setRegions] = useState<Region[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [regionalManagers, setRegionalManagers] = useState<RegionalManagerUser[]>([]);
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    organizationId: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRegions();
    if (userProfile?.role?.name === 'super_admin' && !organizationId) {
      fetchOrganizations();
    }
  }, [supabase, userProfile, organizationId, regionIds]);

  // Fetch regional managers when dialog opens or organization changes
  useEffect(() => {
    if (dialogOpen) {
      fetchRegionalManagers();
    }
  }, [dialogOpen, editingRegion, formData.organizationId]);

  // When editing, set selected managers
  useEffect(() => {
    if (editingRegion?.managers) {
      setSelectedManagers(editingRegion.managers.map((m) => m.userId));
    } else {
      setSelectedManagers([]);
    }
  }, [editingRegion]);

  const fetchRegions = async () => {
    try {
      let query = supabase
        .from('regions')
        .select('*, organization:organizations(*)')
        .order('name');

      // Filter by organization if provided
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      // Filter by specific region IDs if provided
      if (regionIds && regionIds.length > 0) {
        query = query.in('id', regionIds);
      }

      const { data, error } = await query;

      if (error) {throw error;}

      // Get managers for each region
      const regionsWithManagers = await Promise.all(
        (data || []).map(async (region) => {
          const { data: managers } = await supabase.rpc('get_regional_managers_for_region', {
            region_id_param: region.id
          });

          return {
            ...region,
            managers: managers || [],
          };
        }),
      );

      setRegions(regionsWithManagers);
    } catch (error) {
      console.error('Error fetching regions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (error) {throw error;}
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  /**
   * Get the organization ID for filtering regional managers
   * Uses the region's org (edit mode) or form's selected org (create mode)
   */
  const getManagerOrganizationId = (): string | undefined => {
    return editingRegion?.organizationId || formData.organizationId || organizationId;
  };

  const fetchRegionalManagers = async () => {
    setLoadingManagers(true);
    try {
      const orgId = getManagerOrganizationId();

      if (!orgId) {
        console.warn('[RegionsList] No organization ID available for filtering regional managers');
        setRegionalManagers([]);
        return;
      }

      // Fetch regional managers filtered by organization
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .eq('role_id', (
          await supabase.from('roles').select('id').eq('name', 'regional_manager').single()
        ).data?.id)
        .eq('organization_id', orgId)  // Filter by organization
        .order('full_name');

      if (error) {throw error;}
      setRegionalManagers(data || []);
    } catch (error) {
      console.error('Error fetching regional managers:', error);
      setRegionalManagers([]);
    } finally {
      setLoadingManagers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const orgId =
        userProfile?.role?.name === 'super_admin'
          ? organizationId || formData.organizationId
          : userProfile?.organizationId;

      if (editingRegion) {
        // Update existing region
        const { error } = await supabase
          .from('regions')
          .update({
            name: formData.name,
          })
          .eq('id', editingRegion.id);

        if (error) {throw error;}

        // Update managers via API
        await fetch(`/api/regions/${editingRegion.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manager_ids: selectedManagers }),
        });
      } else {
        // Create new region
        const response = await fetch('/api/regions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            organization_id: orgId,
            manager_ids: selectedManagers,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create region');
        }
      }

      setDialogOpen(false);
      setEditingRegion(null);
      setFormData({ name: '', organizationId: '' });
      setSelectedManagers([]);
      fetchRegions();
    } catch (error) {
      console.error('Error saving region:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (region: Region) => {
    setEditingRegion(region);
    setFormData({
      name: region.name,
      organizationId: region.organizationId || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this region?')) {return;}

    try {
      const { error } = await supabase.from('regions').delete().eq('id', id);

      if (error) {throw error;}
      fetchRegions();
    } catch (error) {
      console.error('Error deleting region:', error);
    }
  };

  const filteredRegions = regions.filter(
    (region) =>
      region.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const formatManagers = (managers: RegionManager[] | undefined) => {
    if (!managers || managers.length === 0) {
      return (
        <span className="text-sm text-muted-foreground">No managers</span>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        {managers.map((manager) => (
          <span key={manager.userId} className="text-sm">
            {manager.fullName || manager.email || 'Unknown'}
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search regions..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); }}
          className="max-w-sm"
        />
        {!isReadOnly && (
          <Button onClick={() => { setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Region
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Regional Managers</TableHead>
                {!isReadOnly && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRegions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isReadOnly ? 2 : 3}
                    className="text-center text-muted-foreground"
                  >
                    {searchTerm ? 'No regions found' : 'No regions yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRegions.map((region) => (
                  <React.Fragment key={region.id}>
                    <TableRow
                      className={cn(
                        onRegionClick && 'cursor-pointer hover:bg-muted/50',
                        onRegionClick && 'group',
                      )}
                      onClick={() => onRegionClick?.(region)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{region.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <UserCog className="h-3 w-3 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            {formatManagers(region.managers)}
                          </div>
                        </div>
                      </TableCell>
                      {!isReadOnly && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(region);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(region.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!isReadOnly && (
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingRegion(null);
            setFormData({ name: '', organizationId: '' });
            setSelectedManagers([]);
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingRegion ? 'Edit Region' : 'Add Region'}
              </DialogTitle>
              <DialogDescription>
                {editingRegion
                  ? 'Update the region details'
                  : 'Add a new region to the system'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      { setFormData({ ...formData, name: e.target.value }); }
                    }
                    placeholder="e.g., Marmara"
                    required
                  />
                </div>

                {/* Regional Managers MultiSelect */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Regional Managers</label>
                  {loadingManagers ? (
                    <div className="flex items-center justify-center h-9 border rounded-md bg-muted">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <MultiSelect
                      options={regionalManagers.map((m) => ({
                        value: m.id,
                        label: m.fullName || m.email || 'Unknown',
                      }))}
                      selected={selectedManagers}
                      onChange={setSelectedManagers}
                      placeholder="Select regional managers"
                      className="w-full"
                    />
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingRegion(null);
                    setFormData({ name: '', organizationId: '' });
                    setSelectedManagers([]);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? 'Saving...'
                    : editingRegion
                      ? 'Update'
                      : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
