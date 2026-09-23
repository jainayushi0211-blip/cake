import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  boolean,
  date,
  timestamp,
  check,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';

// 1. Users Table
export const users = pgTable('users', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  phone: text('phone'),
  role: text('role').notNull().default('customer'), // 'customer' | 'baker'
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// 2. Categories Table
export const categories = pgTable('categories', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  displayOrder: integer('display_order').notNull().default(0),
});

// 3. Products Table
export const products = pgTable('products', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  basePriceCents: integer('base_price_cents').notNull(),
  imageUrl: text('image_url').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// 4. Product Categories Join Table
export const productCategories = pgTable(
  'product_categories',
  {
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.productId, table.categoryId] }),
  })
);

// 5. Product Options (Sizes, Flavours)
export const productOptions = pgTable('product_options', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'size' | 'flavour'
  name: text('name').notNull(),
  priceModifierCents: integer('price_modifier_cents').notNull().default(0),
  isDefault: boolean('is_default').notNull().default(false),
});

// 6. Dietary Tags
export const dietaryTags = pgTable('dietary_tags', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  icon: text('icon'),
});

// 7. Product Dietary Tags Join Table
export const productDietaryTags = pgTable(
  'product_dietary_tags',
  {
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    dietaryTagId: uuid('dietary_tag_id').notNull().references(() => dietaryTags.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.productId, table.dietaryTagId] }),
  })
);

// 8. Daily Capacity Table
export const dailyCapacity = pgTable(
  'daily_capacity',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    bakeryDate: date('bakery_date').notNull().unique(),
    maxCakes: integer('max_cakes').notNull(),
    reservedCakes: integer('reserved_cakes').notNull().default(0),
    isClosed: boolean('is_closed').notNull().default(false),
  },
  (table) => ({
    reservedCakesCheck: check('reserved_cakes_check', sql`reserved_cakes >= 0 AND reserved_cakes <= max_cakes`),
    maxCakesPositive: check('max_cakes_positive', sql`max_cakes >= 0`),
    dateIdx: index('daily_capacity_date_idx').on(table.bakeryDate),
  })
);

// 9. Pickup Slots Table
export const pickupSlots = pgTable(
  'pickup_slots',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    bakeryDate: date('bakery_date').notNull(),
    startTime: varchar('start_time', { length: 10 }).notNull(), // '10:00'
    endTime: varchar('end_time', { length: 10 }).notNull(),   // '12:00'
    maxOrders: integer('max_orders').notNull(),
    reservedOrders: integer('reserved_orders').notNull().default(0),
  },
  (table) => ({
    reservedOrdersCheck: check('reserved_orders_check', sql`reserved_orders >= 0 AND reserved_orders <= max_orders`),
    slotDateIdx: index('pickup_slots_date_idx').on(table.bakeryDate),
  })
);

// 10. Orders Table
export const orders = pgTable(
  'orders',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    orderReference: varchar('order_reference', { length: 32 }).notNull().unique(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    customerName: text('customer_name').notNull(),
    customerEmail: text('customer_email').notNull(),
    customerPhone: text('customer_phone').notNull(),
    pickupDate: date('pickup_date').notNull(),
    pickupSlotId: uuid('pickup_slot_id').notNull().references(() => pickupSlots.id),
    status: text('status').notNull().default('PENDING'),
    // 'PENDING' | 'CONFIRMED' | 'BAKING' | 'READY' | 'COLLECTED' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED'
    subtotalCents: integer('subtotal_cents').notNull(),
    messageFeeCents: integer('message_fee_cents').notNull().default(0),
    totalCents: integer('total_cents').notNull(),
    holdExpiresAt: timestamp('hold_expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    qrCodeData: text('qr_code_data').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => ({
    statusCheck: check(
      'order_status_check',
      sql`status IN ('PENDING', 'CONFIRMED', 'BAKING', 'READY', 'COLLECTED', 'CANCELLED', 'EXPIRED', 'REFUNDED')`
    ),
    orderRefIdx: uniqueIndex('orders_reference_idx').on(table.orderReference),
    orderDateIdx: index('orders_pickup_date_idx').on(table.pickupDate),
    orderUserIdx: index('orders_user_id_idx').on(table.userId),
  })
);

// 11. Order Items Table
export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull().references(() => products.id),
    quantity: integer('quantity').notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    totalPriceCents: integer('total_price_cents').notNull(),
  },
  (table) => ({
    quantityCheck: check('item_quantity_check', sql`quantity > 0`),
  })
);

// 12. Order Customisations Table
export const orderCustomisations = pgTable(
  'order_customisations',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    orderItemId: uuid('order_item_id').notNull().references(() => orderItems.id, { onDelete: 'cascade' }),
    sizeOptionId: uuid('size_option_id').references(() => productOptions.id),
    flavourOptionId: uuid('flavour_option_id').references(() => productOptions.id),
    customMessage: varchar('custom_message', { length: 40 }),
    messageFeeCents: integer('message_fee_cents').notNull().default(0),
    referenceImageUrl: text('reference_image_url'),
  },
  (table) => ({
    messageLengthCheck: check(
      'message_max_length_check',
      sql`custom_message IS NULL OR char_length(custom_message) <= 40`
    ),
  })
);

// 13. Payments Table
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    paymentProvider: text('payment_provider').notNull(), // 'stripe_test' | 'simulated'
    providerPaymentId: text('provider_payment_id').notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull().unique(),
    amountCents: integer('amount_cents').notNull(),
    currency: text('currency').notNull().default('USD'),
    status: text('status').notNull().default('PENDING'),
    // 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'REFUNDED'
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => ({
    paymentStatusCheck: check(
      'payment_status_check',
      sql`status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED')`
    ),
    idempotencyIdx: uniqueIndex('payments_idempotency_idx').on(table.idempotencyKey),
  })
);

// 14. Audit Logs Table
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  entityType: text('entity_type').notNull(), // 'order', 'capacity', 'auth'
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(), // 'CREATE', 'HOLD_RESERVED', 'STATUS_CHANGE', 'EXPIRED_RELEASE', 'CANCEL'
  actorId: text('actor_id'),
  actorRole: text('actor_role').notNull().default('system'), // 'customer' | 'baker' | 'system'
  details: text('details'), // JSON string
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Relations
export const productsRelations = relations(products, ({ many }) => ({
  categories: many(productCategories),
  options: many(productOptions),
  dietaryTags: many(productDietaryTags),
  orderItems: many(orderItems),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(productCategories),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  pickupSlot: one(pickupSlots, { fields: [orders.pickupSlotId], references: [pickupSlots.id] }),
  items: many(orderItems),
  payments: many(payments),
}));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  customisation: one(orderCustomisations, { fields: [orderItems.id], references: [orderCustomisations.orderItemId] }),
}));
