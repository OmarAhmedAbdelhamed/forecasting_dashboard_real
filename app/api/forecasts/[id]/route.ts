import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth';
import { getUserRole } from '@/lib/get-user-role';
import { logUpdate } from '@/lib/audit-log';
import { sanitizeDatabaseError } from '@/lib/sanitize-error';
import { createClient } from '@/lib/supabase/server';
import { updateForecastSchema } from '@/lib/validations/forecast';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/forecasts/[id] - Get single forecast estimate
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Get user role and profile
    const { role, roleConfig, profile, error: roleError } = await getUserRole(user.id);

    if (roleError || !role || !roleConfig || !profile) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check section access
    if (!roleConfig.allowedSections.includes('demand-forecasting')) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 },
      );
    }

    const supabase = await createClient();

    // Get forecast with product and store details
    const { data: forecast, error } = await supabase
      .from('forecast_estimates')
      .select(
        `
        *,
        product:products(id, name, category_id, is_active),
        store:stores(id, name, region_id)
      `,
      )
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Forecast not found' }, { status: 404 });
    }

    // IDOR prevention: Check if user can access this forecast's store
    if (
      !['super_admin', 'general_manager'].includes(role) &&
      profile.allowed_stores &&
      !profile.allowed_stores.includes(forecast.store_id)
    ) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to view this forecast' },
        { status: 403 },
      );
    }

    return NextResponse.json(forecast);
  } catch (error) {
    console.error('Error in forecast GET:', error);
    return NextResponse.json(
      { error: sanitizeDatabaseError(error, 'fetch forecast') },
      { status: 500 },
    );
  }
}

// PATCH /api/forecasts/[id] - Update forecast estimate
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Get user role and profile
    const { role, profile, error: roleError } = await getUserRole(user.id);

    if (roleError || !role || !profile) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only super_admin, general_manager, buyer, and inventory_planner can update
    const allowedRoles = ['super_admin', 'general_manager', 'buyer', 'inventory_planner'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions to update forecasts' },
        { status: 403 },
      );
    }

    const body = await request.json();

    // Validate input using Zod schema
    const validationResult = updateForecastSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Check if forecast exists and get store_id for permission check
    const { data: existingForecast, error: checkError } = await supabase
      .from('forecast_estimates')
      .select('id, store_id, product_id')
      .eq('id', id)
      .single();

    if (checkError || !existingForecast) {
      return NextResponse.json({ error: 'Forecast not found' }, { status: 404 });
    }

    // For buyers and inventory planners, check store access
    if (
      (role === 'buyer' || role === 'inventory_planner') &&
      profile.allowed_stores &&
      !profile.allowed_stores.includes(existingForecast.store_id)
    ) {
      return NextResponse.json(
        { error: 'You can only update forecasts for stores in your allowed list' },
        { status: 403 },
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    const validatedData = validationResult.data;

    if (validatedData.forecast_date !== undefined) {
      updateData.forecast_date = new Date(validatedData.forecast_date).toISOString();
    }
    if (validatedData.forecast_estimate_0 !== undefined) {
      updateData.forecast_estimate_0 = validatedData.forecast_estimate_0;
    }
    if (validatedData.forecast_estimate_1 !== undefined) {
      updateData.forecast_estimate_1 = validatedData.forecast_estimate_1;
    }
    if (validatedData.forecast_date_range !== undefined) {
      updateData.forecast_date_range = [
        new Date(validatedData.forecast_date_range.start),
        new Date(validatedData.forecast_date_range.end),
      ];
    }

    const { data: forecast, error } = await supabase
      .from('forecast_estimates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating forecast:', error);
      return NextResponse.json(
        { error: sanitizeDatabaseError(error, 'update forecast') },
        { status: 500 },
      );
    }

    // Log audit
    await logUpdate(user.id, 'forecast', id, { changes: updateData });

    return NextResponse.json(forecast);
  } catch (error) {
    console.error('Error in forecast PATCH:', error);
    return NextResponse.json(
      { error: sanitizeDatabaseError(error, 'update forecast') },
      { status: 500 },
    );
  }
}

// DELETE /api/forecasts/[id] - Delete forecast estimate
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Get user role and profile
    const { role, profile, error: roleError } = await getUserRole(user.id);

    if (roleError || !role || !profile) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only super_admin and general_manager can delete
    if (role !== 'super_admin' && role !== 'general_manager') {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions to delete forecasts' },
        { status: 403 },
      );
    }

    const supabase = await createClient();

    // Check if forecast exists
    const { data: forecast, error: checkError } = await supabase
      .from('forecast_estimates')
      .select('id, product_id, store_id, forecast_date')
      .eq('id', id)
      .single();

    if (checkError || !forecast) {
      return NextResponse.json({ error: 'Forecast not found' }, { status: 404 });
    }

    // For general_manager, check organization scope
    if (role === 'general_manager') {
      const { data: store } = await supabase
        .from('stores')
        .select('id, region:regions!inner(id, organization_id)')
        .eq('id', forecast.store_id)
        .single();

      if (store && ('region' in store) && Array.isArray(store.region) && store.region[0]?.organization_id !== profile.organization_id) {
        return NextResponse.json(
          { error: 'Forbidden - You can only delete forecasts in your organization' },
          { status: 403 },
        );
      }
    }

    const { error } = await supabase.from('forecast_estimates').delete().eq('id', id);

    if (error) {
      console.error('Error deleting forecast:', error);
      return NextResponse.json(
        { error: sanitizeDatabaseError(error, 'delete forecast') },
        { status: 500 },
      );
    }

    // Log audit
    await logUpdate(user.id, 'forecast', id, {
      action: 'delete',
      product_id: forecast.product_id,
      store_id: forecast.store_id,
      forecast_date: forecast.forecast_date,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in forecast DELETE:', error);
    return NextResponse.json(
      { error: sanitizeDatabaseError(error, 'delete forecast') },
      { status: 500 },
    );
  }
}
