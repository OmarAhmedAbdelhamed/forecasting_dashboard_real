import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { ROLE_CONFIGS } from '@/types/permissions';
import type { UserRole } from '@/types/auth';
import { createUserSchema } from '@/lib/validations/user';
import { z } from 'zod';

/**
 * POST /api/users/create
 * Creates a new user with profile
 *
 * SECURITY: Requires user-management permission
 * - Super Admin: Can create users for any organization
 * - GM: Can create users only for their organization (with restrictions)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's profile
    const { data: currentProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*, role:roles(*)')
      .eq('id', authUser.id)
      .single();

    if (profileError || !currentProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 403 },
      );
    }

    const currentRole = currentProfile.role?.name as UserRole;

    // SECURITY: Check if user has permission to manage users using ROLE_CONFIGS
    const roleConfig = ROLE_CONFIGS[currentRole];
    if (!roleConfig?.allowedSections.includes('user-management')) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to manage users' },
        { status: 403 },
      );
    }

    // Parse and validate request body using Zod schema
    const body = await request.json();

    let validated;
    try {
      validated = await createUserSchema.parseAsync(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message
            }))
          },
          { status: 400 },
        );
      }
      throw error;
    }

    const {
      email,
      password,
      full_name,
      role_id,
      organization_id,
      allowed_regions,
      allowed_stores,
      allowed_categories,
      is_active,
    } = validated;

    // Get the role being assigned
    const { data: newRole, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', role_id)
      .single();

    if (roleError || !newRole) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // SECURITY: Apply data scope filtering based on role
    if (currentRole === 'general_manager') {
      // GMs can only create users for their own organization
      if (organization_id !== currentProfile.organization_id) {
        return NextResponse.json(
          {
            error: 'General Managers can only create users for their own organization',
            details: {
              attempted_organization: organization_id,
              your_organization: currentProfile.organization_id,
              hint: 'Your organization is locked because you are a General Manager'
            }
          },
          { status: 403 },
        );
      }

      // GMs cannot create Super Admins (level 0) or other GMs (level 1)
      if (newRole.level <= 1) {
        return NextResponse.json(
          {
            error: 'General Managers cannot create Super Admin or GM roles',
            details: {
              attempted_role: newRole.name,
              attempted_role_level: newRole.level,
              your_role: currentRole,
              hint: 'GMs can only create roles with level > 1 (buyer, inventory_planner, etc.)'
            }
          },
          { status: 403 },
        );
      }

      // GMs can only assign regions within their allowed regions
      if (allowed_regions.length > 0) {
        const hasRegionAccess = allowed_regions.every((r: string) =>
          currentProfile.allowed_regions.includes(r)
        );

        if (!hasRegionAccess) {
          return NextResponse.json(
            {
              error: 'General Managers can only assign regions they have access to',
              details: {
                attempted_regions: allowed_regions,
                your_regions: currentProfile.allowed_regions,
                hint: 'You can only assign regions that are in your own allowed_regions list'
              }
            },
            { status: 403 },
          );
        }
      }
    }

    // Super Admins: No organization restrictions (can create for any org)
    if (currentRole === 'super_admin') {
      // Can create any role for any organization
      // No validation needed - Super Admin has full access
    }

    // Create user in auth.users using admin API
    const supabaseAdmin = createAdminClient();
    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
        },
      });

    if (createError || !newUser) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        { error: createError?.message || 'Failed to create user' },
        { status: 500 },
      );
    }

    // Create user profile
    const { data: profile, error: profileCreateError } = await supabase
      .from('user_profiles')
      .insert({
        id: newUser.user.id,
        full_name,
        email,
        role_id,
        organization_id,
        allowed_regions,
        allowed_stores,
        allowed_categories,
        is_active,
      })
      .select('*, role:roles(*), organization:organizations(*)')
      .single();

    if (profileCreateError) {
      // Rollback: delete the auth user if profile creation fails
      // Use retry logic to handle temporary failures
      let rollbackSuccess = false;
      let retryAttempt = 0;
      const maxRetries = 3;

      while (!rollbackSuccess && retryAttempt < maxRetries) {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        if (!deleteError) {
          rollbackSuccess = true;
        } else {
          retryAttempt++;
          if (retryAttempt < maxRetries) {
            // Wait with exponential backoff: 100ms, 200ms, 400ms
            await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retryAttempt - 1)));
          } else {
            // Log critical failure - auth user orphaned
            console.error('CRITICAL: Failed to rollback auth user after profile creation failure:', {
              userId: newUser.user.id,
              email,
              deleteError: deleteError.message,
              profileError: profileCreateError.message,
            });
          }
        }
      }

      console.error('Error creating profile:', profileCreateError);
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 },
      );
    }

    // Log audit trail
    await supabase.from('audit_logs').insert({
      user_id: authUser.id,
      action: 'create_user',
      resource: 'user_profiles',
      details: {
        created_user_id: newUser.user.id,
        created_user_email: email,
        organization_id,
        role_id,
        created_by_role: currentRole,
      },
    });

    return NextResponse.json({
      success: true,
      user: profile,
    });
  } catch (error) {
    console.error('Unexpected error in user creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
