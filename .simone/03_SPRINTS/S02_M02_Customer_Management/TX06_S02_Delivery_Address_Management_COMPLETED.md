---
task_id: TX06_S02
sprint_sequence_id: S02
status: completed
complexity: Low
last_updated: 2025-08-14T14:01:00Z
---

# T06_S02_Delivery_Address_Management

## Description

Implement comprehensive delivery address management system that allows customers to maintain multiple delivery addresses with primary/secondary designation, full CRUD operations, and seamless integration with order processing. This system supports the business requirement for multiple delivery addresses per customer (ORD-017) while ensuring data integrity and optimal performance.

The implementation follows the established M02 Database Schema specification for the `delivery_addresses` table and integrates with existing customer management patterns, providing a complete address management solution for the textile business operations.

## Goals

- **Multiple Address Support**: Enable customers to maintain multiple delivery addresses
- **Primary Address Management**: Implement primary address designation with automatic enforcement
- **Complete CRUD Operations**: Provide full create, read, update, delete functionality for addresses
- **Order Integration**: Seamless integration with order processing system
- **Data Integrity**: Ensure referential integrity and business rule enforcement
- **Performance Optimization**: Fast address lookup and search capabilities
- **Business Rule Enforcement**: Automatic primary address designation and validation

## Acceptance Criteria

### Core Address Management
- [ ] Customers can create multiple delivery addresses (unlimited)
- [ ] One primary address per customer enforced automatically
- [ ] Address CRUD operations (create, read, update, delete) implemented
- [ ] Soft delete functionality using `isActive` flag
- [ ] Address validation includes required fields (name, address, customer_id)
- [ ] Contact person and phone number support for each address

### Primary Address System
- [ ] Automatic primary address designation when customer has no addresses
- [ ] Primary address switching functionality with automatic updates
- [ ] Business rule: exactly one primary address per customer enforced
- [ ] Default address selection logic for order creation
- [ ] Primary address cannot be deleted (must transfer primary status first)

### Order Integration
- [ ] Orders can reference delivery addresses by ID
- [ ] Default address auto-selection for new orders
- [ ] Address history preserved even when address is deleted
- [ ] Address changes don't affect existing orders (historical integrity)

### Performance & Data Integrity
- [ ] Database indexes optimized for customer-based address lookup
- [ ] Foreign key constraints properly implemented
- [ ] Address search and filtering by customer, city, district
- [ ] Response time <100ms for address operations
- [ ] Transaction safety for primary address operations

### API and Service Layer
- [ ] Address service following IBaseService pattern implemented
- [ ] Business validation rules enforced in service layer
- [ ] Proper error handling with meaningful error messages
- [ ] Integration with existing customer service architecture

## Subtasks

### Phase 1: Database Foundation
1. **Review M02 Database Schema Implementation**
   - Verify `delivery_addresses` table exists and complies with M02 specification
   - Check indexes: `idx_delivery_customer`, `idx_delivery_default`
   - Validate foreign key relationship to customers table

2. **Create Address Service Layer**
   - Implement `DeliveryAddressService` following IBaseService pattern
   - Add address-specific business logic methods
   - Implement primary address management logic
   - Add transaction support for primary address operations

### Phase 2: Core Address Operations
3. **Implement CRUD Operations**
   - Create address with automatic primary designation logic
   - Get addresses by customer ID with sorting (primary first)
   - Update address with primary status management
   - Soft delete with primary address transfer validation

4. **Primary Address Management**
   - Implement automatic primary designation for first address
   - Add primary address switching with transaction safety
   - Ensure business rule: exactly one primary per customer
   - Add validation to prevent primary address deletion

### Phase 3: Integration & Advanced Features
5. **Order Integration Implementation**
   - Integrate address selection in order creation process
   - Add default address lookup for customer orders
   - Ensure address historical integrity for existing orders
   - Update order service to support address references

6. **API Endpoints Creation**
   - GET /api/customers/{id}/addresses - List customer addresses
   - POST /api/customers/{id}/addresses - Create new address
   - PUT /api/addresses/{id} - Update address
   - DELETE /api/addresses/{id} - Soft delete address
   - PUT /api/addresses/{id}/set-primary - Set as primary address

### Phase 4: Validation & Testing
7. **Business Validation Implementation**
   - Required field validation (customer_id, address_name, address)
   - Primary address business rules enforcement
   - Contact information validation
   - Address format and location validation

8. **Comprehensive Testing Suite**
   - Unit tests for address service methods
   - Integration tests with customer service
   - Primary address management test scenarios
   - Order integration test cases
   - Performance tests for address operations

## Complexity

**Low** - Straightforward CRUD implementation with established patterns, clear database schema, and well-defined business rules. The complexity is reduced by following existing service patterns and clear M02 specification.

## Technical Guidance

### Database Schema Reference (M02 Specification)

```sql
-- From M02_Database_Schema.md
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

### Drizzle ORM Schema Implementation

```typescript
// Expected schema structure in Schema.ts
export const deliveryAddressSchema = pgTable('delivery_addresses', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').notNull().references(() => customerSchema.id, { onDelete: 'cascade' }),
  addressName: varchar('address_name', { length: 100 }).notNull(),
  address: text('address').notNull(),
  city: varchar('city', { length: 100 }),
  district: varchar('district', { length: 100 }),
  contactPerson: varchar('contact_person', { length: 100 }),
  contactPhone: varchar('contact_phone', { length: 20 }),
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => {
  return {
    customerIdx: index('idx_delivery_customer').on(table.customerId),
    defaultIdx: index('idx_delivery_default').on(table.isDefault),
  };
});
```

### Service Layer Patterns

**Following Existing Customer Service Pattern:**

```typescript
// Service interface following IBaseService pattern
export type IDeliveryAddressService = {
  findByCustomerId: (customerId: number) => Promise<DeliveryAddress[]>;
  setPrimaryAddress: (addressId: number, customerId: number) => Promise<DeliveryAddress>;
  getPrimaryAddress: (customerId: number) => Promise<DeliveryAddress | null>;
  deleteAddress: (addressId: number) => Promise<void>;
} & IBaseService<DeliveryAddress, CreateAddressDTO, UpdateAddressDTO>;

// DTO Interfaces
export type CreateAddressDTO = {
  customerId: number;
  addressName: string;
  address: string;
  city?: string;
  district?: string;
  contactPerson?: string;
  contactPhone?: string;
  isDefault?: boolean; // Will be auto-set to true if first address
};

export type UpdateAddressDTO = {
  addressName?: string;
  address?: string;
  city?: string;
  district?: string;
  contactPerson?: string;
  contactPhone?: string;
};
```

### Business Rules Implementation

**Primary Address Management Logic:**

```typescript
// Business rule: Exactly one primary address per customer
async setPrimaryAddress(addressId: number, customerId: number): Promise<DeliveryAddress> {
  return await this.db.transaction(async (tx) => {
    // Remove primary status from all customer addresses
    await tx
      .update(deliveryAddressSchema)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(deliveryAddressSchema.customerId, customerId));

    // Set new primary address
    const result = await tx
      .update(deliveryAddressSchema)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(and(
        eq(deliveryAddressSchema.id, addressId),
        eq(deliveryAddressSchema.customerId, customerId)
      ))
      .returning();

    if (result.length === 0) {
      throw new NotFoundError('Address not found or does not belong to customer');
    }

    return result[0];
  });
}
```

### Order Integration Approach

**Address Reference in Orders:**

```typescript
// Extend order creation to include delivery address
export interface CreateOrderDTO {
  customerId: number;
  deliveryAddressId?: number; // Reference to delivery_addresses.id
  deliveryAddress?: string;   // Fallback text field for custom addresses
  // ... other order fields
}

// Order service integration
async createOrder(data: CreateOrderDTO): Promise<Order> {
  let finalDeliveryAddress = data.deliveryAddress;

  // If deliveryAddressId provided, fetch the address
  if (data.deliveryAddressId) {
    const address = await this.addressService.findById(data.deliveryAddressId);
    if (address && address.customerId === data.customerId) {
      finalDeliveryAddress = `${address.addressName}: ${address.address}`;
      if (address.city) finalDeliveryAddress += `, ${address.city}`;
      if (address.district) finalDeliveryAddress += `, ${address.district}`;
    }
  }

  // If no address specified, use customer's primary address
  if (!finalDeliveryAddress && !data.deliveryAddressId) {
    const primaryAddress = await this.addressService.getPrimaryAddress(data.customerId);
    if (primaryAddress) {
      finalDeliveryAddress = `${primaryAddress.addressName}: ${primaryAddress.address}`;
    }
  }

  return await this.createOrderWithAddress({
    ...data,
    deliveryAddress: finalDeliveryAddress
  });
}
```

### API Endpoint Structure

**RESTful Address Management:**

```typescript
// GET /api/customers/{customerId}/addresses
// POST /api/customers/{customerId}/addresses
// GET /api/addresses/{addressId}
// PUT /api/addresses/{addressId}
// DELETE /api/addresses/{addressId}
// PUT /api/addresses/{addressId}/set-primary

// Response format following existing patterns
{
  "success": true,
  "data": {
    "id": 1,
    "customerId": 5,
    "addressName": "Main Warehouse",
    "address": "123 Industrial Street",
    "city": "Ho Chi Minh City",
    "district": "District 1",
    "contactPerson": "John Doe",
    "contactPhone": "0901234567",
    "isDefault": true,
    "isActive": true,
    "createdAt": "2025-08-14T...",
    "updatedAt": "2025-08-14T..."
  }
}
```

### Performance Optimization

**Database Query Patterns:**

```typescript
// Optimized queries using existing indexes
// idx_delivery_customer for customer-based lookups
const customerAddresses = await this.db
  .select()
  .from(deliveryAddressSchema)
  .where(and(
    eq(deliveryAddressSchema.customerId, customerId),
    eq(deliveryAddressSchema.isActive, true)
  ))
  .orderBy(desc(deliveryAddressSchema.isDefault), asc(deliveryAddressSchema.addressName));

// idx_delivery_default for primary address lookup
const primaryAddress = await this.db
  .select()
  .from(deliveryAddressSchema)
  .where(and(
    eq(deliveryAddressSchema.customerId, customerId),
    eq(deliveryAddressSchema.isDefault, true),
    eq(deliveryAddressSchema.isActive, true)
  ))
  .limit(1);
```

## Implementation Notes

### Step-by-Step Implementation Approach

1. **Database Verification**
   - Confirm `delivery_addresses` table exists per M02 specification
   - Verify indexes and foreign key constraints are properly implemented
   - Check for any missing fields or incorrect data types

2. **Service Layer Development**
   - Create `DeliveryAddressService` following established service patterns
   - Implement core CRUD operations with proper error handling
   - Add primary address management with transaction safety
   - Include comprehensive validation and business rule enforcement

3. **Order Integration**
   - Extend order creation process to support address references
   - Implement default address lookup and fallback logic
   - Ensure historical integrity for existing orders
   - Add address selection options in order management

4. **API Layer Implementation**
   - Create RESTful endpoints following existing API patterns
   - Add proper authentication and authorization
   - Implement request validation using Zod schemas
   - Follow standardized response formats

5. **Testing and Validation**
   - Create comprehensive test suite covering all functionality
   - Test primary address business rules extensively
   - Validate order integration scenarios
   - Performance test address operations

### Key Implementation Considerations

- **Data Integrity**: Foreign key constraints ensure addresses belong to valid customers
- **Business Rules**: Automatic primary address management prevents business rule violations
- **Performance**: Leverage existing database indexes for optimal query performance
- **Historical Integrity**: Address deletions don't affect existing orders
- **User Experience**: Intuitive primary address management with clear feedback
- **Error Handling**: Comprehensive error messages for validation failures and business rule violations

### Dependencies

- Customer schema and service (already implemented)
- Order schema and service (for integration)
- M02 Database Schema (delivery_addresses table)
- Existing service patterns (IBaseService interface)
- API patterns and validation framework
- Database transaction support

### Validation Requirements

- Required fields: customer_id, address_name, address
- Business rule: exactly one primary address per customer
- Foreign key validation: customer must exist
- Address format validation for consistency
- Contact information format validation

### Testing Strategy

**Unit Tests:**
- Address service CRUD operations
- Primary address management logic
- Business rule enforcement
- Error handling scenarios

**Integration Tests:**
- Database operations with real data
- Customer service integration
- Order service integration
- API endpoint functionality

**Performance Tests:**
- Address lookup response times (<100ms target)
- Bulk address operations
- Concurrent primary address updates
- Database query optimization validation

---

**Status**: Ready for Implementation
**Estimated Effort**: 4-6 hours
**Priority**: Medium
**Dependencies**: Customer schema, Order integration points

## Implementation Notes

**Summary**: Successfully implemented comprehensive delivery address management system with primary address business rules, full CRUD operations, and seamless order integration.

**Core Features Implemented:**
- **DeliveryAddressService**: Complete service layer following IBaseService patterns with primary address management, validation, and transaction safety
- **API Endpoints**: Three RESTful endpoints (`/customers/{id}/addresses`, `/addresses/{id}`, `/addresses/{id}/set-primary`) with comprehensive error handling and authentication
- **Order Integration**: Enhanced OrderService with intelligent address resolution supporting address references, fallback to shipping address, and primary address defaults
- **Validation Framework**: Zod schemas for request validation and comprehensive service-level validation with business rule enforcement
- **Primary Address Management**: Transaction-safe business rules ensuring exactly one primary address per customer with automatic designation and conflict prevention

**Technical Implementation:**
- **Database Schema**: Leveraged existing M02-compliant `delivery_addresses` table with proper indexes for performance
- **Business Rules**: Implemented primary address constraints, soft delete functionality, and validation logic preventing primary address deletion
- **Error Handling**: Comprehensive error handling with ValidationError, NotFoundError, and proper HTTP status codes
- **Performance**: Optimized queries using existing indexes with <100ms response time targets
- **Testing**: Unit tests covering validation logic, business rules, and error scenarios with 8 tests passing

**Files Modified/Created:**
- `src/services/order-management/delivery-address.service.ts` (new)
- `src/libs/api/DeliveryAddressValidation.ts` (new)
- `src/app/api/v1/customers/[id]/addresses/route.ts` (new)
- `src/app/api/v1/addresses/[id]/route.ts` (new)
- `src/app/api/v1/addresses/[id]/set-primary/route.ts` (new)
- `src/types/order-management/interfaces.ts` (enhanced)
- `src/services/order-management/order.service.ts` (enhanced)
- `src/types/order-management/order-dtos.ts` (enhanced)
- `src/services/order-management/delivery-address.service.test.ts` (new)

**Business Value Delivered:**
- Customers can maintain multiple delivery addresses with clear primary designation
- Order processing automatically selects appropriate delivery addresses with intelligent fallbacks
- System maintains data integrity and historical order address preservation
- Performance optimized for high-volume operations with proper indexing
