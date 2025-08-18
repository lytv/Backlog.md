# M02: Order Management Module - Product Requirements Document

## Overview
This milestone implements the complete order management system for VTL SaaS, including customer management, product catalog, order processing, and delivery tracking. This module forms the business foundation for production planning.

## Milestone Objectives
- Implement comprehensive customer relationship management
- Create product catalog with fabric specifications
- Build order creation and tracking system
- Implement pricing and history management
- Set up delivery tracking mechanisms

## Timeline
- **Duration**: 4-5 weeks
- **Dependencies**: M01 (Foundation completed)
- **Team Size**: 2 backend developers, 1 frontend developer

## Deliverables

### 1. Customer Management
- Customer profile creation and management
- Contact information tracking
- Customer categorization (VIP, Regular, New)
- Order history per customer
- Credit limit management
- Customer search and filtering

### 2. Product Catalog
- Fabric product management
- Specifications tracking:
  - Width (inches and cm)
  - Weight (g/yd and g/m2)
  - Fabric composition
  - Special properties (REC, W/R, TPG, TPX)
- Color variant management
- Product-color availability matrix
- Product image galleries
- Import/export capabilities

### 3. Order Processing
- Order creation workflow
- Order number generation (unique)
- Single product per order constraint
- Quantity and pricing calculation
- Delivery date scheduling
- Special instructions handling
- Order status management:
  - Draft
  - Confirmed
  - In Production
  - Completed
  - Cancelled

### 4. Pricing Management
- Base pricing per product
- Color-based pricing variations
- Quantity tier pricing
- Price history tracking
- Currency support (VND primary)
- Discount management
- Price approval workflow

### 5. Unit Management
- Multiple unit support:
  - Weight: kg, g, lb
  - Length: m, yard, inch, cm
  - Area: m², yard²
- Unit conversion system
- Display preferences per user

## Success Criteria
- [ ] Complete customer CRUD operations functional
- [ ] Product catalog supports all fabric specifications
- [ ] Order creation completes in < 3 seconds
- [ ] Price calculations accurate to 2 decimal places
- [ ] Order history loads within 2 seconds
- [ ] Search returns results in < 500ms
- [ ] Data integrity maintained across all operations
- [ ] Mobile-responsive interfaces

## Technical Specifications

### Database Schema Additions
```sql
-- Customers table
customers (
  id, customer_code, name, address, phone,
  contact_person, contact_phone, customer_type,
  credit_limit, current_balance, created_at, updated_at
)

-- Products table
products (
  id, product_code, name, fabric_type,
  width_inch, width_cm, weight_gyd, weight_gm2,
  specifications, description, created_at, updated_at
)

-- Orders table
orders (
  id, order_number, customer_id, order_date,
  delivery_to, status, special_instructions,
  total_amount, created_by, created_at, updated_at
)

-- Order details table
order_details (
  id, order_id, product_id, color_id,
  quantity_kg, quantity_yard, unit_price,
  total_price, delivery_date, notes
)
```

### API Endpoints
- **Customers**:
  - GET /api/customers
  - GET /api/customers/:id
  - POST /api/customers
  - PUT /api/customers/:id
  - DELETE /api/customers/:id
  - GET /api/customers/:id/orders

- **Products**:
  - GET /api/products
  - GET /api/products/:id
  - POST /api/products
  - PUT /api/products/:id
  - DELETE /api/products/:id
  - GET /api/products/:id/colors
  - POST /api/products/:id/colors

- **Orders**:
  - GET /api/orders
  - GET /api/orders/:id
  - POST /api/orders
  - PUT /api/orders/:id
  - PUT /api/orders/:id/status
  - DELETE /api/orders/:id

## User Interface Requirements

### Customer Management
- Customer list with data table
- Quick search bar
- Advanced filter panel
- Customer detail view with tabs:
  - Basic Information
  - Contact Details
  - Order History
  - Account Balance

### Product Catalog
- Product grid/list view toggle
- Filter by specifications
- Color availability matrix
- Quick edit capabilities
- Bulk import interface

### Order Creation
- Step-by-step wizard:
  1. Select Customer
  2. Choose Product
  3. Select Color
  4. Enter Quantities
  5. Set Delivery Details
  6. Review & Confirm
- Real-time price calculation
- Validation at each step

## Business Rules
1. Customer code must be unique and auto-generated
2. Orders require confirmed customer
3. Product must have at least one color
4. Prices must be positive numbers
5. Delivery date must be future date
6. Order cancellation requires reason
7. Quantity changes recalculate totals
8. Credit limit enforcement optional

## Risks and Mitigations
- **Risk**: Complex pricing rules
  - **Mitigation**: Implement rule engine pattern
- **Risk**: Data migration from legacy
  - **Mitigation**: Build import tools early
- **Risk**: Performance with large catalogs
  - **Mitigation**: Implement pagination and caching

## Integration Points
- Customer data available for M03 (Production)
- Order data feeds into production planning
- Product specifications used in quality control
- Pricing data for financial reporting

## Future Considerations
- Multi-currency support
- Customer portal access
- EDI integration
- Barcode/QR code generation
- Advanced pricing rules engine
