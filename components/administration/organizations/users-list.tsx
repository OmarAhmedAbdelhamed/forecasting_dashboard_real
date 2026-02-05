'use client';

import { useState, useEffect, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shared/select';
import { MultiSelect } from '@/components/ui/shared/multi-select';
import { Card, CardContent } from '@/components/ui/shared/card';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Lock,
  Building2,
  MapPin,
} from 'lucide-react';
import type {
  UserProfile,
  Role,
  Organization,
  Region,
  Store,
} from '@/types/auth';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/shared/badge';

interface UserWithDetails extends UserProfile {
  role?: Role;
  organization?: Organization;
}

export function UsersList() {
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithDetails | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    roleId: '',
    organizationId: '',
    allowedRegions: [] as string[],
    allowedStores: [] as string[],
    allowedCategories: [] as string[],
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const isSuperAdmin = userProfile?.role?.name === 'super_admin';
  const isGM = userProfile?.role?.name === 'general_manager';

  // Filter organizations based on user role
  const availableOrganizations = useMemo(() => {
    if (isSuperAdmin) {
      // Super admins see all organizations
      return organizations;
    } else if (isGM && userProfile?.organizationId) {
      // GMs only see their own organization
      return organizations.filter(org => org.id === userProfile.organizationId);
    }
    return organizations;
  }, [isSuperAdmin, isGM, userProfile?.organizationId, organizations]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    // Fetch regions when organization changes
    if (formData.organizationId) {
      fetchRegions(formData.organizationId);
    } else {
      setRegions([]);
      setStores([]);
    }
  }, [formData.organizationId]);

  useEffect(() => {
    // Fetch stores when allowed regions change
    if (formData.allowedRegions.length > 0) {
      fetchStores(formData.allowedRegions);
    } else {
      setStores([]);
    }
  }, [formData.allowedRegions]);

  const fetchInitialData = async () => {
    try {
      await Promise.all([fetchUsers(), fetchRoles(), fetchOrganizations()]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      let query = supabase
        .from('user_profiles')
        .select(
          `
          *,
          role:roles(*),
          organization:organizations(*)
        `,
        )
        .order('full_name');

      // Filter users by organization for GMs
      if (isGM && userProfile?.organizationId) {
        query = query.eq('organization_id', userProfile.organizationId);
      }

      const { data, error } = await query;

      if (error) {throw error;}
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('level');

      if (error) {throw error;}

      // If GM, filter out Super Admin and GM roles
      let filteredRoles = data || [];
      if (isGM) {
        filteredRoles = filteredRoles.filter((role) => role.level > 1);
      }

      setRoles(filteredRoles);
    } catch (error) {
      console.error('Error fetching roles:', error);
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

  const fetchRegions = async (organizationId: string) => {
    try {
      const { data, error } = await supabase
        .from('regions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) {throw error;}
      setRegions(data || []);
    } catch (error) {
      console.error('Error fetching regions:', error);
    }
  };

  const fetchStores = async (regionIds: string[]) => {
    try {
      if (regionIds.length === 0) {
        setStores([]);
        return;
      }

      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .in('region_id', regionIds)
        .order('name');

      if (error) {throw error;}
      setStores(data || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({
      fullName: '',
      email: '',
      password: '',
      roleId: '',
      organizationId:
        isGM && userProfile?.organizationId ? userProfile.organizationId : '',
      allowedRegions: [],
      allowedStores: [],
      allowedCategories: [],
      isActive: true,
    });
    setDialogOpen(true);
  };

  const handleEdit = (user: UserWithDetails) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName || '',
      email: user.email || '',
      password: '', // Don't populate password for editing
      roleId: user.roleId || '',
      organizationId: user.organizationId || '',
      allowedRegions: user.allowedRegions || [],
      allowedStores: user.allowedStores || [],
      allowedCategories: user.allowedCategories || [],
      isActive: user.isActive !== false,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate store_manager has at least one store
      const selectedRole = roles.find(r => r.id === formData.roleId);
      if (selectedRole?.name === 'store_manager' && formData.allowedStores.length === 0) {
        throw new Error('At least one store must be selected for store managers');
      }

      // Validate regional_manager has at least one region
      if (selectedRole?.name === 'regional_manager' && formData.allowedRegions.length === 0) {
        throw new Error('At least one region must be selected for regional managers');
      }
      if (editingUser) {
        // Update existing user
        const response = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: formData.fullName,
            email: formData.email,
            role_id: formData.roleId,
            organization_id: formData.organizationId,
            allowed_regions: formData.allowedRegions,
            allowed_stores: formData.allowedStores,
            allowed_categories: formData.allowedCategories,
            is_active: formData.isActive,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update user');
        }

        toast({
          title: 'User updated successfully',
          description: `${formData.email} has been updated`,
        });
      } else {
        // Create new user
        if (!formData.password) {
          throw new Error('Password is required for new users');
        }

        const response = await fetch('/api/users/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            full_name: formData.fullName,
            role_id: formData.roleId,
            organization_id: formData.organizationId,
            allowed_regions: formData.allowedRegions,
            allowed_stores: formData.allowedStores,
            allowed_categories: formData.allowedCategories,
            is_active: formData.isActive,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create user');
        }

        toast({
          title: 'User created successfully',
          description: `${formData.email} has been added`,
        });
      }

      setDialogOpen(false);
      setEditingUser(null);
      setFormData({
        fullName: '',
        email: '',
        password: '',
        roleId: '',
        organizationId: '',
        allowedRegions: [],
        allowedStores: [],
        allowedCategories: [],
        isActive: true,
      });
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to save user',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to deactivate user');
      }

      toast({
        title: 'User deactivated',
        description: 'The user has been deactivated successfully',
      });

      fetchUsers();
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to deactivate user',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
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

  const organizationLocked = isGM && !!userProfile?.organizationId;
  const selectedOrganization = organizationLocked
    ? organizations.find((org) => org.id === userProfile.organizationId)
    : organizations.find((org) => org.id === formData.organizationId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); }}
          className="max-w-sm"
        />
        {(isSuperAdmin || isGM) && (
          <Button onClick={handleAddUser}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {user.fullName || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>{user.email || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {user.role?.name || 'No role'}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.organization?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.isActive === false ? 'destructive' : 'default'
                        }
                      >
                        {user.isActive === false ? 'Inactive' : 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { handleEdit(user); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user.id)}
                          disabled={user.id === userProfile?.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Edit User' : 'Add New User'}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Update user information and permissions.'
                : 'Create a new user account.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  value={formData.fullName}
                  onChange={(e) =>
                    { setFormData({ ...formData, fullName: e.target.value }); }
                  }
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    { setFormData({ ...formData, email: e.target.value }); }
                  }
                  placeholder="john@example.com"
                  required
                />
              </div>

              {!editingUser && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      { setFormData({ ...formData, password: e.target.value }); }
                    }
                    placeholder="••••••••"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 12 characters with uppercase, lowercase, number, and special character
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select
                  value={formData.roleId}
                  onValueChange={(value) =>
                    { setFormData({ ...formData, roleId: value }); }
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name} (Level {role.level})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Organization</label>
                {organizationLocked ? (
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-muted">
                    <Building2 className="h-4 w-4" />
                    <span className="text-sm">
                      {selectedOrganization?.name || 'N/A'}
                    </span>
                    <Lock className="h-3 w-3 ml-auto" />
                  </div>
                ) : (
                  <Select
                    value={formData.organizationId}
                    onValueChange={(value) =>
                      { setFormData({
                        ...formData,
                        organizationId: value,
                        allowedRegions: [], // Reset regions when org changes
                        allowedStores: [], // Reset stores when org changes
                      }); }
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableOrganizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                          {isGM && org.id === userProfile?.organizationId && ' (Your Organization)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {formData.organizationId && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Allowed Regions
                      {(() => {
                        const selectedRole = roles.find(r => r.id === formData.roleId);
                        const isRegionalManager = selectedRole?.name === 'regional_manager';
                        return isRegionalManager ? (
                          <span className="text-red-500 ml-1">*</span>
                        ) : (
                          <span className="text-muted-foreground"> (Optional)</span>
                        );
                      })()}
                    </label>
                    <MultiSelect
                      options={regions.map(r => ({ value: r.id, label: r.name }))}
                      value={formData.allowedRegions}
                      onChange={(value) => {
                        setFormData({
                          ...formData,
                          allowedRegions: value,
                          allowedStores: [], // Reset stores when regions change
                        });
                      }}
                      placeholder="Select regions (leave empty for all regions)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty for access to all regions
                    </p>
                  </div>

                  {formData.allowedRegions.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Allowed Stores
                        {(() => {
                          const selectedRole = roles.find(r => r.id === formData.roleId);
                          const isStoreManager = selectedRole?.name === 'store_manager';
                          return isStoreManager ? (
                            <span className="text-red-500 ml-1">*</span>
                          ) : (
                            <span className="text-muted-foreground"> (Optional)</span>
                          );
                        })()}
                      </label>
                      <MultiSelect
                        options={stores.map(s => ({ value: s.id, label: s.name }))}
                        value={formData.allowedStores}
                        onChange={(value) => {
                          setFormData({
                            ...formData,
                            allowedStores: value,
                          });
                        }}
                        placeholder={(() => {
                          const selectedRole = roles.find(r => r.id === formData.roleId);
                          const isStoreManager = selectedRole?.name === 'store_manager';
                          return isStoreManager
                            ? 'Select stores (required for store manager)'
                            : 'Select stores (leave empty for all stores in selected regions)';
                        })()}
                      />
                      <p className="text-xs text-muted-foreground">
                        {(() => {
                          const selectedRole = roles.find(r => r.id === formData.roleId);
                          const isStoreManager = selectedRole?.name === 'store_manager';
                          return isStoreManager
                            ? 'At least one store must be selected for store managers'
                            : 'Leave empty for access to all stores in selected regions';
                        })()}
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    { setFormData({ ...formData, isActive: e.target.checked }); }
                  }
                  className="rounded border-gray-300"
                />
                <label htmlFor="isActive" className="text-sm font-medium">
                  Active
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setDialogOpen(false); }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? 'Saving...'
                  : editingUser
                    ? 'Update User'
                    : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
