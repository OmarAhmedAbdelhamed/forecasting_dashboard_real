'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/shared/button';
import { Input } from '@/components/ui/shared/input';
import { Label } from '@/components/ui/shared/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shared/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shared/select';
import { MultiSelect } from '@/components/ui/shared/multi-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/shared/table';
import { Badge } from '@/components/ui/shared/badge';
import { Shield, Mail, Pencil, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import type { UserProfile, Role, Region, Store, Category } from '@/types/auth';

interface UsersByOrganizationProps {
  organizationId: string;
  isReadOnly?: boolean;
}

export function UsersByOrganization({ organizationId, isReadOnly = false }: UsersByOrganizationProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    roleId: '',
    allowedRegions: [] as string[],
    allowedStores: [] as string[],
    allowedCategories: [] as string[],
  });

  useEffect(() => {
    fetchUsers();
  }, [organizationId]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*, roles(*)')
        .eq('organization_id', organizationId)
        .order('full_name');

      if (error) {throw error;}
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEditData = async () => {
    try {
      const [rolesRes, regionsRes, storesRes, categoriesRes] = await Promise.all([
        supabase.from('roles').select('*').order('level'),
        supabase.from('regions').select('*').order('name'),
        supabase.from('stores').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
      ]);

      if (rolesRes.data) {setRoles(rolesRes.data);}
      if (regionsRes.data) {setRegions(regionsRes.data);}
      if (storesRes.data) {setStores(storesRes.data);}
      if (categoriesRes.data) {setCategories(categoriesRes.data);}
    } catch (error) {
      console.error('Error fetching edit data:', error);
    }
  };

  const handleEditUser = async (user: UserProfile) => {
    if (isReadOnly) {return;}
    setSelectedUser(user);
    setFormData({
      fullName: user.fullName || '',
      email: user.email || '',
      roleId: user.roleId || '',
      allowedRegions: user.allowedRegions || [],
      allowedStores: user.allowedStores || [],
      allowedCategories: user.allowedCategories || [],
    });
    await fetchEditData();
    setEditDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          fullName: formData.fullName,
          roleId: formData.roleId,
          allowedRegions: formData.allowedRegions.length > 0 ? formData.allowedRegions : null,
          allowedStores: formData.allowedStores.length > 0 ? formData.allowedStores : null,
          allowedCategories: formData.allowedCategories.length > 0 ? formData.allowedCategories : null,
        })
        .eq('id', selectedUser?.id);

      if (error) {throw error;}

      setEditDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeColor = (roleName: string) => {
    switch (roleName) {
      case 'super_admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'general_manager':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'buyer':
      case 'inventory_planner':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'regional_manager':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'store_manager':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'finance':
      case 'marketing':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const regionOptions = regions.map((r) => ({ value: r.id, label: r.name }));
  const storeOptions = stores.map((s) => ({ value: s.id, label: s.name }));
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        No users assigned to this organization
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            {!isReadOnly && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium">{user.fullName || 'Unknown'}</div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="h-3 w-3 mr-1" />
                    {user.email || 'No email'}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={getRoleBadgeColor(user.roles?.name || '')}>
                  <Shield className="h-3 w-3 mr-1" />
                  {user.roles?.name?.replace('_', ' ') || 'No role'}
                </Badge>
              </TableCell>
              {!isReadOnly && (
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditUser(user)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {!isReadOnly && selectedUser && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user details, role, and access scope
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => { setFormData({ ...formData, fullName: e.target.value }); }}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.roleId}
                    onValueChange={(value) => { setFormData({ ...formData, roleId: value }); }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name.replace('_', ' ')} - Level {role.level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Allowed Regions</Label>
                  <MultiSelect
                    options={regionOptions}
                    value={formData.allowedRegions}
                    onChange={(value) => { setFormData({ ...formData, allowedRegions: value }); }}
                    placeholder="Select regions (leave empty for all)"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Allowed Stores</Label>
                  <MultiSelect
                    options={storeOptions}
                    value={formData.allowedStores}
                    onChange={(value) => { setFormData({ ...formData, allowedStores: value }); }}
                    placeholder="Select stores (leave empty for all)"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Allowed Categories</Label>
                  <MultiSelect
                    options={categoryOptions}
                    value={formData.allowedCategories}
                    onChange={(value) => { setFormData({ ...formData, allowedCategories: value }); }}
                    placeholder="Select categories (leave empty for all)"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setEditDialogOpen(false); }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
