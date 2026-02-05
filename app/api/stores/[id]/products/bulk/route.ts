import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth';
import { getUserRole } from '@/lib/get-user-role';
import { logUpdate } from '@/lib/audit-log';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Validation schema for bulk product toggle
const bulkToggleSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1).max(100),
  enable: z.boolean(),
});

// POST /api/stores/[id]/products/bulk - Bulk enable/disable products for a store
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Use optimized getUserRole helper
    const { role, profile, error: roleError } = await getUserRole(user.id);

    if (roleError || !role || !profile) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check permissions - super_admin, general_manager, regional_manager can manage any store
    // Other roles can only manage stores in their allowed_stores
    const canManage =
      role === 'super_admin' ||
      role === 'general_manager' ||
      role === 'regional_manager' ||
      (profile.allowed_stores && profile.allowed_stores.includes(id));

    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = bulkToggleSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 },
      );
    }

    const { productIds, enable } = validationResult.data;

    const supabase = await createClient();

    const { data, error } = await supabase.rpc('bulk_toggle_store_products', {
      p_store_id: id,
      p_product_ids: productIds,
      p_enable: enable,
    });

    if (error) {
      console.error('Error bulk toggling products:', error);
      return NextResponse.json({ error: 'Failed to toggle products' }, { status: 500 });
    }

    // Log audit
    await logUpdate(user.id, 'store', id, {
      action: 'bulk_toggle_products',
      productIds,
      enable,
      count: data,
    });

    return NextResponse.json({ count: data });
  } catch (error) {
    console.error('Error in bulk products POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
