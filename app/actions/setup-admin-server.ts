'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { getServerUserWithResult } from '@/lib/auth';
import { logAudit } from '@/lib/audit-log';

interface SetupAdminResult {
  success: boolean;
  message: string;
  error?: string;
}

export async function setupAdminUser(formData: FormData): Promise<SetupAdminResult> {
  // Extract email early for error logging
  const email = formData.get('email') as string;

  // CRITICAL: Check authentication first - only existing super_admins can create new admins
  const authResult = await getServerUserWithResult();
  if (!authResult.user) {
    // Return appropriate error based on error type
    if (authResult.error === 'network' || authResult.error === 'database') {
      return {
        success: false,
        message: '',
        error: 'Service temporarily unavailable. Please try again.',
      };
    }
    return {
      success: false,
      message: '',
      error: 'Unauthorized - You must be logged in to create admin users',
    };
  }

  const authUser = authResult.user;

  // Create a regular client to check the user's role
  const supabase = await createClient();

  // Check if user is already a super_admin
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role:roles(*)')
    .eq('id', authUser.id)
    .single();

  if (profileError || !profile) {
    // Log failed attempt
    await logAudit({
      user_id: authUser.id,
      action: 'create',
      resource: 'user',
      details: { attempted_action: 'setup_admin_user', email },
      success: false,
      error_message: profileError?.message || 'User profile not found',
    });

    return {
      success: false,
      message: '',
      error: 'Forbidden - Unable to verify your permissions',
    };
  }

  const userRole = profile.role?.name;

  if (!userRole || userRole !== 'super_admin') {
    // Log unauthorized attempt
    await logAudit({
      user_id: authUser.id,
      action: 'create',
      resource: 'user',
      details: { attempted_action: 'setup_admin_user', email: formData.get('email'), user_role: userRole },
      success: false,
      error_message: 'Unauthorized - User is not a super_admin',
    });

    return {
      success: false,
      message: '',
      error: 'Forbidden - Only super admins can create admin users',
    };
  }

  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;

  if (!email || !password || !fullName) {
    return {
      success: false,
      message: '',
      error: 'All fields are required',
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ACCESS_TOKEN;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      success: false,
      message: '',
      error: 'Server configuration error',
    };
  }

  try {
    // Create admin client with service role
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create user with auto-confirm
    const { data, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
      app_metadata: {
        role: 'super_admin',
      },
    });

    if (createError) {
      if (createError.message.includes('already exists')) {
        return {
          success: false,
          message: '',
          error: 'User already exists. Please delete the existing user first.',
        };
      }
      return {
        success: false,
        message: '',
        error: createError.message,
      };
    }

    // Assign super admin role
    const { data: roleData, error: roleError } = await supabase.rpc('assign_super_admin_role', {
      user_email: email,
    });

    if (roleError) {
      // Log role assignment failure
      await logAudit({
        user_id: authUser.id,
        action: 'create',
        resource: 'user',
        details: {
          email,
          userId: data.user?.id,
          attempted_action: 'assign_super_admin_role',
        },
        success: false,
        error_message: roleError.message,
      });

      return {
        success: false,
        message: 'User created but role assignment failed',
        error: roleError.message,
      };
    }

    const roleResult = roleData as { success: boolean; error?: string; message?: string };

    if (!roleResult.success) {
      return {
        success: false,
        message: '',
        error: roleResult.error,
      };
    }

    revalidatePath('/auth/login');
    revalidatePath('/dashboard');

    // Log successful admin user creation
    await logAudit({
      user_id: authUser.id,
      action: 'create',
      resource: 'user',
      resource_id: data.user?.id,
      details: {
        email,
        full_name: fullName,
        role: 'super_admin',
      },
      success: true,
    });

    return {
      success: true,
      message: `Admin user "${email}" created successfully! You can now login.`,
    };

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';

    // Log unexpected errors
    if (authUser) {
      await logAudit({
        user_id: authUser.id,
        action: 'create',
        resource: 'user',
        details: { attempted_action: 'setup_admin_user', email },
        success: false,
        error_message: message,
      }).catch((err) => {
        // Never throw in audit logging
        console.error('[SETUP_ADMIN] Failed to log error:', err);
      });
    }

    return {
      success: false,
      message: '',
      error: message,
    };
  }
}
