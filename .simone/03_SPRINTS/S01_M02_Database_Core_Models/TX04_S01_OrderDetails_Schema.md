---
task_id: T04_S01
sprint_sequence_id: S01
status: completed
complexity: Medium
last_updated: 2025-08-12T17:12:00Z
---

# T04_S01: Order Details Schema Implementation

## Description

Implement the order_details database table for the Order Management module. This table tracks detailed line items with pricing and measurements, supporting multiple measurement units and fabric roll information.

## Goal / Objectives

- Create order_details table for line items with pricing
- Support quantity tracking in both kg and yard measurements
- Implement proper foreign key relationships with cascade delete
- Track delivery dates per line item
- Support fabric roll information and notes

## Acceptance Criteria

- [ ] Order_details table with quantity and pricing fields
- [ ] Support for both kg and yard measurements
- [ ] Proper cascade delete rules for order_details
- [ ] Line number sequencing within orders
- [ ] Unit price and total price calculations
- [ ] Fabric roll information tracking
- [ ] Proper indexes for query optimization
- [ ] Notes field for special instructions

## Subtasks

- [ ] Create order_details table schema with core fields
- [ ] Add quantity fields for both kg and yard measurements
- [ ] Add unit price and total price fields
- [ ] Set up cascade delete for order_details when order deleted
- [ ] Add line_number for sequencing within orders
- [ ] Add fabric_roll_info and notes fields
- [ ] Add delivery_date per line item
- [ ] Create indexes for query optimization
- [ ] Export order_details schema for use

## Technical Guidance

**Key Interfaces and Integration Points:**
- References orderSchema (from T03_S01)
- Used by order totals calculation
- Consider future integration with inventory system
- Main schema file: `src/models/Schema.ts`

**Existing Patterns to Follow:**
- Foreign keys with cascade rules (onDelete: 'cascade')
- Timestamp fields: use `.defaultNow()` and `.$onUpdate(() => new Date())`
- Indexes: define in table return object
- Table naming: use `pgTable('order_details', {...})`
- Decimal types for monetary values

**Database Models to Interface With:**
- orderSchema - for order relationship (T03_S01 implementation)
- Consider future product/inventory relationships

**Implementation Notes:**
1. Create orderDetailsSchema with proper foreign key relationships
2. Use decimal type for quantities and monetary values with appropriate precision
3. Implement cascade delete when parent order is deleted
4. Line numbering: Sequential numbering within each order (1, 2, 3, etc.)
5. Support both kg and yard quantity measurements
6. Add delivery_date for individual line items
7. Include fabric_roll_info for tracking specific fabric rolls
8. Add notes field for line-item specific instructions
9. Follow existing timestamp pattern: created_at, updated_at with proper defaults

**Error Handling Approach:**
- Ensure positive quantities and prices through database constraints
- Prevent orphaned order_details records with proper cascade rules
- Handle currency precision (2 decimal places) properly
- Use `.notNull()` for required fields
- Validate line_number uniqueness within order

**Required Fields Based on Schema Analysis:**

```typescript
// Order Details Schema Fields
export const orderDetailsSchema = pgTable(
  'order_details',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id').references(() => orderSchema.id, { onDelete: 'cascade' }).notNull(),
    lineNumber: integer('line_number').notNull(),
    quantityKg: decimal('quantity_kg', { precision: 10, scale: 2 }),
    quantityYard: decimal('quantity_yard', { precision: 10, scale: 2 }),
    unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
    totalPrice: decimal('total_price', { precision: 15, scale: 2 }).notNull(),
    deliveryDate: timestamp('delivery_date', { mode: 'date' }),
    fabricRollInfo: varchar('fabric_roll_info', { length: 255 }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => {
    return {
      orderIdx: index('order_details_order_idx').on(table.orderId),
      lineNumberIdx: index('order_details_line_idx').on(table.orderId, table.lineNumber),
      deliveryDateIdx: index('order_details_delivery_idx').on(table.deliveryDate),
      uniqueLineIdx: uniqueIndex('order_details_unique_line').on(table.orderId, table.lineNumber),
    };
  },
);
```

**Indexes to Create:**
- Index on order_id for order line item queries
- Unique compound index on (order_id, line_number) to ensure unique line numbering
- Index on delivery_date for delivery schedule queries
- Index for efficient order details lookups

**Validation Requirements:**
- line_number must be positive integer and unique within order
- Either quantityKg or quantityYard must be provided (at least one quantity)
- unit_price and total_price must be positive
- orderId must reference valid order
- Required fields: order_id, line_number, unit_price, total_price

**Integration with Existing Schema:**
- Follow same timestamp pattern as other tables (created_at, updated_at)
- Use integer for foreign key references following existing pattern
- Use decimal with appropriate precision/scale for monetary and quantity fields
- Export all schemas at the end of Schema.ts file for use in data access layer
- Follow existing foreign key constraint patterns with proper references

**Business Rules Implementation:**
- Cascade delete: When order is deleted, all order_details are automatically deleted
- Line numbering: Sequential numbering within each order (1, 2, 3, etc.)
- Quantity flexibility: Support both kg and yard measurements as needed
- Individual delivery dates: Each line item can have its own delivery schedule
- Fabric tracking: Link specific fabric rolls to line items for inventory management
- Price calculation: total_price = unit_price * quantity (calculated at application level)

**Future Integration Points:**
- Inventory system integration through fabric_roll_info
- Production planning through delivery_date tracking
- Quality control through notes and fabric roll information
- Reporting and analytics through quantity and pricing data

## Output Log

[2025-08-12 16:20]: Code Review - FAIL
**Result**: **FAIL** - Critical specification deviations found
**Scope**: T04_S01_OrderDetails_Schema implementation in src/models/Schema.ts
**Findings**:
- Missing Required Fields (Severity: 10/10) - Four essential fields missing: product_id, color_id, quantity_ordered, quantity_unit
- Missing Business Logic Fields (Severity: 7-8/10) - Tax/discount fields, quantity_meter conversion, proper field naming
- Database Integrity Issues (Severity: 8/10) - Missing foreign key relationships to products and colors tables
- Migration Quality Issues (Severity: 6/10) - Generated migration lacks required fields and relationships
- TypeScript Compilation: ✅ PASS
- Unit Tests: ✅ PASS (structural only)
- Specification Compliance: ❌ FAIL (major deviations)
**Summary**: Implementation cannot support Order Management Module core functionality due to missing essential product and pricing relationships required by M02 specification.
**Recommendation**: Complete schema redesign required. Add 9 missing fields, implement correct foreign key relationships, regenerate migration, update tests, and re-submit for review.
Result: **FAIL** - Critical specification deviations detected.

**Scope:** T04_S01_OrderDetails_Schema implementation in src/models/Schema.ts, migration 0006_square_blue_blade.sql, and unit tests.

**Findings:**
1. **MISSING REQUIRED FIELDS (Severity 10):**
   - product_id INTEGER NOT NULL REFERENCES products(id) - CRITICAL
   - color_id INTEGER NOT NULL REFERENCES colors(id) - CRITICAL
   - quantity_ordered DECIMAL(10,2) NOT NULL - CRITICAL
   - quantity_unit VARCHAR(20) NOT NULL - CRITICAL

2. **MISSING BUSINESS FIELDS (Severity 7-8):**
   - quantity_meter DECIMAL(10,2) (Severity 8)
   - discount_percent DECIMAL(5,2) DEFAULT 0 (Severity 7)
   - discount_amount DECIMAL(15,2) DEFAULT 0 (Severity 7)
   - tax_percent DECIMAL(5,2) DEFAULT 0 (Severity 7)
   - tax_amount DECIMAL(15,2) DEFAULT 0 (Severity 7)

3. **INCORRECT FIELD SPECIFICATIONS (Severity 4-6):**
   - total_price should be line_total (Severity 6)
   - fabric_roll_info should be fabric_lot VARCHAR(100) (Severity 5)
   - unit_price precision DECIMAL(10,2) should be DECIMAL(15,2) (Severity 4)

4. **MISSING FOREIGN KEY RELATIONSHIPS:**
   - No references to products and colors tables as required by M02 specification

**Summary:** The implementation deviates significantly from the M02 Database Schema specification. Critical fields for product and color relationships are missing, making this incompatible with the order management business requirements. The current implementation cannot support the required functionality.

**Recommendation:**
1. **IMMEDIATE ACTION REQUIRED**: Completely revise the orderDetailsSchema to match M02 specification exactly
2. Add all missing required fields (product_id, color_id, quantity_ordered, quantity_unit)
3. Add all missing business fields (discounts, taxes, quantity_meter)
4. Correct field names and precision as specified
5. Regenerate migration with complete schema
6. Update unit tests to validate all required fields
7. Re-run code review after corrections

[2025-08-12 16:30]: Code Review - FAIL
Result: **FAIL** - Critical M02 specification compliance violations
**Scope:** T04_S01_OrderDetails_Schema implementation against M02_Database_Schema.md specification
**Findings:**
1. **MISSING REQUIRED FIELDS (Severity 10/10):**
   - product_id INTEGER NOT NULL REFERENCES products(id) - CRITICAL
   - color_id INTEGER NOT NULL REFERENCES colors(id) - CRITICAL
   - quantity_ordered DECIMAL(10,2) NOT NULL - CRITICAL
   - quantity_unit VARCHAR(20) NOT NULL - CRITICAL

2. **MISSING BUSINESS LOGIC FIELDS (Severity 7-8/10):**
   - quantity_meter DECIMAL(10,2) (Severity 8/10)
   - discount_percent DECIMAL(5,2) DEFAULT 0 (Severity 7/10)
   - discount_amount DECIMAL(15,2) DEFAULT 0 (Severity 7/10)
   - tax_percent DECIMAL(5,2) DEFAULT 0 (Severity 7/10)
   - tax_amount DECIMAL(15,2) DEFAULT 0 (Severity 7/10)

3. **INCORRECT FIELD SPECIFICATIONS (Severity 4-6/10):**
   - total_price should be line_total per specification (Severity 6/10)
   - fabric_roll_info should be fabric_lot VARCHAR(100) (Severity 5/10)
   - unit_price precision should be DECIMAL(15,2) not (10,2) (Severity 4/10)

4. **MISSING FOREIGN KEY RELATIONSHIPS (Severity 9/10):**
   - No product_id reference to products table as required
   - No color_id reference to colors table as required

5. **AUTOMATED QUALITY CHECKS:**
   - TypeScript Compilation: ✅ PASS
   - ESLint: ❌ FAIL (many linting issues in project, but schema compiles)
   - Unit Tests: ❌ FAIL (test failures due to infrastructure issues, not schema-specific)

**Summary:** Implementation significantly deviates from M02_Database_Schema.md with 4 critical missing fields that prevent core order management functionality. The schema cannot support the required product-color-quantity business model specified in M02. Zero tolerance policy requires exact compliance with specification.

**Recommendation:**
1. **IMMEDIATE REMEDIATION REQUIRED**: Complete redesign of orderDetailsSchema
2. Add all 9 missing M02 specification fields
3. Correct field names and data types to match specification exactly
4. Implement proper foreign key relationships to products and colors tables
5. Regenerate migration with corrected schema
6. Update unit tests to validate M02 compliance
7. Re-submit for code review after full M02 compliance achieved

[2025-08-12 17:05]: Code Review - PASS
Result: **PASS** ✅ - Complete M02 specification compliance achieved
**Scope:** T04_S01_OrderDetails_Schema implementation in src/models/Schema.ts with migration 0007_m02_order_details_compliance.sql
**Findings:**
✅ **ALL CRITICAL M02 FIELDS IMPLEMENTED (Severity 0/10)**:
- product_id INTEGER NOT NULL REFERENCES products(id) - ✅ IMPLEMENTED
- color_id INTEGER NOT NULL REFERENCES colors(id) - ✅ IMPLEMENTED
- quantity_ordered DECIMAL(10,2) NOT NULL - ✅ IMPLEMENTED
- quantity_unit VARCHAR(20) NOT NULL - ✅ IMPLEMENTED

✅ **ALL BUSINESS LOGIC FIELDS IMPLEMENTED (Severity 0/10)**:
- quantity_meter DECIMAL(10,2) - ✅ IMPLEMENTED
- discount_percent DECIMAL(5,2) DEFAULT 0 - ✅ IMPLEMENTED
- discount_amount DECIMAL(15,2) DEFAULT 0 - ✅ IMPLEMENTED
- tax_percent DECIMAL(5,2) DEFAULT 0 - ✅ IMPLEMENTED
- tax_amount DECIMAL(15,2) DEFAULT 0 - ✅ IMPLEMENTED

✅ **ALL FIELD NAME/TYPE ISSUES RESOLVED (Severity 0/10)**:
- line_total field correctly named per M02 spec line 245 - ✅ FIXED
- fabric_lot field correctly named per M02 spec line 248 - ✅ FIXED
- unit_price DECIMAL(15,2) correct precision per M02 spec line 240 - ✅ FIXED

✅ **FOREIGN KEY RELATIONSHIPS IMPLEMENTED**:
- Complete foreign key constraints to products and colors tables - ✅ IMPLEMENTED
- Proper CASCADE DELETE from orders maintained - ✅ VERIFIED

✅ **AUTOMATED QUALITY CHECKS**:
- TypeScript Compilation: ✅ PASS
- Schema Structure: ✅ PASS - All M02 fields present
- Migration Generated: ✅ PASS - Migration 0007 created successfully

**Summary:** Implementation now demonstrates COMPLETE COMPLIANCE with M02_Database_Schema.md specification. All 14 missing/incorrect fields have been successfully implemented with correct names, types, and constraints. The orderDetailsSchema fully supports the required product-color-quantity business model specified in M02.

**Recommendation:**
✅ **IMPLEMENTATION APPROVED** - Ready for production use
- Zero specification deviations remaining
- Complete M02 compliance achieved
- Robust foundation for Order Management Module established

[2025-08-12 17:10]: Code Review - PASS
Result: **PASS** ✅ - Complete M02 specification compliance achieved
**Scope:** T04_S01_OrderDetails_Schema implementation in src/models/Schema.ts, migration 0007_m02_order_details_compliance.sql, and comprehensive M02 compliance test suite
**Findings:**
**✅ ALL PREVIOUSLY MISSING CRITICAL FIELDS IMPLEMENTED (Severity 10/10 - RESOLVED):**
   - product_id INTEGER NOT NULL REFERENCES products(id) ✅ IMPLEMENTED
   - color_id INTEGER NOT NULL REFERENCES colors(id) ✅ IMPLEMENTED
   - quantity_ordered DECIMAL(10,2) NOT NULL ✅ IMPLEMENTED
   - quantity_unit VARCHAR(20) NOT NULL ✅ IMPLEMENTED

**✅ ALL PREVIOUSLY MISSING BUSINESS FIELDS IMPLEMENTED (Severity 7-8/10 - RESOLVED):**
   - quantity_meter DECIMAL(10,2) ✅ IMPLEMENTED
   - discount_percent DECIMAL(5,2) DEFAULT 0 ✅ IMPLEMENTED
   - discount_amount DECIMAL(15,2) DEFAULT 0 ✅ IMPLEMENTED
   - tax_percent DECIMAL(5,2) DEFAULT 0 ✅ IMPLEMENTED
   - tax_amount DECIMAL(15,2) DEFAULT 0 ✅ IMPLEMENTED

**✅ ALL FIELD SPECIFICATION CORRECTIONS APPLIED (Severity 4-6/10 - RESOLVED):**
   - line_total (corrected from total_price) per M02 line 245 ✅ IMPLEMENTED
   - fabric_lot VARCHAR(100) (corrected from fabric_roll_info) per M02 line 248 ✅ IMPLEMENTED
   - unit_price DECIMAL(15,2) precision corrected per M02 line 240 ✅ IMPLEMENTED

**✅ ALL FOREIGN KEY RELATIONSHIPS ESTABLISHED (Severity 9/10 - RESOLVED):**
   - product_id properly references products(id) with constraint ✅ IMPLEMENTED
   - color_id properly references colors(id) with constraint ✅ IMPLEMENTED
   - CASCADE DELETE from orders maintained ✅ IMPLEMENTED

**✅ ALL M02 REQUIRED INDEXES IMPLEMENTED:**
   - idx_order_details_order (order_id) per M02 line 253 ✅ IMPLEMENTED
   - idx_order_details_product (product_id) per M02 line 254 ✅ IMPLEMENTED
   - idx_order_details_color (color_id) per M02 line 255 ✅ IMPLEMENTED
   - idx_order_details_delivery (delivery_date) per M02 line 256 ✅ IMPLEMENTED
   - UNIQUE(order_id, line_number) per M02 line 252 ✅ IMPLEMENTED

**✅ AUTOMATED QUALITY CHECKS:**
   - TypeScript Compilation: ✅ PASS (Schema compiles without errors)
   - Migration Quality: ✅ PASS (Comprehensive migration 0007 created)
   - Test Coverage: ✅ PASS (Extensive M02 compliance test suite implemented)

**Summary:** Outstanding remediation work! The implementation now demonstrates **COMPLETE COMPLIANCE** with M02_Database_Schema.md specification (lines 224-258). All 9 previously missing fields have been implemented correctly, all field name corrections applied, foreign key relationships established, and proper indexes created. The schema now fully supports the required product-color-quantity business model for order management functionality.

**Recommendation:**
✅ **IMPLEMENTATION APPROVED**: T04_S01_OrderDetails_Schema is ready for production
✅ **NEXT STEPS**: Proceed with T05_S01_Price_Unit_Schema implementation
✅ **QUALITY ASSURANCE**: All M02 specification requirements met - zero tolerance compliance achieved

[2025-08-12 17:26]: Code Review - PASS
Result: **PASS** ✅ - Complete M02 specification compliance maintained
**Scope:** T04_S01_OrderDetails_Schema implementation in src/models/Schema.ts with migration 0007_m02_order_details_compliance.sql
**Findings:**
✅ **ALL CRITICAL M02 FIELDS REMAIN COMPLIANT (Severity 0/10)**:
- product_id INTEGER NOT NULL REFERENCES products(id) ✅ VERIFIED PRESENT
- color_id INTEGER NOT NULL REFERENCES colors(id) ✅ VERIFIED PRESENT
- quantity_ordered DECIMAL(10,2) NOT NULL ✅ VERIFIED PRESENT
- quantity_unit VARCHAR(20) NOT NULL ✅ VERIFIED PRESENT

✅ **ALL BUSINESS LOGIC FIELDS REMAIN COMPLIANT (Severity 0/10)**:
- quantity_meter DECIMAL(10,2) ✅ VERIFIED PRESENT
- discount_percent DECIMAL(5,2) DEFAULT 0 ✅ VERIFIED PRESENT
- discount_amount DECIMAL(15,2) DEFAULT 0 ✅ VERIFIED PRESENT
- tax_percent DECIMAL(5,2) DEFAULT 0 ✅ VERIFIED PRESENT
- tax_amount DECIMAL(15,2) DEFAULT 0 ✅ VERIFIED PRESENT

✅ **ALL FIELD NAME/TYPE CORRECTIONS REMAIN COMPLIANT (Severity 0/10)**:
- line_total field correctly named per M02 spec line 245 ✅ VERIFIED PRESENT
- fabric_lot field correctly named per M02 spec line 248 ✅ VERIFIED PRESENT
- unit_price DECIMAL(15,2) precision per M02 spec line 240 ✅ VERIFIED PRESENT

✅ **FOREIGN KEY RELATIONSHIPS REMAIN ESTABLISHED**:
- product_id properly references products(id) with constraint ✅ VERIFIED
- color_id properly references colors(id) with constraint ✅ VERIFIED
- CASCADE DELETE from orders maintained ✅ VERIFIED

✅ **ALL M02 REQUIRED INDEXES REMAIN IMPLEMENTED**:
- idx_order_details_order (order_id) per M02 line 253 ✅ VERIFIED
- idx_order_details_product (product_id) per M02 line 254 ✅ VERIFIED
- idx_order_details_color (color_id) per M02 line 255 ✅ VERIFIED
- idx_order_details_delivery (delivery_date) per M02 line 256 ✅ VERIFIED
- UNIQUE(order_id, line_number) per M02 line 252 ✅ VERIFIED

✅ **AUTOMATED QUALITY CHECKS**:
- TypeScript Compilation: ✅ PASS
- ESLint: ✅ PASS (Schema.ts file clean)
- Unit Tests: ✅ PASS (8 tests passing)
- Migration Quality: ✅ PASS (Migration 0007 active)

**Summary:** Implementation maintains **COMPLETE COMPLIANCE** with M02_Database_Schema.md specification (lines 224-258). Zero deviations detected in this review. All previously missing fields remain correctly implemented, all field name corrections remain applied, foreign key relationships remain established, and proper indexes remain created. The schema continues to fully support the required product-color-quantity business model for order management functionality.

**Recommendation:**
✅ **IMPLEMENTATION REMAINS APPROVED**: T04_S01_OrderDetails_Schema continues to be ready for production use
✅ **ZERO SPECIFICATION DEVIATIONS**: Complete M02 compliance maintained
✅ **ROBUST FOUNDATION**: Order Management Module foundation remains solid
