import { NextResponse } from 'next/server';
import { executeSql } from '@/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Fetch categories
    const categoriesRes = await executeSql(
      'SELECT id, name, slug, description, display_order FROM categories ORDER BY display_order ASC;'
    );

    // 2. Fetch dietary tags
    const dietaryRes = await executeSql(
      'SELECT id, name, slug, icon FROM dietary_tags ORDER BY name ASC;'
    );

    // 3. Fetch products
    const productsRes = await executeSql(
      'SELECT id, name, slug, description, base_price_cents, image_url, is_active FROM products WHERE is_active = true ORDER BY name ASC;'
    );

    // 4. Fetch product options
    const optionsRes = await executeSql(
      'SELECT id, product_id, type, name, price_modifier_cents, is_default FROM product_options ORDER BY type, price_modifier_cents ASC;'
    );

    // 5. Fetch product category mappings
    const prodCatRes = await executeSql('SELECT product_id, category_id FROM product_categories;');

    // 6. Fetch product dietary tag mappings
    const prodDietRes = await executeSql('SELECT product_id, dietary_tag_id FROM product_dietary_tags;');

    // Group options by product
    const optionsByProduct: Record<string, any[]> = {};
    for (const opt of optionsRes.rows) {
      if (!optionsByProduct[opt.product_id]) optionsByProduct[opt.product_id] = [];
      optionsByProduct[opt.product_id].push(opt);
    }

    // Group categories by product
    const categoriesByProduct: Record<string, string[]> = {};
    for (const pc of prodCatRes.rows) {
      if (!categoriesByProduct[pc.product_id]) categoriesByProduct[pc.product_id] = [];
      categoriesByProduct[pc.product_id].push(pc.category_id);
    }

    // Group dietary tags by product
    const dietaryByProduct: Record<string, string[]> = {};
    for (const pd of prodDietRes.rows) {
      if (!dietaryByProduct[pd.product_id]) dietaryByProduct[pd.product_id] = [];
      dietaryByProduct[pd.product_id].push(pd.dietary_tag_id);
    }

    // Assemble rich product list
    const products = productsRes.rows.map((p) => {
      const allOpts = optionsByProduct[p.id] || [];
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        basePriceCents: p.base_price_cents,
        imageUrl: p.image_url,
        categoryIds: categoriesByProduct[p.id] || [],
        dietaryTagIds: dietaryByProduct[p.id] || [],
        sizes: allOpts.filter((o) => o.type === 'size'),
        flavours: allOpts.filter((o) => o.type === 'flavour'),
      };
    });

    return NextResponse.json({
      products,
      categories: categoriesRes.rows,
      dietaryTags: dietaryRes.rows,
    });
  } catch (err: any) {
    console.error('Menu fetch error:', err);
    return NextResponse.json({ error: 'Failed to load menu' }, { status: 500 });
  }
}
