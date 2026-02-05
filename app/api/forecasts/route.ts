import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth';
import { getUserRole } from '@/lib/get-user-role';
import { logCreate } from '@/lib/audit-log';
import { createClient } from '@/lib/supabase/server';
import { createForecastSchema, forecastQuerySchema } from '@/lib/validations/forecast';
import type { ForecastQueryInput } from '@/lib/validations/forecast';

// GET /api/forecasts - List all forecasts with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role and profile
    const { role, roleConfig, profile, error: roleError } = await getUserRole(user.id);

    if (roleError || !role || !roleConfig || !profile) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check permissions: users with demand-forecasting section access
    if (!roleConfig.allowedSections.includes('demand-forecasting')) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to view forecasts' },
        { status: 403 },
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams: ForecastQueryInput = {
      product_id: searchParams.get('product_id') || undefined,
      store_id: searchParams.get('store_id') || undefined,
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
      sort_field: (searchParams.get('sort_field') as any) || 'forecast_date',
      sort_order: (searchParams.get('sort_order') as any) || 'desc',
    };

    // Validate query parameters
    const validatedQuery = forecastQuerySchema.safeParse(queryParams);
    if (!validatedQuery.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validatedQuery.error.errors },
        { status: 400 },
      );
    }

    const { product_id, store_id, start_date, end_date, limit, offset, sort_field, sort_order } =
      validatedQuery.data;

    const supabase = await createClient();

    // Build query with filters
    let query = supabase
      .from('forecast_estimates')
      .select(
        `
        *,
        product:products(id, name, category_id, is_active),
        store:stores(id, name, region_id)
      `,
        { count: 'exact' },
      );

    // Apply filters
    if (product_id) {
      query = query.eq('product_id', product_id);
    }
    if (store_id) {
      query = query.eq('store_id', store_id);
    }
    if (start_date) {
      query = query.gte('forecast_date', start_date);
    }
    if (end_date) {
      query = query.lte('forecast_date', end_date);
    }

    // Apply sorting
    query = query.order(sort_field, { ascending: sort_order === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: forecasts, error, count } = await query;

    if (error) {
      console.error('Error fetching forecasts:', error);
      return NextResponse.json({ error: 'Failed to fetch forecasts' }, { status: 500 });
    }

    return NextResponse.json({
      data: forecasts || [],
      count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error in forecasts GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/forecasts - Create new forecast estimate
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role and profile
    const { role, profile, error: roleError } = await getUserRole(user.id);

    if (roleError || !role || !profile) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check permissions: super_admin, general_manager, buyer, and inventory_planner can create
    const allowedRoles = ['super_admin', 'general_manager', 'buyer', 'inventory_planner'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions to create forecasts' },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createForecastSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 },
      );
    }

    const { product_id, store_id, forecast_date, forecast_estimate_0, forecast_estimate_1, forecast_date_range } =
      validationResult.data;

    // For buyers and inventory planners, check store access
    if (role === 'buyer' || role === 'inventory_planner') {
      if (profile.allowed_stores && !profile.allowed_stores.includes(store_id)) {
        return NextResponse.json(
          { error: 'You can only create forecasts for stores in your allowed list' },
          { status: 403 },
        );
      }
    }

    const supabase = await createClient();

    // Verify product exists
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, is_active')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (!product.is_active) {
      return NextResponse.json({ error: 'Cannot create forecast for inactive product' }, { status: 400 });
    }

    // Verify store exists
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, is_active')
      .eq('id', store_id)
      .single();

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    if (!store.is_active) {
      return NextResponse.json({ error: 'Cannot create forecast for inactive store' }, { status: 400 });
    }

    // Insert forecast estimate
    const dateRangeArray = [new Date(forecast_date_range.start), new Date(forecast_date_range.end)];

    const { data: forecast, error } = await supabase
      .from('forecast_estimates')
      .insert({
        product_id,
        store_id,
        forecast_date: new Date(forecast_date).toISOString(),
        forecast_estimate_0,
        forecast_estimate_1,
        forecast_date_range: dateRangeArray,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating forecast:', error);
      // Check for unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A forecast for this product, store, and date already exists' },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: 'Failed to create forecast' }, { status: 500 });
    }

    // Log audit
    await logCreate(user.id, 'forecast', forecast.id, {
      product_id,
      store_id,
      forecast_date,
    });

    return NextResponse.json(forecast, { status: 201 });
  } catch (error) {
    console.error('Error in forecasts POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
