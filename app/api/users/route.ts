import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerUser } from '@/lib/auth';
import { sanitizeILikeSearch } from '@/lib/sanitize';
import { ROLE_CONFIGS } from '@/types/permissions';
import type { UserRole } from '@/types/auth';

/**
 * GET /api/users - List users with filters
 *
 * RBAC stripped - all authenticated users can list users
 */
export async function GET(request: NextRequest) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // RBAC stripped - all authenticated users can manage users
  const roleConfig = ROLE_CONFIGS['super_admin'];
  if (!roleConfig) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  const supabase = await createClient();

  let query = supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (status === 'active') {
    query = query.eq('is_active', true);
  } else if (status === 'inactive') {
    query = query.eq('is_active', false);
  }

  if (search) {
    const sanitizedSearch = sanitizeILikeSearch(search);
    query = query.ilike('full_name', `%${sanitizedSearch}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 400 });
  }

  return NextResponse.json({ data });
}
