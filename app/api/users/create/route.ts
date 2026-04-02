import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Simple validation schema for user creation
const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(1, 'Full name is required'),
  is_active: z.boolean().default(true),
});

/**
 * POST /api/users/create
 * Creates a new user with profile
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

    // Get current user's profile - only select real columns
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, full_name, is_active')
      .eq('user_id', authUser.id)
      .single();

    if (profileError || !currentProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
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

    const { email, password, full_name, is_active } = validated;

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

    // Create user profile - only insert real columns
    const { data: profile, error: profileCreateError } = await supabase
      .from('profiles')
      .insert({
        user_id: newUser.user.id,
        full_name,
        is_active,
      })
      .select('user_id, full_name, is_active')
      .single();

    if (profileCreateError) {
      // Rollback: delete the auth user if profile creation fails
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
            await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retryAttempt - 1)));
          } else {
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
        created_by: currentProfile.full_name,
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
