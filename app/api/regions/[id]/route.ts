import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth';
import { getUserRole } from '@/lib/get-user-role';
import { logUpdate } from '@/lib/audit-log';
import { createClient } from '@/lib/supabase/server';
import { updateRegionSchema } from '@/lib/validations/region';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/regions/[id] - Get region details with managers
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
    if (role !== 'super_admin' && role !== 'general_manager' && role !== 'regional_manager') {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 },
      );
    }

    const supabase = await createClient();

    const { data: region, error } = await supabase
      .from('regions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Region not found' }, { status: 404 });
    }

    // IDOR prevention: Regional managers can only view their assigned regions
    if (role === 'regional_manager' && profile.allowed_regions) {
      if (!profile.allowed_regions.includes(id)) {
        return NextResponse.json(
          { error: 'Forbidden - Region not in your assigned regions' },
          { status: 403 },
        );
      }
    }

    // Get regional managers for this region
    const { data: managers } = await supabase.rpc('get_regional_managers_for_region', {
      region_id_param: id
    });

    return NextResponse.json({
      ...region,
      managers: managers || []
    });
  } catch (error) {
    console.error('Error in region GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/regions/[id] - Update region
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

    // Only super_admin and general_manager can update regions
    if (role !== 'super_admin' && role !== 'general_manager') {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();

    // Validate input using Zod schema
    const validationResult = updateRegionSchema.safeParse({ id, ...body });
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 },
      );
    }

    const { id: _id, manager_ids, ...updateData } = validationResult.data;

    const supabase = await createClient();

    // For general managers, verify region is in their allowed regions
    if (role === 'general_manager' && profile.allowed_regions) {
      if (!profile.allowed_regions.includes(id)) {
        return NextResponse.json(
          { error: 'Forbidden - Region not in your assigned regions' },
          { status: 403 },
        );
      }
    }

    const { data: region, error } = await supabase
      .from('regions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating region:', error);
      return NextResponse.json({ error: 'Failed to update region' }, { status: 500 });
    }

    // Update regional managers if provided
    if (manager_ids !== undefined) {
      await supabase.rpc('assign_regional_managers_to_region', {
        region_id_param: id,
        manager_ids: manager_ids || []
      });
    }

    // Fetch updated managers
    const { data: managers } = await supabase.rpc('get_regional_managers_for_region', {
      region_id_param: id
    });

    // Log audit
    await logUpdate(user.id, 'region', id, { changes: updateData });

    return NextResponse.json({
      ...region,
      managers: managers || []
    });
  } catch (error) {
    console.error('Error in region PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/regions/[id] - Delete region (super_admin only)
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

    // Check if region exists
    const { data: region, error: checkError } = await supabase
      .from('regions')
      .select('id, name')
      .eq('id', id)
      .single();

    if (checkError || !region) {
      return NextResponse.json({ error: 'Region not found' }, { status: 404 });
    }

    const { error } = await supabase.from('regions').delete().eq('id', id);

    if (error) {
      console.error('Error deleting region:', error);
      return NextResponse.json({ error: 'Failed to delete region' }, { status: 500 });
    }

    // Log audit
    await logUpdate(user.id, 'region', id, { action: 'delete', regionName: region.name });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in region DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
