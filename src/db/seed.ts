import { executeSql } from './index';
import bcrypt from 'bcryptjs';

export async function runSeed() {
  console.log('🌱 Seeding CakeCart database...');

  // Clean existing seed tables
  await executeSql(`
    TRUNCATE users, categories, dietary_tags, products, daily_capacity, pickup_slots CASCADE;
  `);

  // 1. Seed Users (Baker & Customer)
  const bakerHash = await bcrypt.hash('BakerPass123!', 10);
  const customerHash = await bcrypt.hash('CustomerPass123!', 10);

  await executeSql(`
    INSERT INTO users (id, email, password_hash, name, phone, role)
    VALUES 
      ('11111111-1111-1111-1111-111111111111', 'baker@cakecart.com', '${bakerHash}', 'Chef Marie (Head Baker)', '+1-555-0199', 'baker'),
      ('22222222-2222-2222-2222-222222222222', 'customer@example.com', '${customerHash}', 'Ayushi Customer', '+1-555-0144', 'customer')
    ON CONFLICT (email) DO NOTHING;
  `);

  // 2. Seed Categories
  await executeSql(`
    INSERT INTO categories (id, name, slug, description, display_order)
    VALUES 
      ('c0000001-0000-0000-0000-000000000001', 'Signature Cakes', 'signature-cakes', 'Our renowned flagship patisserie creations crafted with precision.', 1),
      ('c0000002-0000-0000-0000-000000000002', 'Celebration & Birthdays', 'celebration-birthdays', 'Vibrant festive cakes designed to elevate milestone memories.', 2),
      ('c0000003-0000-0000-0000-000000000003', 'Wedding & Tiered', 'wedding-tiered', 'Artisanal multi-tiered showstoppers adorned with fresh blooms.', 3),
      ('c0000004-0000-0000-0000-000000000004', 'Vegan & Dietary', 'vegan-dietary', 'Inclusive decadent treats crafted without compromise on taste.', 4)
    ON CONFLICT (slug) DO NOTHING;
  `);

  // 3. Seed Dietary Tags
  await executeSql(`
    INSERT INTO dietary_tags (id, name, slug, icon)
    VALUES 
      ('d0000001-0000-0000-0000-000000000001', 'Eggless', 'eggless', '🥚'),
      ('d0000002-0000-0000-0000-000000000002', 'Gluten-Free', 'gluten-free', '🌾'),
      ('d0000003-0000-0000-0000-000000000003', 'Nut-Free', 'nut-free', '🥜'),
      ('d0000004-0000-0000-0000-000000000004', 'Vegan', 'vegan', '🌱')
    ON CONFLICT (slug) DO NOTHING;
  `);

  // 4. Seed Products
  const productsData = [
    {
      id: 'a0000001-0000-0000-0000-000000000001',
      name: 'Belgian Dark Chocolate Ganache',
      slug: 'belgian-dark-chocolate-ganache',
      description: 'Triple-layer 70% Callebaut dark chocolate sponge enveloped in silky ganache, dark chocolate drip, and gold leaf flakes.',
      basePriceCents: 4800,
      imageUrl: '/cakes/chocolate-fudge.jpg',
      categoryId: 'c0000001-0000-0000-0000-000000000001',
      dietaryTagIds: ['d0000001-0000-0000-0000-000000000001', 'd0000003-0000-0000-0000-000000000003'], // Eggless, Nut-Free
    },
    {
      id: 'a0000002-0000-0000-0000-000000000002',
      name: 'Raspberry Champagne Blossom',
      slug: 'raspberry-champagne-blossom',
      description: 'Delicate pink champagne-infused sponge layered with organic raspberry compote and velvet rosewater buttercream.',
      basePriceCents: 6500,
      imageUrl: '/cakes/berry-blossom.jpg',
      categoryId: 'c0000003-0000-0000-0000-000000000003',
      dietaryTagIds: ['d0000003-0000-0000-0000-000000000003'], // Nut-Free
    },
    {
      id: 'a0000003-0000-0000-0000-000000000003',
      name: 'Sicilian Lemon & Pistachio Crunch',
      slug: 'sicilian-lemon-pistachio-crunch',
      description: 'Zesty organic Amalfi lemon curd layered between pistachio dacquoise, finished with crushed Bronte emerald pistachios.',
      basePriceCents: 5200,
      imageUrl: '/cakes/pistachio-citrus.jpg',
      categoryId: 'c0000001-0000-0000-0000-000000000001',
      dietaryTagIds: ['d0000001-0000-0000-0000-000000000001'], // Eggless
    },
    {
      id: 'a0000004-0000-0000-0000-000000000004',
      name: 'Salted Caramel Macaron Drip',
      slug: 'salted-caramel-macaron-drip',
      description: 'Brown butter sponge with handcrafted Maldon sea salt caramel drip, whipped cream cheese, and French macarons.',
      basePriceCents: 5500,
      imageUrl: '/cakes/salted-caramel.jpg',
      categoryId: 'c0000002-0000-0000-0000-000000000002',
      dietaryTagIds: ['d0000001-0000-0000-0000-000000000001', 'd0000003-0000-0000-0000-000000000003'], // Eggless, Nut-Free
    },
    {
      id: 'a0000005-0000-0000-0000-000000000005',
      name: 'Tahitian Vanilla Bean Chiffon',
      slug: 'tahitian-vanilla-bean-chiffon',
      description: 'Ultra-light gluten-free cloud sponge infused with aromatic whole Tahitian vanilla beans and white chocolate cream.',
      basePriceCents: 4600,
      imageUrl: '/cakes/berry-blossom.jpg',
      categoryId: 'c0000004-0000-0000-0000-000000000004',
      dietaryTagIds: ['d0000001-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000002', 'd0000003-0000-0000-0000-000000000003'], // Eggless, GF, Nut-Free
    },
    {
      id: 'a0000006-0000-0000-0000-000000000006',
      name: 'Vegan Salted Butterscotch Praline',
      slug: 'vegan-salted-butterscotch-praline',
      description: 'Plant-based spiced sponge layered with housemade dairy-free caramel butterscotch and toasted pecan praline.',
      basePriceCents: 5000,
      imageUrl: '/cakes/salted-caramel.jpg',
      categoryId: 'c0000004-0000-0000-0000-000000000004',
      dietaryTagIds: ['d0000001-0000-0000-0000-000000000001', 'd0000004-0000-0000-0000-000000000004'], // Eggless, Vegan
    },
  ];

  for (const prod of productsData) {
    await executeSql(`
      INSERT INTO products (id, name, slug, description, base_price_cents, image_url, is_active)
      VALUES ('${prod.id}', '${prod.name}', '${prod.slug}', '${prod.description}', ${prod.basePriceCents}, '${prod.imageUrl}', true)
      ON CONFLICT (slug) DO NOTHING;
    `);

    await executeSql(`
      INSERT INTO product_categories (product_id, category_id)
      VALUES ('${prod.id}', '${prod.categoryId}')
      ON CONFLICT DO NOTHING;
    `);

    for (const tagId of prod.dietaryTagIds) {
      await executeSql(`
        INSERT INTO product_dietary_tags (product_id, dietary_tag_id)
        VALUES ('${prod.id}', '${tagId}')
        ON CONFLICT DO NOTHING;
      `);
    }

    // Product Options: Sizes
    const sizes = [
      { name: '6" Petite (Serves 6–8)', priceModifierCents: 0, isDefault: true },
      { name: '8" Classic (Serves 12–16)', priceModifierCents: 1800, isDefault: false },
      { name: '10" Grand (Serves 20–25)', priceModifierCents: 3600, isDefault: false },
      { name: '2-Tier Party (Serves 30–35)', priceModifierCents: 6000, isDefault: false },
    ];
    for (const size of sizes) {
      await executeSql(`
        INSERT INTO product_options (product_id, type, name, price_modifier_cents, is_default)
        VALUES ('${prod.id}', 'size', '${size.name}', ${size.priceModifierCents}, ${size.isDefault});
      `);
    }

    // Product Options: Flavours
    const flavours = [
      { name: 'Signature House Recipe', priceModifierCents: 0, isDefault: true },
      { name: 'Dark Valrhona Ganache Core', priceModifierCents: 400, isDefault: false },
      { name: 'Madagascan Vanilla Bean Swirl', priceModifierCents: 300, isDefault: false },
      { name: 'Espresso Arabica Buttercream', priceModifierCents: 350, isDefault: false },
    ];
    for (const flav of flavours) {
      await executeSql(`
        INSERT INTO product_options (product_id, type, name, price_modifier_cents, is_default)
        VALUES ('${prod.id}', 'flavour', '${flav.name}', ${flav.priceModifierCents}, ${flav.isDefault});
      `);
    }
  }

  // 5. Seed Daily Capacity & Pickup Slots for next 14 days
  const now = new Date();
  for (let i = 1; i <= 14; i++) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + i);
    const dateStr = targetDate.toISOString().split('T')[0];

    const isWeekend = targetDate.getDay() === 0 || targetDate.getDay() === 6;
    const maxCakes = isWeekend ? 15 : 12;
    // For day 6, mark closed as an example of baker closing a date
    const isClosed = i === 6;
    const reservedCakes = (i === 3) ? 3 : (i === 4 ? 2 : 0);

    await executeSql(`
      INSERT INTO daily_capacity (bakery_date, max_cakes, reserved_cakes, is_closed)
      VALUES ('${dateStr}', ${maxCakes}, ${reservedCakes}, ${isClosed})
      ON CONFLICT (bakery_date) DO UPDATE 
      SET max_cakes = EXCLUDED.max_cakes, is_closed = EXCLUDED.is_closed;
    `);

    // Slots
    const timeSlots = [
      { start: '10:00', end: '12:00', max: 4, reserved: (i === 3 ? 1 : 0) },
      { start: '12:00', end: '14:00', max: 4, reserved: (i === 3 ? 2 : 0) },
      { start: '14:00', end: '16:00', max: 4, reserved: (i === 4 ? 2 : 0) },
      { start: '16:00', end: '18:00', max: 4, reserved: 0 },
    ];

    for (const slot of timeSlots) {
      await executeSql(`
        INSERT INTO pickup_slots (bakery_date, start_time, end_time, max_orders, reserved_orders)
        VALUES ('${dateStr}', '${slot.start}', '${slot.end}', ${slot.max}, ${slot.reserved});
      `);
    }
  }

  console.log('✅ Seeding completed successfully!');
}

if (process.argv[1]?.includes('seed')) {
  runSeed()
    .then(() => {
      console.log('🎉 Seed script finished!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}

