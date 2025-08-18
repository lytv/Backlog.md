---
task_id: T10_S01
sprint_sequence_id: S01
status: open
complexity: Low
last_updated: 2025-08-11T16:15:00Z
---

# T10_S01: Database Seeding Implementation

## Description

Set up comprehensive database seeding for development and testing environments with realistic Order Management data. Create seed data for customers, products, colors, orders, and pricing that represents real-world Vietnamese textile business scenarios.

## Goal / Objectives

- Create seed data scripts for all Order Management tables
- Generate realistic Vietnamese customer and product data
- Create sample orders with various statuses
- Set up price history with quantity tiers
- Support multiple seeding profiles (dev, test, demo)

## Acceptance Criteria

- [ ] Seed data for 20+ customers with Vietnamese names
- [ ] Seed data for 10+ fabric products with specifications
- [ ] Color variants with Vietnamese translations
- [ ] Sample orders in different status states
- [ ] Price history with realistic VND amounts
- [ ] Seeding works with npm run seed:dev
- [ ] Clean and reseed capability
- [ ] Vietnamese language data included

## Subtasks

- [ ] Update DatabaseSeeder class for Order Management
- [ ] Create customer seed data with Vietnamese names
- [ ] Generate product data with fabric specifications
- [ ] Create color data with hex codes and translations
- [ ] Generate orders across different statuses
- [ ] Create order details with quantities
- [ ] Set up price history with tiers
- [ ] Add units seed data
- [ ] Test seeding scripts
- [ ] Document seed data structure

## Technical Guidance

**Key Interfaces and Integration Points:**
- Existing seeder: `/Users/mac/codingagent/vtlsaas/src/libs/DatabaseSeeder.ts`
- Seed scripts: `/Users/mac/codingagent/vtlsaas/src/scripts/seed-database.ts`
- Vietnamese seed script: `/Users/mac/codingagent/vtlsaas/src/scripts/seed-vietnamese.ts`
- npm scripts: seed:dev, seed:test, seed:demo

**Existing Patterns to Follow:**
- DatabaseSeeder class structure with static methods
- Environment-based seeding profiles (development, testing, demo, production)
- Clean and reseed pattern using options.clean flag
- Vietnamese data generation using faker
- Validation of seeding results after completion

**Database Models to Interface With:**
- All Order Management schemas from T01-T05:
  - Customer schema (customer table)
  - Product schema (product table)
  - Color schema (color table)
  - Order schema (order table)
  - Order details schema (order_details table)
  - Price history schema (price_history table)
  - Units schema (units table)
- Maintain foreign key relationships
- Respect business constraints

**Implementation Notes:**

1. **Extend DatabaseSeeder class** with Order Management methods:
   - `seedCustomers()` - Vietnamese customer names and addresses
   - `seedProducts()` - Fabric products with specifications
   - `seedColors()` - Color variants with translations
   - `seedUnits()` - Measurement units (meter, yard, piece)
   - `seedOrders()` - Sample orders in various statuses
   - `seedOrderDetails()` - Order line items with quantities
   - `seedPriceHistory()` - Price tiers and history

2. **Vietnamese customer data**:
   - Use Vietnamese first/last names
   - Vietnamese addresses with proper format
   - Phone numbers in Vietnamese format (+84)
   - Mix of customer types (VIP, Regular, New)

3. **Realistic fabric products**:
   - Cotton, silk, polyester, wool varieties
   - Various widths (100cm, 150cm, 200cm)
   - Different weights (lightweight, medium, heavy)
   - Multiple color options per product
   - Vietnamese product descriptions

4. **Order scenarios**:
   - Draft orders for testing workflow
   - Confirmed orders ready for production
   - In production orders
   - Completed orders with delivery dates
   - Various quantities and realistic dates

5. **Price tiers structure**:
   - 1-10 pieces (high unit price)
   - 11-50 pieces (medium unit price)
   - 51+ pieces (bulk discount)
   - Historical price tracking

6. **Use faker for realistic data**:
   - faker.person.firstName() for Vietnamese names
   - faker.location.city() for Vietnamese cities
   - faker.commerce.productName() adapted for textiles
   - faker.date.recent() for realistic timestamps

7. **Ensure idempotent seeding**:
   - Use onConflictDoNothing() where appropriate
   - Handle existing data gracefully
   - Support --clean flag for fresh start

8. **Add Vietnamese translations**:
   - Product names in both English and Vietnamese
   - Color names with Vietnamese translations
   - Address components in Vietnamese format

**Error Handling Approach:**
- Handle foreign key constraints properly
- Clean existing data if --clean flag provided
- Log seeding progress and errors using logger
- Rollback on failure to maintain data integrity
- Validate relationships between seeded data

**Integration with Existing System:**
- Extend existing SeedOptions interface if needed
- Follow existing logging patterns using logger
- Maintain compatibility with npm scripts
- Use same environment-based logic as current seeder
- Follow validation pattern from validateSeedingResults()

**Data Relationships to Maintain:**
- Customer → Organization (foreign key)
- Product → Organization (foreign key)
- Order → Customer (foreign key)
- Order → Organization (foreign key)
- OrderDetail → Order (foreign key)
- OrderDetail → Product (foreign key)
- OrderDetail → Color (foreign key)
- PriceHistory → Product (foreign key)
- All timestamps and audit fields

**Performance Considerations:**
- Batch inserts where possible
- Use faker seed for reproducible data
- Optimize foreign key lookups with maps
- Consider transaction boundaries for large datasets
- Log progress for long-running operations

## Dependencies

- Completion of T01-T05 (all Order Management schemas)
- T06 (Database Migrations) for schema deployment
- T08 (Basic CRUD Services) for service patterns
- T09 (Order Service Transactions) for transaction patterns
- faker.js library for data generation
- Existing DatabaseSeeder.ts infrastructure

## Notes

This task builds on the existing seeding infrastructure and extends it to support the new Order Management module. The seeded data will be essential for development, testing, and demonstration purposes.

The implementation should maintain the high quality and patterns established in the existing DatabaseSeeder class while adding comprehensive Vietnamese textile business data.
