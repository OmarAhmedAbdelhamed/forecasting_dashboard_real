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
import {
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Store,
  Users,
} from 'lucide-react';
import type { Organization } from '@/types/auth';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

interface OrganizationWithCounts extends Organization {
  regionCount?: number;
  storeCount?: number;
  userCount?: number;
}

interface OrganizationsListProps {
  isReadOnly?: boolean;
  onOrganizationClick?: (org: Organization) => void;
}

export function OrganizationsList({
  isReadOnly = false,
  onOrganizationClick,
}: OrganizationsListProps) {
  const [organizations, setOrganizations] = useState<OrganizationWithCounts[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [submitting, setSubmitting] = useState(false);
  const { userProfile } = useAuth();

  useEffect(() => {
    fetchOrganizations();
  }, [supabase]);

  const fetchOrganizations = async () => {
    try {
      // Super admins see all organizations, GMs see only their assigned organization
      let query = supabase.from('organizations').select('*').order('name');

      // If user is not super admin, filter by their organization
      if (
        userProfile?.organizationId &&
        userProfile.role?.name !== 'super_admin'
      ) {
        query = query.eq('id', userProfile.organizationId);
      }

      const { data, error } = await query;

      if (error) {throw error;}

      // Get region, store, and user counts for each organization
      const orgsWithCounts = await Promise.all(
        (data || []).map(async (org) => {
          // Get region count
          const { count: regionCount } = await supabase
            .from('regions')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id);

          // Get store count - first fetch region IDs, then count stores
          const { data: regions } = await supabase
            .from('regions')
            .select('id')
            .eq('organization_id', org.id);

          const regionIds = regions?.map((r) => r.id) || [];

          const { count: storeCount } = await supabase
            .from('stores')
            .select('*', { count: 'exact', head: true })
            .in('region_id', regionIds);

          // Get user count for this organization
          const { count: userCount } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id);

          return {
            ...org,
            regionCount: regionCount || 0,
            storeCount: storeCount || 0,
            userCount: userCount || 0,
          };
        }),
      );

      setOrganizations(orgsWithCounts);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const submitData = {
        name: formData.name,
      };

      if (editingOrg) {
        const { error } = await supabase
          .from('organizations')
          .update(submitData)
          .eq('id', editingOrg.id);

        if (error) {throw error;}
      } else {
        const { error } = await supabase
          .from('organizations')
          .insert(submitData);

        if (error) {throw error;}
      }

      setDialogOpen(false);
      setEditingOrg(null);
      setFormData({ name: '' });
      fetchOrganizations();
    } catch (error) {
      console.error('Error saving organization:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (org: OrganizationWithCounts) => {
    setEditingOrg(org);
    setFormData({ name: org.name });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this organization? This will also delete all regions and stores within it.',
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id);

      if (error) {throw error;}
      fetchOrganizations();
    } catch (error) {
      console.error('Error deleting organization:', error);
    }
  };

  const filteredOrgs = organizations.filter(
    (org) =>
      org.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
          placeholder="Search organizations..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); }}
          className="max-w-sm"
        />
        {!isReadOnly && (
          <Button onClick={() => { setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Organization
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Regions</TableHead>
                <TableHead>Stores</TableHead>
                {!isReadOnly && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrgs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isReadOnly ? 3 : 4}
                    className="text-center text-muted-foreground"
                  >
                    {searchTerm
                      ? 'No organizations found'
                      : 'No organizations yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrgs.map((org) => (
                  <TableRow
                    key={org.id}
                    className={cn(
                      onOrganizationClick && 'cursor-pointer hover:bg-muted/50',
                      onOrganizationClick && 'group',
                    )}
                    onClick={() => onOrganizationClick?.(org)}
                  >
                    <TableCell>
                      <span className="text-sm font-medium">{org.name}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{org.regionCount || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Store className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{org.storeCount || 0}</span>
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
                              handleEdit(org);
                            }}
                            title="Edit organization"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(org.id);
                            }}
                            disabled={
                              (org.regionCount || 0) > 0 ||
                              (org.storeCount || 0) > 0
                            }
                            title="Delete organization"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!isReadOnly && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingOrg ? 'Edit Organization' : 'Add Organization'}
              </DialogTitle>
              <DialogDescription>
                {editingOrg
                  ? 'Update the organization details'
                  : 'Add a new organization to the system'}
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
                    placeholder="e.g., Bee2 Retail"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingOrg(null);
                    setFormData({ name: '' });
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : editingOrg ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
