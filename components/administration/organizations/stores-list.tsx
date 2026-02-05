'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/shared/button';
import { Input } from '@/components/ui/shared/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shared/select';
import { MultiSelect } from '@/components/ui/shared/multi-select';
import { Label } from '@/components/ui/shared/label';
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
  Building2,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  UserCog,
} from 'lucide-react';
import type { Store, Region, StoreManager } from '@/types/auth';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface StoresListProps {
  isReadOnly?: boolean;
  regionId?: string;
  regionName?: string;
  onStoreClick?: (store: Store) => void;
}

interface StoreWithRegion extends Store {
  regions: Region;
}

interface EligibleManager {
  id: string;
  email: string;
  full_name: string | null;
}

export function StoresList({
  isReadOnly = false,
  regionId,
  regionName,
  onStoreClick,
}: StoresListProps) {
  const [stores, setStores] = useState<StoreWithRegion[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [eligibleManagers, setEligibleManagers] = useState<EligibleManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreWithRegion | null>(
    null,
  );
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    region_id: '',
    manager_id: 'none',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [supabase, regionId]);

  // Fetch eligible managers when region changes
  useEffect(() => {
    const selectedRegionId = regionId || formData.region_id;
    if (selectedRegionId) {
      fetchEligibleManagers(selectedRegionId);
    } else {
      setEligibleManagers([]);
    }
  }, [regionId, formData.region_id]);

  // Set selected managers when editing
  useEffect(() => {
    if (editingStore?.managers) {
      setSelectedManagers(editingStore.managers.map((m) => m.userId));
    } else {
      setSelectedManagers([]);
    }
  }, [editingStore]);

  const fetchEligibleManagers = async (regionIdValue: string) => {
    try {
      // Get the organization from the selected region
      const { data: regionData } = await supabase
        .from('regions')
        .select('organization_id')
        .eq('id', regionIdValue)
        .single();

      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, full_name')
        .overlaps('allowed_regions', [regionIdValue])
        .eq('organization_id', regionData?.organization_id)
        .order('full_name');

      if (error) {throw error;}
      setEligibleManagers(data || []);
    } catch (error) {
      console.error('Error fetching eligible managers:', error);
    }
  };

  const fetchData = async () => {
    try {
      let storesQuery = supabase
        .from('stores')
        .select('*, regions(*)')
        .order('name');

      // Filter by region if provided
      if (regionId) {
        storesQuery = storesQuery.eq('region_id', regionId);
      }

      const [storesRes, regionsRes] = await Promise.all([
        storesQuery,
        supabase.from('regions').select('*').order('name'),
      ]);

      if (storesRes.error) {throw storesRes.error;}
      if (regionsRes.error) {throw regionsRes.error;}

      // Get managers for each store
      const storesWithManagers = await Promise.all(
        (storesRes.data || []).map(async (store) => {
          let managers = null;
          try {
            // Try to use store manager function if it exists
            const { data } = await supabase.rpc('get_store_managers_for_store', {
              store_id_param: store.id
            });
            managers = data;
          } catch (error) {
            // Function doesn't exist yet, that's okay
            managers = null;
          }

          return {
            ...store,
            managers: managers || [],
          };
        }),
      );

      setStores(storesWithManagers || []);
      setRegions(regionsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
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
        region_id: regionId || formData.region_id,
        manager_ids: selectedManagers,
      };

      if (editingStore) {
        const { error } = await supabase
          .from('stores')
          .update({
            name: submitData.name,
            region_id: submitData.region_id,
          })
          .eq('id', editingStore.id);

        if (error) {throw error;}

        // Update managers via API
        await fetch(`/api/stores/${editingStore.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manager_ids: selectedManagers }),
        });
      } else {
        const { error } = await fetch('/api/stores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        });

        if (error) {throw error;}
      }

      setDialogOpen(false);
      setEditingStore(null);
      setFormData({ name: '', region_id: '', manager_id: 'none' });
      setSelectedManagers([]);
      fetchData();
    } catch (error) {
      console.error('Error saving store:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (store: StoreWithRegion) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      region_id: store.regionId,
      manager_id: store.manager?.userId || 'none',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this store?')) {return;}

    try {
      const { error } = await supabase.from('stores').delete().eq('id', id);

      if (error) {throw error;}
      fetchData();
    } catch (error) {
      console.error('Error deleting store:', error);
    }
  };

  const filteredStores = stores.filter(
    (store) =>
      store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.regions.name.toLowerCase().includes(searchTerm.toLowerCase()),
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
          placeholder="Search stores..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); }}
          className="max-w-sm"
        />
        {!isReadOnly && (
          <Button
            onClick={() => { setDialogOpen(true); }}
            disabled={!regionId}
            title={!regionId ? 'Select a region first to add stores' : undefined}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Store
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Store Managers</TableHead>
                {!isReadOnly && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStores.length === 0 ? (
                <TableRow key="empty-state">
                  <TableCell
                    colSpan={isReadOnly ? 3 : 4}
                    className="text-center text-muted-foreground"
                  >
                    {searchTerm ? 'No stores found' : 'No stores yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredStores.map((store) => (
                  <TableRow
                    key={store.id}
                    className={cn(
                      onStoreClick && 'cursor-pointer hover:bg-muted/50',
                      onStoreClick && 'group',
                    )}
                    onClick={() => onStoreClick?.(store)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{store.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-sm">{store.regions.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <UserCog className="h-3 w-3 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          {store.managers && store.managers.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {store.managers.map((manager) => (
                                <span key={manager.userId} className="text-sm">
                                  {manager.fullName || manager.email || 'Unknown'}
                                </span>
                              ))}
                            </div>
                          ) : store.manager ? (
                            <span className="text-sm">{store.manager.fullName || store.manager.email}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">Unassigned</span>
                          )}
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
                              handleEdit(store);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(store.id);
                            }}
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
                {editingStore ? 'Edit Store' : 'Add Store'}
              </DialogTitle>
              <DialogDescription>
                {editingStore
                  ? 'Update the store details'
                  : 'Add a new store to the system'}
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
                    placeholder="e.g., İstanbul - Kadıköy"
                    required
                  />
                </div>
                {!regionId && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Region</label>
                    <Select
                      value={formData.region_id}
                      onValueChange={(value) =>
                        { setFormData({ ...formData, region_id: value }); }
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        {regions.map((region) => (
                          <SelectItem key={region.id} value={region.id}>
                            {region.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {(regionId || formData.region_id) && (
                  <div className="space-y-2">
                    <Label>Store Managers</Label>
                    <MultiSelect
                      options={eligibleManagers.map(m => ({ value: m.id, label: m.full_name || m.email || 'Unknown' }))}
                      value={selectedManagers}
                      onChange={setSelectedManagers}
                      placeholder="Select store managers (leave empty for no managers)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Select one or more store managers for this store
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingStore(null);
                    setFormData({ name: '', region_id: '', manager_id: '' });
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? 'Saving...'
                    : editingStore
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
