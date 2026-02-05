import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerUser } from '@/lib/auth';
import { getUserRole } from '@/lib/get-user-role';
import { logUpdate } from '@/lib/audit-log';
import { ROLE_CONFIGS } from '@/types/permissions';
import type { UserRole } from '@/types/auth';

// GET /api/users/[id] - Get single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { id } = await params;

  // SECURITY: Users can view their own profile without special permission
  const isOwnProfile = id === user.id;

  // Use optimized getUserRole helper
  const { role, roleConfig, error: roleError } = await getUserRole(user.id);

  if (roleError || !role || !roleConfig) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Check permission: viewing own profile OR has user-management access
  if (!isOwnProfile && !roleConfig.allowedSections.includes('user-management')) {
    return NextResponse.json(
      { error: 'Forbidden - You do not have permission to view user data' },
      { status: 403 },
    );
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select(
      `
      *,
      roles (*)
    `,
    )
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

// PATCH /api/users/[id] - Update user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json();
  const {
    full_name,
    role_id,
    organization_id,
    allowed_regions,
    allowed_stores,
    allowed_categories,
    is_active,
  } = body;

  // Prevent self-deactivation
  if (id === user.id && is_active === false) {
    return NextResponse.json(
      { error: 'Cannot deactivate your own account' },
      { status: 400 },
    );
  }

  // Use optimized getUserRole helper for current user
  const { role: currentRole, profile: currentProfile, error: roleError } = await getUserRole(user.id);

  if (roleError || !currentRole || !currentProfile) {
    return NextResponse.json(
      { error: 'User profile not found' },
      { status: 403 },
    );
  }

  // Get target user's profile
  const { data: targetProfile, error: targetError } = await supabase
    .from('user_profiles')
    .select('*, role:roles(*)')
    .eq('id', id)
    .single();

  if (targetError || !targetProfile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Authorization checks for GMs
  const isSuperAdmin = currentRole === 'super_admin';
  const isGM = currentRole === 'general_manager';

  if (isGM) {
    // GMs can only update users in their organization
    if (targetProfile.organization_id !== currentProfile.organization_id) {
      return NextResponse.json(
        {
          error:
            'General Managers can only update users in their own organization',
        },
        { status: 403 },
      );
    }

    // If changing role, validate it
    if (role_id && role_id !== targetProfile.role_id) {
      const { data: newRole, error: roleError } = await supabase
        .from('roles')
        .select('*')
        .eq('id', role_id)
        .single();

      if (roleError || !newRole) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }

      // GMs cannot assign Super Admin (level 0) or GM (level 1) roles
      if (newRole.level <= 1) {
        return NextResponse.json(
          { error: 'General Managers cannot assign Super Admin or GM roles' },
          { status: 403 },
        );
      }
    }

    // GMs cannot change organization
    if (organization_id && organization_id !== targetProfile.organization_id) {
      return NextResponse.json(
        {
          error:
            'General Managers cannot move users to different organizations',
        },
        { status: 403 },
      );
    }
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      full_name,
      role_id,
      organization_id: isSuperAdmin ? organization_id : undefined, // Only Super Admin can change org
      allowed_regions,
      allowed_stores,
      allowed_categories,
      is_active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 400 });
  }

  // Log audit using helper
  await logUpdate(user.id, 'user', id, { changes: body });

  return NextResponse.json({ data });
}

// DELETE /api/users/[id] - Deactivate user (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { id } = await params;

  // Prevent self-deactivation
  if (id === user.id) {
    return NextResponse.json(
      { error: 'Cannot deactivate your own account' },
      { status: 400 },
    );
  }

  // Use optimized getUserRole helper for current user
  const { role: currentRole, profile: currentProfile, error: roleError } = await getUserRole(user.id);

  if (roleError || !currentRole || !currentProfile) {
    return NextResponse.json(
      { error: 'User profile not found' },
      { status: 403 },
    );
  }

  // Get target user's profile
  const { data: targetProfile, error: targetError } = await supabase
    .from('user_profiles')
    .select('*, role:roles(*)')
    .eq('id', id)
    .single();

  if (targetError || !targetProfile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Authorization checks for GMs
  const isGM = currentRole === 'general_manager';

  if (isGM) {
    // GMs can only deactivate users in their organization
    if (targetProfile.organization_id !== currentProfile.organization_id) {
      return NextResponse.json(
        {
          error:
            'General Managers can only deactivate users in their own organization',
        },
        { status: 403 },
      );
    }

    // GMs cannot deactivate Super Admins or other GMs
    if (targetProfile.role && targetProfile.role.level <= 1) {
      return NextResponse.json(
        {
          error: 'General Managers cannot deactivate Super Admins or other GMs',
        },
        { status: 403 },
      );
    }
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to deactivate user' }, { status: 400 });
  }

  // Log audit using helper
  await logUpdate(user.id, 'user', id, { action: 'deactivate' });

  return NextResponse.json({ data });
}
