import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/stores/[id]/categories/summary - Get category product summary for a store
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const supabase = await createClient();

    // Check if user has permission to view this store
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('allowed_stores, role_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { data: role } = await supabase
      .from('roles')
      .select('name')
      .eq('id', profile.role_id)
      .single();

    // Check permissions
    const canView = role?.name === 'super_admin' ||
                     role?.name === 'general_manager' ||
                     role?.name === 'regional_manager' ||
                     (profile.allowed_stores?.includes(id));

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabase.rpc('get_store_category_product_summary', {
      p_store_id: id,
    });

    if (error) {
      console.error('Error fetching category summary:', error);
      return NextResponse.json({ error: 'Failed to fetch category summary' }, { status: 500 });
    }

    return NextResponse.json({ summary: data });
  } catch (error) {
    console.error('Error in category summary GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
