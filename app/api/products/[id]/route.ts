import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth';
import { getUserRole } from '@/lib/get-user-role';
import { logUpdate } from '@/lib/audit-log';
import { sanitizeDatabaseError } from '@/lib/sanitize-error';
import { createClient } from '@/lib/supabase/server';
import { updateProductSchema } from '@/lib/validations/product';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/products/[id] - Get product details
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
    if (role !== 'super_admin' && role !== 'general_manager' && role !== 'buyer') {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 },
      );
    }

    const supabase = await createClient();

    // Get product to check category access
    const { data: product, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // IDOR prevention: Buyers can only view products in their allowed_categories
    if (role === 'buyer' && profile.allowed_categories) {
      if (!profile.allowed_categories.includes(product.category_id)) {
        return NextResponse.json(
          { error: 'Forbidden - Product not in your assigned categories' },
          { status: 403 },
        );
      }
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error in product GET:', error);
    return NextResponse.json(
      { error: sanitizeDatabaseError(error, 'fetch product') },
      { status: 500 },
    );
  }
}

// PATCH /api/products/[id] - Update product
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

    // Only super_admin and buyer can update products
    if (role !== 'super_admin' && role !== 'buyer') {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();

    // Validate input using Zod schema
    const validationResult = updateProductSchema.safeParse({ id, ...body });
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 },
      );
    }

    const { id: _id, ...updateData } = validationResult.data;

    // For buyers, check category access
    if (role === 'buyer' && profile.allowed_categories && updateData.category_id) {
      if (!profile.allowed_categories.includes(updateData.category_id)) {
        return NextResponse.json(
          { error: 'You can only manage products in your assigned categories' },
          { status: 403 },
        );
      }
    }

    const supabase = await createClient();

    const { data: product, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating product:', error);
      return NextResponse.json(
        { error: sanitizeDatabaseError(error, 'update product') },
        { status: 500 },
      );
    }

    // Log audit
    await logUpdate(user.id, 'product', id, { changes: updateData });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error in product PATCH:', error);
    return NextResponse.json(
      { error: sanitizeDatabaseError(error, 'update product') },
      { status: 500 },
    );
  }
}

// DELETE /api/products/[id] - Delete product (super_admin only)
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

    // Check if product exists
    const { data: product, error: checkError } = await supabase
      .from('products')
      .select('id, name')
      .eq('id', id)
      .single();

    if (checkError) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Note: store_products table was removed in migration 028
    // Products can be deleted freely (store associations are derived from categories)

    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
      return NextResponse.json(
        { error: sanitizeDatabaseError(error, 'delete product') },
        { status: 500 },
      );
    }

    // Log audit
    await logUpdate(user.id, 'product', id, { action: 'delete', productName: product.name });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in product DELETE:', error);
    return NextResponse.json(
      { error: sanitizeDatabaseError(error, 'delete product') },
      { status: 500 },
    );
  }
}
