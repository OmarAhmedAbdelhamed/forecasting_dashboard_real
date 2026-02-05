import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth';
import { getUserRole } from '@/lib/get-user-role';
import { logCreate } from '@/lib/audit-log';
import { createClient } from '@/lib/supabase/server';
import { createProductSchema } from '@/lib/validations/product';

// GET /api/products - List all products with category join
export async function GET(_request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use optimized getUserRole helper
    const { role, roleConfig, profile, error: roleError } = await getUserRole(user.id);

    if (roleError || !role || !roleConfig || !profile) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!roleConfig.allowedSections.includes('administration')) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to view products' },
        { status: 403 },
      );
    }

    const supabase = await createClient();

    // Fetch products with category - RLS will filter based on allowed_categories for buyers
    const { data: products, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .order('name');

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    return NextResponse.json(products || []);
  } catch (error) {
    console.error('Error in products GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/products - Create new product (super_admin and buyer)
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use optimized getUserRole helper
    const { role, profile, error: roleError } = await getUserRole(user.id);

    if (roleError || !role || !profile) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check permissions: super_admin or buyer
    if (role !== 'super_admin' && role !== 'buyer') {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await request.json();

    // Validate input using Zod schema
    const validationResult = createProductSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 },
      );
    }

    const { name, category_id, barcode, description, unit, cost_price, selling_price, vat_rate, is_active } =
      validationResult.data;

    // For buyers, check if category is in their allowed categories
    if (role === 'buyer' && profile.allowed_categories) {
      if (!profile.allowed_categories.includes(category_id)) {
        return NextResponse.json(
          { error: 'You can only manage products in your assigned categories' },
          { status: 403 },
        );
      }
    }

    const supabase = await createClient();

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        name,
        category_id,
        barcode,
        description,
        unit,
        cost_price,
        selling_price,
        vat_rate,
        is_active,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      // Check for unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A product with these values already exists' },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }

    // Log audit
    await logCreate(user.id, 'product', product.id, { name, category_id });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error in products POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
