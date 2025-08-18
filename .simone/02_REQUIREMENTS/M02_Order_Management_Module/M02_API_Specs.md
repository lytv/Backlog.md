# M02: API Specifications

## Overview
This document defines the RESTful API endpoints for Milestone 2: Order Management Module. All endpoints follow REST conventions and return JSON responses.

## Base Configuration
- **Base URL**: `/api/v1`
- **Authentication**: Bearer token via Clerk
- **Content-Type**: `application/json`
- **Rate Limiting**: 100 requests per minute per user
- **Pagination**: Default 20 items, max 100

## Customer Management APIs

### 1. List Customers
Get paginated list of customers with filtering options.

**Endpoint**: `GET /api/v1/customers`

**Query Parameters**:
- `page` (integer, default: 1)
- `limit` (integer, default: 20, max: 100)
- `search` (string) - Search in name, code, phone
- `type` (string) - Filter by customer_type: vip|regular|new
- `isActive` (boolean) - Filter by active status
- `sortBy` (string) - Field to sort by
- `sortOrder` (string) - asc|desc

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customerCode": "CUST-0001",
      "name": "Shinwon Vina",
      "customerType": "vip",
      "phone": "+84274380134",
      "email": "contact@shinwon.com",
      "contactPerson": "Quynh Nhu",
      "creditLimit": 50000000,
      "currentBalance": 12500000,
      "isActive": true,
      "lastOrderDate": "2024-01-15",
      "totalOrders": 25
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

### 2. Get Customer Details
Get single customer with complete information.

**Endpoint**: `GET /api/v1/customers/:id`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "customerCode": "CUST-0001",
    "name": "Shinwon Vina",
    "nameEn": "Shinwon Vina Co., Ltd",
    "customerType": "vip",
    "taxCode": "0123456789",
    "address": "Lot 26 VSIP II-A, Street 24, VSIP II-A",
    "city": "Binh Duong",
    "district": "Tan Uyen",
    "phone": "+84274380134",
    "email": "contact@shinwon.com",
    "contactPerson": "Quynh Nhu",
    "contactPhone": "0909099249",
    "creditLimit": 50000000,
    "currentBalance": 12500000,
    "paymentTerms": 30,
    "notes": "Premium customer, priority support",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "statistics": {
      "totalOrders": 25,
      "totalRevenue": 500000000,
      "lastOrderDate": "2024-01-15",
      "averageOrderValue": 20000000
    }
  }
}
```

### 3. Create Customer
Create new customer record.

**Endpoint**: `POST /api/v1/customers`

**Request Body**:
```json
{
  "name": "ABC Textile Co.",
  "nameEn": "ABC Textile Company",
  "customerType": "regular",
  "taxCode": "0987654321",
  "address": "123 Industrial Zone",
  "city": "Ho Chi Minh",
  "district": "District 7",
  "phone": "+84901234567",
  "email": "info@abctextile.com",
  "contactPerson": "John Doe",
  "contactPhone": "+84901234567",
  "creditLimit": 10000000,
  "paymentTerms": 30,
  "notes": "New customer from exhibition"
}
```

**Validation Rules**:
- Name: Required, max 255 chars
- Phone: Required, valid format
- Address: Required
- CustomerType: Must be vip|regular|new
- CreditLimit: Non-negative number
- Email: Valid email format if provided

**Response**: `201 Created`

### 4. Update Customer
Update customer information.

**Endpoint**: `PUT /api/v1/customers/:id`

**Request Body**: Same as create (partial update supported)

**Business Rules**:
- Cannot change customer code
- Balance updates through separate process
- Status change logged to audit

**Response**: `200 OK`

### 5. Delete Customer
Soft delete customer (mark as inactive).

**Endpoint**: `DELETE /api/v1/customers/:id`

**Business Rules**:
- Cannot delete if has active orders
- Cannot delete if balance > 0
- Marks as inactive, not hard delete

**Response**: `200 OK`

### 6. Get Customer Orders
Get order history for specific customer.

**Endpoint**: `GET /api/v1/customers/:id/orders`

**Query Parameters**:
- `status` - Filter by order status
- `startDate` - ISO date string
- `endDate` - ISO date string
- `page`, `limit` - Pagination

**Response**: Order list (see Orders section)

## Product Catalog APIs

### 7. List Products
Get paginated list of products.

**Endpoint**: `GET /api/v1/products`

**Query Parameters**:
- `search` - Search in name, code
- `fabricType` - Filter by fabric type
- `isActive` - Filter active products
- `hasStock` - Filter products with available colors
- `page`, `limit`, `sortBy`, `sortOrder`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "productCode": "BLS-AM-2087-1",
      "name": "Black Stretch Fabric",
      "fabricType": "Stretch",
      "composition": "95% Polyester, 5% Spandex",
      "widthInch": 52,
      "widthCm": 132,
      "weightGyd": 290,
      "weightGm2": 240,
      "specifications": {
        "type": "REC",
        "treatment": "W/R"
      },
      "availableColors": 5,
      "isActive": true
    }
  ]
}
```

### 8. Get Product Details
Get single product with specifications.

**Endpoint**: `GET /api/v1/products/:id`

**Response**: Complete product data including available colors

### 9. Create Product
Create new product.

**Endpoint**: `POST /api/v1/products`

**Request Body**:
```json
{
  "productCode": "NEW-PROD-001",
  "name": "Cotton Blend Fabric",
  "nameEn": "Cotton Blend Fabric",
  "fabricType": "Cotton Blend",
  "composition": "60% Cotton, 40% Polyester",
  "widthInch": 58,
  "widthCm": 147.32,
  "weightGyd": 180,
  "weightGm2": 150,
  "specifications": {
    "treatment": "Pre-shrunk",
    "certification": "OEKO-TEX"
  },
  "description": "High quality cotton blend",
  "minOrderQuantity": 100,
  "leadTimeDays": 15
}
```

### 10. Update Product
Update product information.

**Endpoint**: `PUT /api/v1/products/:id`

### 11. Delete Product
Soft delete product.

**Endpoint**: `DELETE /api/v1/products/:id`

### 12. Get Product Colors
Get available colors for product.

**Endpoint**: `GET /api/v1/products/:id/colors`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "colorId": 5,
      "colorCode": "BLACK",
      "colorName": "Black",
      "hexCode": "#000000",
      "isAvailable": true,
      "minQuantity": 50,
      "currentPrice": 450
    }
  ]
}
```

### 13. Update Product Colors
Set available colors for product.

**Endpoint**: `PUT /api/v1/products/:id/colors`

**Request Body**:
```json
{
  "colors": [
    {
      "colorId": 1,
      "isAvailable": true,
      "minQuantity": 50
    },
    {
      "colorId": 2,
      "isAvailable": false
    }
  ]
}
```

## Color Management APIs

### 14. List Colors
Get all colors in system.

**Endpoint**: `GET /api/v1/colors`

**Query Parameters**:
- `search` - Search in name, code
- `colorGroup` - Filter by color group
- `isActive` - Active status

### 15. Create Color
Add new color to system.

**Endpoint**: `POST /api/v1/colors`

**Request Body**:
```json
{
  "colorCode": "NAVY-001",
  "name": "Navy Blue",
  "nameEn": "Navy Blue",
  "hexCode": "#000080",
  "pantoneCode": "19-3933 TPX",
  "colorGroup": "Blue"
}
```

## Order Management APIs

### 16. List Orders
Get paginated list of orders.

**Endpoint**: `GET /api/v1/orders`

**Query Parameters**:
- `status` - draft|confirmed|in_production|completed|cancelled
- `customerId` - Filter by customer
- `startDate`, `endDate` - Date range
- `search` - Search order number
- `page`, `limit`, `sortBy`, `sortOrder`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "orderNumber": "ORD-2024-0001",
      "customer": {
        "id": 1,
        "name": "Shinwon Vina",
        "code": "CUST-0001"
      },
      "orderDate": "2024-01-15",
      "deliveryDate": "2024-02-15",
      "status": "confirmed",
      "totalAmount": 25000000,
      "currency": "VND",
      "items": 1
    }
  ]
}
```

### 17. Get Order Details
Get complete order information.

**Endpoint**: `GET /api/v1/orders/:id`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "orderNumber": "ORD-2024-0001",
    "customer": {
      "id": 1,
      "name": "Shinwon Vina",
      "code": "CUST-0001",
      "phone": "+84274380134"
    },
    "orderDate": "2024-01-15",
    "deliveryAddress": "Lot 26 VSIP II-A",
    "deliveryDate": "2024-02-15",
    "status": "confirmed",
    "paymentTerms": 30,
    "specialInstructions": "Urgent order",
    "subtotal": 25000000,
    "taxAmount": 2500000,
    "discountAmount": 500000,
    "totalAmount": 27000000,
    "currency": "VND",
    "details": [
      {
        "id": 1,
        "lineNumber": 1,
        "product": {
          "id": 1,
          "code": "BLS-AM-2087-1",
          "name": "Black Stretch Fabric"
        },
        "color": {
          "id": 1,
          "code": "BLACK",
          "name": "Black"
        },
        "quantityOrdered": 100,
        "quantityUnit": "kg",
        "quantityKg": 100,
        "quantityYard": 120.5,
        "unitPrice": 250000,
        "lineTotal": 25000000
      }
    ]
  }
}
```

### 18. Create Order
Create new order (one product only).

**Endpoint**: `POST /api/v1/orders`

**Request Body**:
```json
{
  "customerId": 1,
  "deliveryAddress": "Customer warehouse address",
  "deliveryDate": "2024-02-15",
  "paymentTerms": 30,
  "specialInstructions": "Handle with care",
  "detail": {
    "productId": 1,
    "colorId": 1,
    "quantityOrdered": 100,
    "quantityUnit": "kg",
    "unitPrice": 250000,
    "discountPercent": 2,
    "notes": "First order of the month"
  }
}
```

**Business Rules**:
- Only one product per order
- Delivery date must be future
- Price validated against price list
- Customer credit limit checked

**Response**: `201 Created` with order number

### 19. Update Order
Update order (only if draft/confirmed).

**Endpoint**: `PUT /api/v1/orders/:id`

**Business Rules**:
- Cannot update if in_production
- Cannot change customer
- Price recalculation triggered

### 20. Update Order Status
Change order status with validation.

**Endpoint**: `PUT /api/v1/orders/:id/status`

**Request Body**:
```json
{
  "status": "confirmed",
  "reason": "Payment received"
}
```

**Status Transitions**:
- draft → confirmed
- confirmed → in_production
- in_production → completed
- any → cancelled (with reason)

### 21. Cancel Order
Cancel order with reason.

**Endpoint**: `DELETE /api/v1/orders/:id`

**Request Body**:
```json
{
  "reason": "Customer request"
}
```

## Pricing APIs

### 22. Get Active Prices
Get current prices for products.

**Endpoint**: `GET /api/v1/prices`

**Query Parameters**:
- `productId` - Filter by product
- `colorId` - Filter by color
- `customerType` - vip|regular|new
- `date` - Price as of date

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "productId": 1,
      "productCode": "BLS-AM-2087-1",
      "colorId": 1,
      "colorCode": "BLACK",
      "unitPrice": 450,
      "currency": "VND",
      "validFrom": "2024-01-01",
      "validTo": "2024-12-31",
      "priceListName": "Standard 2024"
    }
  ]
}
```

### 23. Create Price List
Create new price list.

**Endpoint**: `POST /api/v1/price-lists`

### 24. Update Prices
Bulk update prices.

**Endpoint**: `PUT /api/v1/price-lists/:id/items`

## Reporting APIs

### 25. Order Summary Report
Get order statistics.

**Endpoint**: `GET /api/v1/reports/order-summary`

**Query Parameters**:
- `startDate`, `endDate` - Required date range
- `groupBy` - customer|product|status|month
- `customerId` - Optional filter

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalOrders": 150,
      "totalAmount": 750000000,
      "averageOrderValue": 5000000,
      "topCustomers": [...],
      "topProducts": [...]
    },
    "details": [...]
  }
}
```

### 26. Product Sales Report
Get product performance metrics.

**Endpoint**: `GET /api/v1/reports/product-sales`

## Utility APIs

### 27. Generate Order Number
Get next order number in sequence.

**Endpoint**: `GET /api/v1/orders/next-number`

**Response**:
```json
{
  "success": true,
  "data": {
    "nextNumber": "ORD-2024-0156"
  }
}
```

### 28. Calculate Order Total
Calculate prices with current rules.

**Endpoint**: `POST /api/v1/orders/calculate`

**Request Body**: Order detail object

**Response**: Calculated totals

### 29. Check Product Availability
Verify product-color combination exists.

**Endpoint**: `GET /api/v1/products/:productId/colors/:colorId/check`

### 30. Export Orders
Export orders to Excel/CSV.

**Endpoint**: `GET /api/v1/orders/export`

**Query Parameters**: Same as list orders

**Response**: File download

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "CUSTOMER_NOT_FOUND",
    "message": "Customer with ID 123 not found",
    "field": "customerId",
    "details": {}
  }
}
```

### Common Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| CUSTOMER_NOT_FOUND | 404 | Customer ID invalid |
| PRODUCT_NOT_FOUND | 404 | Product ID invalid |
| INVALID_COLOR_COMBINATION | 400 | Product-color not available |
| INSUFFICIENT_CREDIT | 400 | Customer credit limit exceeded |
| INVALID_STATUS_TRANSITION | 400 | Status change not allowed |
| DUPLICATE_ORDER_NUMBER | 409 | Order number already exists |
| QUANTITY_REQUIRED | 400 | Quantity must be > 0 |
| FUTURE_DATE_REQUIRED | 400 | Delivery date must be future |

## Webhooks

### Order Status Changed
Triggered when order status updates.

**Event**: `order.status.changed`

**Payload**:
```json
{
  "event": "order.status.changed",
  "timestamp": "2024-01-20T10:30:00Z",
  "data": {
    "orderId": 1,
    "orderNumber": "ORD-2024-0001",
    "oldStatus": "draft",
    "newStatus": "confirmed",
    "changedBy": "user@example.com"
  }
}
```

### Price List Updated
Triggered when prices change.

**Event**: `price.updated`

## Performance Considerations
- Use field selection to reduce payload size
- Implement cursor-based pagination for large datasets
- Cache price lookups for 5 minutes
- Index frequently searched fields
- Use database views for complex reports
