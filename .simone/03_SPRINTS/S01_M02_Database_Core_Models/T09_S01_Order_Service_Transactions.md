---
task_id: T09_S01
sprint_sequence_id: S01
status: in_progress
complexity: Medium
last_updated: 2025-08-13T17:52:00Z
---

# T09_S01: Order Service with Transaction Support

## Description
Implement OrderService with complex transaction support for order creation and PriceService for price lookups. This task focuses on the more complex business operations requiring transaction management and multi-table operations.

## Goal / Objectives
- Create OrderService with transaction support for order creation
- Implement order status management with validation
- Create PriceService for price lookups and calculations
- Add transaction rollback on failures
- Implement complex order operations

## Acceptance Criteria
- [ ] OrderService with order-details transaction handling
- [ ] Order status update methods with validation
- [ ] PriceService for price lookups and calculations
- [ ] Transaction rollback on failures
- [ ] TypeScript types for Order operations
- [ ] Unit tests for transaction scenarios

## Subtasks
- [ ] Create OrderService with transaction support
- [ ] Implement order creation with details (atomic)
- [ ] Add order status update methods with validation
- [ ] Create PriceService for price lookups
- [ ] Implement order calculation methods (totals, taxes)
- [ ] Add TypeScript interfaces for Order DTOs
- [ ] Implement transaction error handling
- [ ] Add unit tests for OrderService transactions
- [ ] Add unit tests for PriceService

## Technical Guidance

**Key Interfaces and Integration Points:**
- Database connection: src/libs/DB.ts with transaction support
- Existing patterns: Look for service patterns in features/
- Use Drizzle ORM transaction support with db.transaction()
- Follow existing error handling patterns

**Existing Patterns to Follow:**
- Service class pattern
- DTO interfaces for type safety
- Error handling with try-catch
- Transaction patterns for complex operations
- Logging with existing logger

**Database Models to Interface With:**
- Order schema from T04
- Order Details schema from T05
- Price/Unit schemas from T05
- Customer and Product schemas for relationships
- Use Drizzle ORM transaction support

**Implementation Notes:**
1. Create services in src/services/order-management/
2. OrderService methods:
   - createWithDetails (transaction)
   - updateStatus with validation
   - calculateTotals
   - findOrdersByCustomer
   - findOrdersByStatus
3. PriceService methods:
   - getPriceByQuantity
   - calculateOrderTotal
   - getPriceHistory
4. Use Drizzle's transaction support for complex operations
5. Implement proper status validation rules
6. Add comprehensive error handling for transactions

**Error Handling Approach:**
- Custom error classes for business errors
- Transaction rollback on failures
- Database constraint error handling
- Proper error logging and messages

## Implementation Details

### OrderService Implementation
- **Transaction Support**: Atomic order creation with details
- **Status Management**: Valid status transitions with business rules
- **Calculation Methods**: Order totals, taxes, discounts
- **Complex Queries**: Order history, status filtering, customer orders

### PriceService Implementation
- **Price Lookups**: Get prices based on product and quantity
- **Price History**: Track price changes over time
- **Calculations**: Order totals, line item calculations
- **Quantity Tiers**: Support for quantity-based pricing

### Data Transfer Objects (DTOs)
```typescript
// Order DTOs
type CreateOrderDTO = {
  customer_id: string;
  order_details: Array<{
    product_id: string;
    color_id?: string;
    quantity: number;
    unit_price: number;
  }>;
  shipping_address?: AddressInfo;
  notes?: string;
};

type UpdateOrderStatusDTO = {
  order_id: string;
  new_status: OrderStatus;
  notes?: string;
};

// Price DTOs
type PriceCalculationDTO = {
  product_id: string;
  quantity: number;
  price_date?: Date;
};
```

### Transaction Handling
```typescript
// Example transaction pattern
async createOrderWithDetails(orderData: CreateOrderDTO) {
  return await db.transaction(async (tx) => {
    // Create order
    const order = await tx.insert(orderSchema).values({...}).returning();

    // Create order details
    const orderDetails = await tx.insert(orderDetailsSchema).values([...]);

    // Update inventory or other related operations

    return { order, orderDetails };
  });
}
```

### Error Handling Strategy
- **TransactionError**: Database transaction failures
- **ValidationError**: Business rule violations
- **NotFoundError**: Resource not found errors
- **ConflictError**: Status transition conflicts

### Testing Strategy
- **Unit Tests**: Service method testing with mocked database
- **Transaction Tests**: Rollback scenarios and error handling
- **Integration Tests**: Database interaction testing
- **Performance Tests**: Transaction performance validation

## Dependencies
- Database schemas from T04-T05 (Orders, Order Details, Price/Unit)
- Customer and Product services from T08
- Drizzle ORM configuration from src/libs/DB.ts
- TypeScript type definitions
- Error handling utilities
- Logging framework

## Files to Create/Modify
- `src/services/order-management/order.service.ts`
- `src/services/order-management/price.service.ts`
- `src/types/order-management/order-dtos.ts`
- `src/types/order-management/price-dtos.ts`
- `src/types/order-management/transaction-errors.ts`
- `src/utils/order-management/order-validators.ts`
- `tests/services/order-management/order.service.test.ts`
- `tests/services/order-management/price.service.test.ts`

## Success Metrics
- Transaction success rate > 99% for order creation
- Order status transitions validate correctly 100% of time
- Price calculation accuracy 100%
- Error handling coverage > 90%
- Unit test coverage > 80% for service methods
