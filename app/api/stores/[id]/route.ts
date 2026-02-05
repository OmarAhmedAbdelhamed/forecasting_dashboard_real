import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth';
import { getUserRole } from '@/lib/get-user-role';
import { logUpdate } from '@/lib/audit-log';
import { createClient } from '@/lib/supabase/server';
import { updateStoreSchema } from '@/lib/validations/store';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/stores/[id] - Get store details
export async function GET(_request: NextRequest, context: RouteContext) {
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

    // Check section access
    if (role !== 'super_admin' && role !== 'general_manager' && role !== 'regional_manager' && role !== 'store_manager') {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 },
      );
    }

    const supabase = await createClient();

    const { data: store, error } = await supabase
      .from('stores')
      .select('*, region:regions(*)')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // IDOR prevention: Store managers can only view their assigned stores
    if (role === 'store_manager' && profile.allowed_stores) {
      if (!profile.allowed_stores.includes(id)) {
        return NextResponse.json(
          { error: 'Forbidden - Store not in your assigned stores' },
          { status: 403 },
        );
      }
    }

    // IDOR prevention: Regional managers can only view stores in their allowed regions
    if (role === 'regional_manager' && profile.allowed_regions) {
      if (!profile.allowed_regions.includes(store.region_id)) {
        return NextResponse.json(
          { error: 'Forbidden - Store not in your assigned regions' },
          { status: 403 },
        );
      }
    }

    return NextResponse.json(store);
  } catch (error) {
    console.error('Error in store GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/stores/[id] - Update store
export async function PATCH(request: NextRequest, context: RouteContext) {
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

    // Only super_admin and general_manager can update stores
    if (role !== 'super_admin' && role !== 'general_manager') {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();

    // Validate input using Zod schema
    const validationResult = updateStoreSchema.safeParse({ id, ...body });
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 },
      );
    }

    const { id: _id, manager_id, manager_ids, ...updateData } = validationResult.data;

    const supabase = await createClient();

    // For general managers, verify store is in their allowed regions
    if (role === 'general_manager' && profile.allowed_regions) {
      const { data: store } = await supabase
        .from('stores')
        .select('region_id')
        .eq('id', id)
        .single();

      if (store && !profile.allowed_regions.includes(store.region_id)) {
        return NextResponse.json(
          { error: 'Forbidden - Store not in your assigned regions' },
          { status: 403 },
        );
      }
    }

    // Handle multiple manager assignments (new feature)
    if (manager_ids !== undefined) {
      const { error: managerError } = await supabase.rpc('assign_store_managers_to_store', {
        store_id_param: id,
        manager_ids: manager_ids || null,
      });

      if (managerError) {
        console.error('Error assigning managers:', managerError);
        return NextResponse.json({ error: 'Failed to assign managers' }, { status: 500 });
      }
    }
    // Handle single manager assignment (legacy, for backward compatibility)
    else if (manager_id !== undefined) {
      const { error: managerError } = await supabase.rpc('assign_store_manager_to_store', {
        p_store_id: id,
        p_manager_id: manager_id || null,
      });

      if (managerError) {
        console.error('Error assigning manager:', managerError);
        return NextResponse.json({ error: 'Failed to assign manager' }, { status: 500 });
      }
    }

    const { data: store, error } = await supabase
      .from('stores')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating store:', error);
      return NextResponse.json({ error: 'Failed to update store' }, { status: 500 });
    }

    // Log audit
    await logUpdate(user.id, 'store', id, { changes: updateData });

    return NextResponse.json(store);
  } catch (error) {
    console.error('Error in store PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/stores/[id] - Delete store (super_admin only)
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Use optimized getUserRole helper
    const { role, error: roleError } = await getUserRole(user.id);

    if (roleError || role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createClient();

    // Check if store exists
    const { data: store, error: checkError } = await supabase
      .from('stores')
      .select('id, name')
      .eq('id', id)
      .single();

    if (checkError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const { error } = await supabase.from('stores').delete().eq('id', id);

    if (error) {
      console.error('Error deleting store:', error);
      return NextResponse.json({ error: 'Failed to delete store' }, { status: 500 });
    }

    // Log audit
    await logUpdate(user.id, 'store', id, { action: 'delete', storeName: store.name });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in store DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
