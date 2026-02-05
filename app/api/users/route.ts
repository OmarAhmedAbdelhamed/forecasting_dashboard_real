import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerUser } from '@/lib/auth';
import { getUserRole } from '@/lib/get-user-role';
import { sanitizeILikeSearch } from '@/lib/sanitize';

/**
 * GET /api/users - List users with filters
 *
 * SECURITY: Requires user-management permission
 * - Only users with user-management section access can list users
 * - Super Admin: Can see all users
 * - General Manager: Can see users in their regions (filtered by RLS)
 * - Other roles: Forbidden (403)
 */
export async function GET(_request: NextRequest) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use optimized getUserRole helper
  const { role, roleConfig, error: roleError } = await getUserRole(user.id);

  if (roleError || !role || !roleConfig) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 },
    );
  }

  // SECURITY: Check if user has permission to manage users
  if (!roleConfig.allowedSections.includes('user-management')) {
    return NextResponse.json(
      { error: 'Forbidden - You do not have permission to list users' },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const roleFilter = searchParams.get('role');
  const region = searchParams.get('region');
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  const supabase = await createClient();

  let query = supabase
    .from('user_profiles')
    .select(`
      *,
      roles (*)
    `)
    .order('created_at', { ascending: false });

  if (roleFilter) {
    query = query.eq('roles.name', roleFilter);
  }

  if (status === 'active') {
    query = query.eq('is_active', true);
  } else if (status === 'inactive') {
    query = query.eq('is_active', false);
  }

  // SECURITY: Sanitize search input to prevent SQL injection via wildcards
  if (search) {
    const sanitizedSearch = sanitizeILikeSearch(search);
    query = query.or(`full_name.ilike.%${sanitizedSearch}%,email.ilike.%${sanitizedSearch}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 400 });
  }

  return NextResponse.json({ data });
}
