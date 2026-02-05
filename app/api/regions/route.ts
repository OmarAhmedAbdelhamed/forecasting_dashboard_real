import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth';
import { getUserRole } from '@/lib/get-user-role';
import { logCreate } from '@/lib/audit-log';
import { createClient } from '@/lib/supabase/server';
import { createRegionSchema } from '@/lib/validations/region';

// GET /api/regions - List all regions
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

    if (!roleConfig.allowedSections.includes('administration')) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to view regions' },
        { status: 403 },
      );
    }

    const supabase = await createClient();

    // Fetch regions (RLS will filter based on user role)
    const { data: regions, error } = await supabase
      .from('regions')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching regions:', error);
      return NextResponse.json({ error: 'Failed to fetch regions' }, { status: 500 });
    }

    return NextResponse.json(regions);
  } catch (error) {
    console.error('Error in regions GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/regions - Create new region (super_admin only)
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
    const validationResult = createRegionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 },
      );
    }

    const { name, organization_id, manager_ids } = validationResult.data;

    const supabase = await createClient();

    // Create region
    const { data: region, error } = await supabase
      .from('regions')
      .insert({ name, organization_id })
      .select()
      .single();

    if (error) {
      console.error('Error creating region:', error);
      return NextResponse.json({ error: 'Failed to create region' }, { status: 500 });
    }

    // Assign regional managers if provided
    if (manager_ids && manager_ids.length > 0) {
      await supabase.rpc('assign_regional_managers_to_region', {
        region_id_param: region.id,
        manager_ids: manager_ids,
      });
    }

    // Log audit
    await logCreate(user.id, 'region', region.id, { name, organization_id, manager_ids });

    // Fetch managers for response
    const { data: managers } = await supabase.rpc('get_regional_managers_for_region', {
      region_id_param: region.id,
    });

    return NextResponse.json(
      {
        ...region,
        managers: managers || [],
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error in regions POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
