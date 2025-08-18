# M02: Database Schema Specification

## Overview
This document defines the database schema for Milestone 2: Order Management Module. It includes tables for customer management, product catalog, orders, pricing, and related entities.

## Schema Dependencies
- Requires M01 tables: users, audit_logs
- Referenced by M03: production_orders will link to order_details

## Table Definitions

### 1. customers
Stores customer information and business relationships.

```sql
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    customer_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    customer_type VARCHAR(20) DEFAULT 'regular' CHECK (customer_type IN ('vip', 'regular', 'new')),
    tax_code VARCHAR(50),
    address TEXT NOT NULL,
    city VARCHAR(100),
    district VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    contact_person VARCHAR(100),
    contact_phone VARCHAR(20),
    credit_limit DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    payment_terms INTEGER DEFAULT 30, -- days
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_customers_code (customer_code),
    INDEX idx_customers_name (name),
    INDEX idx_customers_phone (phone),
    INDEX idx_customers_type (customer_type),
    INDEX idx_customers_active (is_active)
);
```

### 2. products
Fabric product catalog with specifications.

```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    product_code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    fabric_type VARCHAR(100),
    composition TEXT, -- e.g., "100% Cotton", "65% Poly 35% Cotton"
    width_inch DECIMAL(8,2),
    width_cm DECIMAL(8,2),
    weight_gyd DECIMAL(8,2), -- grams per yard
    weight_gm2 DECIMAL(8,2), -- grams per square meter
    specifications JSONB, -- {"type": "REC", "treatment": "W/R", "standard": "TPG"}
    description TEXT,
    min_order_quantity DECIMAL(10,2) DEFAULT 0,
    lead_time_days INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_products_code (product_code),
    INDEX idx_products_name (name),
    INDEX idx_products_type (fabric_type),
    INDEX idx_products_active (is_active),
    INDEX idx_products_specs (specifications) USING GIN
);
```

### 3. colors
Color master data with standard codes.

```sql
CREATE TABLE colors (
    id SERIAL PRIMARY KEY,
    color_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    hex_code VARCHAR(7),
    pantone_code VARCHAR(50),
    rgb_value VARCHAR(20), -- "255,255,255"
    color_group VARCHAR(50), -- "Blue", "Red", "Green", etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_colors_code (color_code),
    INDEX idx_colors_name (name),
    INDEX idx_colors_group (color_group)
);
```

### 4. product_colors
Many-to-many relationship for product-color availability.

```sql
CREATE TABLE product_colors (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    color_id INTEGER NOT NULL REFERENCES colors(id) ON DELETE RESTRICT,
    is_available BOOLEAN DEFAULT true,
    min_quantity DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(product_id, color_id),
    INDEX idx_product_colors_product (product_id),
    INDEX idx_product_colors_color (color_id),
    INDEX idx_product_colors_available (is_available)
);
```

### 5. units
Measurement units with conversion factors.

```sql
CREATE TABLE units (
    id SERIAL PRIMARY KEY,
    unit_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    name_en VARCHAR(50),
    unit_type VARCHAR(20) NOT NULL CHECK (unit_type IN ('weight', 'length', 'area', 'quantity')),
    base_unit_id INTEGER REFERENCES units(id),
    conversion_factor DECIMAL(15,6) DEFAULT 1, -- to base unit
    decimal_places INTEGER DEFAULT 2,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_units_type (unit_type),
    INDEX idx_units_code (unit_code)
);
```

### 6. price_lists
Price list headers for different customer types or periods.

```sql
CREATE TABLE price_lists (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    customer_type VARCHAR(20),
    currency VARCHAR(3) DEFAULT 'VND',
    valid_from DATE NOT NULL,
    valid_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_price_lists_code (code),
    INDEX idx_price_lists_dates (valid_from, valid_to),
    INDEX idx_price_lists_active (is_active)
);
```

### 7. price_list_items
Individual price entries per product-color combination.

```sql
CREATE TABLE price_list_items (
    id SERIAL PRIMARY KEY,
    price_list_id INTEGER NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    color_id INTEGER REFERENCES colors(id),
    unit_price DECIMAL(15,2) NOT NULL CHECK (unit_price >= 0),
    min_quantity DECIMAL(10,2) DEFAULT 0,
    max_quantity DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(price_list_id, product_id, color_id),
    INDEX idx_price_items_list (price_list_id),
    INDEX idx_price_items_product (product_id),
    INDEX idx_price_items_color (color_id)
);
```

### 8. orders
Sales order headers.

```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_address TEXT,
    delivery_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'confirmed', 'in_production', 'completed', 'cancelled')),
    payment_terms INTEGER, -- days
    special_instructions TEXT,
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'VND',
    cancellation_reason TEXT,
    cancelled_by INTEGER REFERENCES users(id),
    cancelled_at TIMESTAMPTZ,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_orders_number (order_number),
    INDEX idx_orders_customer (customer_id),
    INDEX idx_orders_date (order_date),
    INDEX idx_orders_status (status),
    INDEX idx_orders_delivery (delivery_date)
);
```

### 9. order_details
Order line items - one product per order as per requirement.

```sql
CREATE TABLE order_details (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL DEFAULT 1,
    product_id INTEGER NOT NULL REFERENCES products(id),
    color_id INTEGER NOT NULL REFERENCES colors(id),
    quantity_ordered DECIMAL(10,2) NOT NULL CHECK (quantity_ordered > 0),
    quantity_unit VARCHAR(20) NOT NULL, -- 'kg', 'yard', etc.
    -- Converted quantities for reference
    quantity_kg DECIMAL(10,2),
    quantity_yard DECIMAL(10,2),
    quantity_meter DECIMAL(10,2),
    unit_price DECIMAL(15,2) NOT NULL CHECK (unit_price >= 0),
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_percent DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    line_total DECIMAL(15,2) NOT NULL,
    delivery_date DATE,
    notes TEXT,
    fabric_lot VARCHAR(100), -- Lot/batch number
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(order_id, line_number),
    INDEX idx_order_details_order (order_id),
    INDEX idx_order_details_product (product_id),
    INDEX idx_order_details_color (color_id),
    INDEX idx_order_details_delivery (delivery_date)
);
```

### 10. price_history
Historical record of all price changes.

```sql
CREATE TABLE price_history (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id),
    color_id INTEGER REFERENCES colors(id),
    price_list_id INTEGER REFERENCES price_lists(id),
    old_price DECIMAL(15,2),
    new_price DECIMAL(15,2) NOT NULL,
    changed_reason TEXT,
    changed_by INTEGER REFERENCES users(id),
    changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_price_history_product (product_id),
    INDEX idx_price_history_color (color_id),
    INDEX idx_price_history_date (changed_at)
);
```

### 11. delivery_addresses
Multiple delivery addresses per customer.

```sql
CREATE TABLE delivery_addresses (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    address_name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100),
    district VARCHAR(100),
    contact_person VARCHAR(100),
    contact_phone VARCHAR(20),
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_delivery_customer (customer_id),
    INDEX idx_delivery_default (is_default)
);
```

## Drizzle ORM Schema

```typescript
// src/models/orders.ts
import { boolean, date, decimal, index, integer, jsonb, pgTable, serial, text, timestamp, unique, varchar } from 'drizzle-orm/pg-core';

import { users } from './users';

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  customerCode: varchar('customer_code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  nameEn: varchar('name_en', { length: 255 }),
  customerType: varchar('customer_type', { length: 20 }).default('regular'),
  taxCode: varchar('tax_code', { length: 50 }),
  address: text('address').notNull(),
  city: varchar('city', { length: 100 }),
  district: varchar('district', { length: 100 }),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 255 }),
  contactPerson: varchar('contact_person', { length: 100 }),
  contactPhone: varchar('contact_phone', { length: 20 }),
  creditLimit: decimal('credit_limit', { precision: 15, scale: 2 }).default('0'),
  currentBalance: decimal('current_balance', { precision: 15, scale: 2 }).default('0'),
  paymentTerms: integer('payment_terms').default(30),
  notes: text('notes'),
  isActive: boolean('is_active').default(true),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => {
  return {
    codeIdx: index('idx_customers_code').on(table.customerCode),
    nameIdx: index('idx_customers_name').on(table.name),
    phoneIdx: index('idx_customers_phone').on(table.phone),
    typeIdx: index('idx_customers_type').on(table.customerType),
    activeIdx: index('idx_customers_active').on(table.isActive),
  };
});

// Continue with other tables...
```

## Seed Data

```sql
-- Insert default units
INSERT INTO units (unit_code, name, unit_type, conversion_factor) VALUES
('kg', 'Kilogram', 'weight', 1),
('g', 'Gram', 'weight', 0.001),
('lb', 'Pound', 'weight', 0.453592),
('m', 'Meter', 'length', 1),
('cm', 'Centimeter', 'length', 0.01),
('inch', 'Inch', 'length', 0.0254),
('yard', 'Yard', 'length', 0.9144),
('m2', 'Square Meter', 'area', 1),
('yard2', 'Square Yard', 'area', 0.836127);

-- Insert default colors
INSERT INTO colors (color_code, name, color_group) VALUES
('BLACK', 'Black', 'Neutral'),
('WHITE', 'White', 'Neutral'),
('NAVY', 'Navy Blue', 'Blue'),
('CHARCOAL', 'Charcoal', 'Gray'),
('OFF_BLACK_19-4004', 'Off Black TPG', 'Black');
```

## Indexes and Performance

### Critical Indexes
- Customer search: name, phone, code
- Product search: name, code, type
- Order lookup: number, customer, date, status
- Price lookup: product + color combination

### Partitioning Strategy
- Consider partitioning orders by year when > 100k records
- Archive completed orders after 2 years
- Partition price_history by year

### Query Optimization
- Use materialized views for frequently accessed reports
- Implement full-text search on product names/descriptions
- Consider read replicas for analytics queries

## Data Integrity Rules

1. **Referential Integrity**
   - Cannot delete customer with orders
   - Cannot delete product with order history
   - Color deletion restricted if used

2. **Business Rules**
   - One product per order enforced
   - Price must be non-negative
   - Quantity must be positive
   - Delivery date >= order date

3. **Audit Trail**
   - All changes logged to audit_logs
   - Price changes tracked in price_history
   - Order status changes logged

## Migration Notes
- Run after M01 migrations complete
- Seed units and basic colors first
- Import existing customer data if available
- Set up initial price lists before go-live
