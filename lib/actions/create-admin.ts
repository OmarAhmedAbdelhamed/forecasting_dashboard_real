'use server';

/**
 * Server Action to Create Super Admin User
 *
 * This bypasses the Supabase Auth API issues and creates the user
 * through direct database operations with proper password hashing.
 */

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

interface CreateAdminResult {
  success: boolean;
  message: string;
  error?: string;
  userId?: string;
  details?: {
    email: string;
    fullName: string;
    verification?: unknown;
  };
}

export async function createSuperAdminUser(
  email: string,
  password: string,
  fullName = 'Super Admin'
): Promise<CreateAdminResult> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        success: false,
        message: 'Configuration error',
        error: 'Missing Supabase URL or Anon Key',
      };
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Step 1: Check if user already exists
    const { data: existingUser, error: checkError } = await supabase.rpc('check_user_exists', {
      user_email: email,
    }).select();

    // For now, we'll proceed to try creating the user

    // Step 2: Try using the direct SQL approach through our custom function
    // We need to create a function that handles both auth.users and user_profiles
    const { data: createData, error: createError } = await supabase.rpc('create_user_direct', {
      user_email: email,
      user_password: password,
      user_full_name: fullName,
    });

    if (createError) {
      // If the function doesn't exist, provide helpful message
      if (createError.message.includes('function') && createError.message.includes('does not exist')) {
        return {
          success: false,
          message: 'Migration not applied',
          error: 'Please run migration 012 first. See docs/create-user-direct.sql',
        };
      }

      return {
        success: false,
        message: 'Failed to create user',
        error: createError.message,
      };
    }

    const createResult = createData as { success: boolean; user_id?: string; error?: string };

    if (!createResult.success) {
      return {
        success: false,
        message: 'User creation failed',
        error: createResult.error,
      };
    }

    // Step 3: Assign super admin role
    const { data: roleData, error: roleError } = await supabase.rpc('assign_super_admin_role', {
      user_email: email,
    });

    if (roleError) {
      return {
        success: false,
        message: 'User created but role assignment failed',
        error: roleError.message,
      };
    }

    const roleResult = roleData as { success: boolean; error?: string; user_id?: string; message?: string };

    if (!roleResult.success) {
      return {
        success: false,
        message: 'Role assignment failed',
        error: roleResult.error,
      };
    }

    // Step 4: Verify
    const { data: verifyData } = await supabase.rpc('get_user_verification', {
      user_email: email,
    });

    revalidatePath('/auth/login');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Super admin user created successfully',
      userId: roleResult.user_id,
      details: {
        email,
        fullName,
        verification: verifyData,
      },
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: 'Unexpected error',
      error: errorMessage,
    };
  }
}
