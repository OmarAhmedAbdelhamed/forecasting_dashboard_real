import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth';
import { getUserRole } from '@/lib/get-user-role';
import { logUpdate } from '@/lib/audit-log';
import { createClient } from '@/lib/supabase/server';
import { updateCategorySchema } from '@/lib/validations/category';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/categories/[id] - Get category details
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

    // IDOR prevention: Buyers can only view categories in their allowed_categories
    if (role === 'buyer' && profile.allowed_categories) {
      if (!profile.allowed_categories.includes(id)) {
        return NextResponse.json(
          { error: 'Forbidden - Category not in your assigned categories' },
          { status: 403 },
        );
      }
    }

    const supabase = await createClient();

    const { data: category, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error in category GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/categories/[id] - Update category
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Use optimized getUserRole helper
    const { role, error: roleError } = await getUserRole(user.id);

    if (roleError || !role) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only super_admin and GM can update categories
    if (role !== 'super_admin' && role !== 'general_manager') {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();

    // Validate input using Zod schema
    const validationResult = updateCategorySchema.safeParse({ id, ...body });
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 },
      );
    }

    const { id: _id, ...updateData } = validationResult.data;

    const supabase = await createClient();

    const { data: category, error } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating category:', error);
      return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
    }

    // Log audit
    await logUpdate(user.id, 'category', id, { changes: updateData });

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error in category PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/categories/[id] - Delete category (super_admin only)
export async function DELETE(request: NextRequest, context: RouteContext) {
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

    const { error } = await supabase.from('categories').delete().eq('id', id);

    if (error) {
      console.error('Error deleting category:', error);
      return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
    }

    // Log audit
    await logUpdate(user.id, 'category', id, { action: 'delete' });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in category DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
