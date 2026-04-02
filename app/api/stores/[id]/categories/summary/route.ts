import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerUser } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/stores/[id]/categories/summary - Get category product summary for a store
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const supabase = await createClient();

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
