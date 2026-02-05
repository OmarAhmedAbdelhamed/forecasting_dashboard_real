import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth';
import { getUserRole } from '@/lib/get-user-role';
import { logCreate } from '@/lib/audit-log';
import { createClient } from '@/lib/supabase/server';
import { createStoreSchema } from '@/lib/validations/store';

// GET /api/stores - List all stores with region info
export async function GET(_request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use optimized getUserRole helper
    const { role, roleConfig, error: roleError } = await getUserRole(user.id);

    if (roleError || !role || !roleConfig) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if user has permission to view stores
    if (!roleConfig.allowedSections.includes('administration')) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to view stores' },
        { status: 403 },
      );
    }

    const supabase = await createClient();

    // Fetch stores with region join
    const { data: stores, error } = await supabase
      .from('stores')
      .select('*, regions(id, name)')
      .order('name');

    if (error) {
      console.error('Error fetching stores:', error);
      return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
    }

    return NextResponse.json(stores);
  } catch (error) {
    console.error('Error in stores GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/stores - Create new store (super_admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use optimized getUserRole helper - super_admin only
    const { role, error: roleError } = await getUserRole(user.id);

    if (roleError || role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Super admin only' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();

    // Validate input using Zod schema
    const validationResult = createStoreSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 },
      );
    }

    const { name, region_id, manager_id, manager_ids } = validationResult.data;

    const supabase = await createClient();

    const { data: store, error } = await supabase
      .from('stores')
      .insert({ name, region_id })
      .select()
      .single();

    if (error) {
      console.error('Error creating store:', error);
      return NextResponse.json({ error: 'Failed to create store' }, { status: 500 });
    }

    // Assign multiple managers if provided (new feature)
    if (manager_ids && manager_ids.length > 0) {
      const { error: managerError } = await supabase.rpc('assign_store_managers_to_store', {
        store_id_param: store.id,
        manager_ids: manager_ids,
      });

      if (managerError) {
        console.error('Error assigning managers:', managerError);

        // CRITICAL: Rollback store creation to maintain data consistency
        const { error: deleteError } = await supabase
          .from('stores')
          .delete()
          .eq('id', store.id);

        if (deleteError) {
          console.error('CRITICAL: Failed to rollback store creation after manager assignment failure:', {
            storeId: store.id,
            managerError: managerError.message,
            deleteError: deleteError.message,
          });

          // Store is orphaned in database - alert admins
          return NextResponse.json(
            {
              error: 'Failed to assign managers to store',
              details: 'Store creation failed. Please contact support with the store ID for cleanup.',
              storeId: store.id,
              managerError: managerError.message,
            },
            { status: 500 },
          );
        }

        // Rollback successful - return manager assignment error
        return NextResponse.json(
          {
            error: 'Failed to assign managers to store',
            details: 'Store creation was rolled back. Please verify manager IDs and try again.',
            managerError: managerError.message,
          },
          { status: 500 },
        );
      }
    }
    // Assign single manager if provided (legacy, for backward compatibility)
    else if (manager_id) {
      const { error: managerError } = await supabase.rpc('assign_store_manager_to_store', {
        p_store_id: store.id,
        p_manager_id: manager_id,
      });

      if (managerError) {
        console.error('Error assigning manager:', managerError);

        // CRITICAL: Rollback store creation to maintain data consistency
        const { error: deleteError } = await supabase
          .from('stores')
          .delete()
          .eq('id', store.id);

        if (deleteError) {
          console.error('CRITICAL: Failed to rollback store creation after manager assignment failure:', {
            storeId: store.id,
            managerError: managerError.message,
            deleteError: deleteError.message,
          });

          // Store is orphaned in database - alert admins
          return NextResponse.json(
            {
              error: 'Failed to assign manager to store',
              details: 'Store creation failed. Please contact support with the store ID for cleanup.',
              storeId: store.id,
              managerError: managerError.message,
            },
            { status: 500 },
          );
        }

        // Rollback successful - return manager assignment error
        return NextResponse.json(
          {
            error: 'Failed to assign manager to store',
            details: 'Store creation was rolled back. Please verify manager ID and try again.',
            managerError: managerError.message,
          },
          { status: 500 },
        );
      }
    }

    // Log audit
    await logCreate(user.id, 'store', store.id, { name, region_id, manager_ids });

    // Fetch store with manager info
    const { data: storeWithManager, error: fetchError } = await supabase
      .from('stores')
      .select('*, regions(*)')
      .eq('id', store.id)
      .single();

    if (fetchError) {
      console.error('Error fetching store with manager:', fetchError);
      return NextResponse.json(store, { status: 201 });
    }

    return NextResponse.json(storeWithManager, { status: 201 });
  } catch (error) {
    console.error('Error in stores POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
