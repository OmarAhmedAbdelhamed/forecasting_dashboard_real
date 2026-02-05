import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth';
import { getUserRole } from '@/lib/get-user-role';
import { logCreate } from '@/lib/audit-log';
import { createClient } from '@/lib/supabase/server';
import { createCategorySchema } from '@/lib/validations/category';

// GET /api/categories - List all categories
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
        { error: 'Forbidden - You do not have permission to view categories' },
        { status: 403 },
      );
    }

    const supabase = await createClient();

    // Fetch categories
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error in categories GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/categories - Create new category (super_admin only)
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
    const validationResult = createCategorySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 },
      );
    }

    const { name } = validationResult.data;

    const supabase = await createClient();

    const { data: category, error } = await supabase
      .from('categories')
      .insert({ name })
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
    }

    // Log audit
    await logCreate(user.id, 'category', category.id, { name });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error in categories POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
