import { executeSql } from './index';

export async function runMigrations() {
  console.log('🔄 Running CakeCart PostgreSQL Database Migrations...');

  // gen_random_uuid() is built-in in PostgreSQL 13+. Try pgcrypto if available.
  try {
    await executeSql(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
  } catch {
    // Native gen_random_uuid() already available
  }

  // 1. Users Table
  await executeSql(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'customer',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Categories Table
  await executeSql(`
    CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      display_order INT NOT NULL DEFAULT 0
    );
  `);

  // 3. Products Table
  await executeSql(`
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      base_price_cents INT NOT NULL,
      image_url TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. Product Categories Join Table
  await executeSql(`
    CREATE TABLE IF NOT EXISTS product_categories (
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      PRIMARY KEY (product_id, category_id)
    );
  `);

  // 5. Product Options (Sizes, Flavours)
  await executeSql(`
    CREATE TABLE IF NOT EXISTS product_options (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      price_modifier_cents INT NOT NULL DEFAULT 0,
      is_default BOOLEAN NOT NULL DEFAULT FALSE
    );
  `);

  // 6. Dietary Tags Table
  await executeSql(`
    CREATE TABLE IF NOT EXISTS dietary_tags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      icon TEXT
    );
  `);

  // 7. Product Dietary Tags Join Table
  await executeSql(`
    CREATE TABLE IF NOT EXISTS product_dietary_tags (
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      dietary_tag_id UUID NOT NULL REFERENCES dietary_tags(id) ON DELETE CASCADE,
      PRIMARY KEY (product_id, dietary_tag_id)
    );
  `);

  // 8. Daily Capacity Table
  await executeSql(`
    CREATE TABLE IF NOT EXISTS daily_capacity (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bakery_date DATE NOT NULL UNIQUE,
      max_cakes INT NOT NULL,
      reserved_cakes INT NOT NULL DEFAULT 0,
      is_closed BOOLEAN NOT NULL DEFAULT FALSE,
      CONSTRAINT reserved_cakes_check CHECK (reserved_cakes >= 0 AND reserved_cakes <= max_cakes),
      CONSTRAINT max_cakes_positive CHECK (max_cakes >= 0)
    );
    CREATE INDEX IF NOT EXISTS daily_capacity_date_idx ON daily_capacity(bakery_date);
  `);

  // 9. Pickup Slots Table
  await executeSql(`
    CREATE TABLE IF NOT EXISTS pickup_slots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bakery_date DATE NOT NULL,
      start_time VARCHAR(10) NOT NULL,
      end_time VARCHAR(10) NOT NULL,
      max_orders INT NOT NULL,
      reserved_orders INT NOT NULL DEFAULT 0,
      CONSTRAINT reserved_orders_check CHECK (reserved_orders >= 0 AND reserved_orders <= max_orders)
    );
    CREATE INDEX IF NOT EXISTS pickup_slots_date_idx ON pickup_slots(bakery_date);
  `);

  // 10. Orders Table
  await executeSql(`
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_reference VARCHAR(32) NOT NULL UNIQUE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      pickup_date DATE NOT NULL,
      pickup_slot_id UUID NOT NULL REFERENCES pickup_slots(id),
      status TEXT NOT NULL DEFAULT 'PENDING',
      subtotal_cents INT NOT NULL,
      message_fee_cents INT NOT NULL DEFAULT 0,
      total_cents INT NOT NULL,
      hold_expires_at TIMESTAMPTZ NOT NULL,
      qr_code_data TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT order_status_check CHECK (
        status IN ('PENDING', 'CONFIRMED', 'BAKING', 'READY', 'COLLECTED', 'CANCELLED', 'EXPIRED', 'REFUNDED')
      )
    );
    CREATE INDEX IF NOT EXISTS orders_pickup_date_idx ON orders(pickup_date);
    CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders(user_id);
    CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
  `);

  // 11. Order Items Table
  await executeSql(`
    CREATE TABLE IF NOT EXISTS order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES products(id),
      quantity INT NOT NULL,
      unit_price_cents INT NOT NULL,
      total_price_cents INT NOT NULL,
      CONSTRAINT item_quantity_check CHECK (quantity > 0)
    );
  `);

  // 12. Order Customisations Table
  await executeSql(`
    CREATE TABLE IF NOT EXISTS order_customisations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
      size_option_id UUID REFERENCES product_options(id),
      flavour_option_id UUID REFERENCES product_options(id),
      custom_message VARCHAR(40),
      message_fee_cents INT NOT NULL DEFAULT 0,
      reference_image_url TEXT,
      CONSTRAINT message_max_length_check CHECK (custom_message IS NULL OR char_length(custom_message) <= 40)
    );
  `);

  // 13. Payments Table
  await executeSql(`
    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      payment_provider TEXT NOT NULL,
      provider_payment_id TEXT NOT NULL,
      idempotency_key VARCHAR(128) NOT NULL UNIQUE,
      amount_cents INT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT payment_status_check CHECK (
        status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED')
      )
    );
    CREATE UNIQUE INDEX IF NOT EXISTS payments_idempotency_idx ON payments(idempotency_key);
  `);

  // 14. Audit Logs Table
  await executeSql(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      actor_id TEXT,
      actor_role TEXT NOT NULL DEFAULT 'system',
      details TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity_type, entity_id);
  `);

  console.log('✅ All migrations applied successfully!');
}

if (process.argv[1]?.includes('migrate')) {
  runMigrations()
    .then(() => {
      console.log('🎉 Migrations finished successfully!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}


