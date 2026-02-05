import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth';
import { getUserRole } from '@/lib/get-user-role';
import { logUpdate } from '@/lib/audit-log';
import { createClient } from '@/lib/supabase/server';
import { enableAllProductsSchema } from '@/lib/validations/store';

interface RouteContext {
  params: Promise<{ id: string; categoryId: string }>;
}

// POST /api/stores/[id]/categories/[categoryId]/enable-all-products - Enable all products in a category for a store
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, categoryId } = await context.params;

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
    const validationResult = enableAllProductsSchema.safeParse({ category_id: categoryId, ...body });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc('enable_category_products', {
      p_store_id: id,
      p_category_id: categoryId,
    });

    if (error) {
      console.error('Error enabling category products:', error);
      return NextResponse.json({ error: 'Failed to enable products' }, { status: 500 });
    }

    // Log audit
    await logUpdate(user.id, 'store', id, {
      action: 'enable_category_products',
      category_id: categoryId,
      count: data,
    });

    return NextResponse.json({ enabledCount: data });
  } catch (error) {
    console.error('Error in enable-all-products POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
