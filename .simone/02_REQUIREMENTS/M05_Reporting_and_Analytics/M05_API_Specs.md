# M05: API Specifications

## Overview
This document defines the API specifications for Milestone 5: Reporting and Analytics. It includes endpoints for dashboards, report generation, data export, analytics queries, and custom report builder functionality.

## Base Configuration
- **Base URL**: `/api/v1`
- **Authentication**: Bearer token via Clerk
- **Content-Type**: `application/json` for requests, varies for responses
- **Rate Limiting**: 50 requests per minute for reports
- **Caching**: ETags and conditional requests supported

## Dashboard APIs

### 1. Get Dashboard Configuration
Retrieve user's dashboard layout and widgets.

**Endpoint**: `GET /api/v1/analytics/dashboards`

**Query Parameters**:
- `dashboardId` (integer) - Specific dashboard ID
- `default` (boolean) - Get default dashboard

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Executive Dashboard",
    "isDefault": true,
    "layout": {
      "widgets": [
        {
          "id": "orders-kpi",
          "position": { "x": 0, "y": 0, "w": 4, "h": 2 },
          "config": {
            "title": "Total Orders",
            "metric": "orders.count",
            "comparison": "previous_period",
            "format": "number"
          }
        }
      ]
    },
    "filters": {
      "dateRange": "last_30_days",
      "processId": null
    },
    "lastUpdated": "2024-01-20T10:00:00Z"
  }
}
```

### 2. Get Dashboard Data
Fetch data for all widgets in a dashboard.

**Endpoint**: `GET /api/v1/analytics/dashboards/:dashboardId/data`

**Query Parameters**:
- `dateRange` (string) - today|yesterday|last_7_days|last_30_days|custom
- `startDate` (date) - For custom range
- `endDate` (date) - For custom range
- `processId` (integer) - Filter by process
- `refresh` (boolean) - Force refresh cache

**Response**:
```json
{
  "success": true,
  "data": {
    "widgets": {
      "orders-kpi": {
        "value": 1234,
        "previousValue": 1100,
        "change": 12.18,
        "trend": "up",
        "sparkline": [1050, 1080, 1100, 1150, 1234]
      },
      "efficiency-gauge": {
        "value": 87.5,
        "target": 85,
        "status": "good",
        "ranges": {
          "poor": [0, 70],
          "fair": [70, 85],
          "good": [85, 100]
        }
      },
      "production-trend": {
        "series": [
          {
            "name": "Completed",
            "data": [[1705708800000, 45], [1705795200000, 52]]
          },
          {
            "name": "In Progress",
            "data": [[1705708800000, 23], [1705795200000, 19]]
          }
        ],
        "categories": ["2024-01-20", "2024-01-21"]
      }
    },
    "metadata": {
      "generatedAt": "2024-01-20T10:30:00Z",
      "cacheKey": "dash_1_20240120",
      "nextRefresh": "2024-01-20T10:35:00Z"
    }
  }
}
```

### 3. Update Dashboard Layout
Save dashboard configuration changes.

**Endpoint**: `PUT /api/v1/analytics/dashboards/:dashboardId`

**Request Body**:
```json
{
  "name": "My Custom Dashboard",
  "layout": {
    "widgets": [
      {
        "id": "orders-kpi",
        "position": { "x": 0, "y": 0, "w": 6, "h": 3 }
      }
    ]
  },
  "filters": {
    "dateRange": "last_7_days"
  },
  "isDefault": true
}
```

**Response**: `200 OK`

### 4. Get Available Widgets
List all available dashboard widgets.

**Endpoint**: `GET /api/v1/analytics/widgets`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "orders-kpi",
      "name": "Orders KPI",
      "type": "metric",
      "category": "orders",
      "description": "Total orders with trend",
      "defaultSize": { "w": 4, "h": 2 },
      "configurable": {
        "metric": ["count", "value"],
        "comparison": ["previous_period", "previous_year"],
        "format": ["number", "currency", "percentage"]
      }
    }
  ]
}
```

## Report Generation APIs

### 5. List Reports
Get available reports for user.

**Endpoint**: `GET /api/v1/reports`

**Query Parameters**:
- `category` (string) - production|quality|order|financial
- `search` (string) - Search in name/description
- `page`, `limit` - Pagination

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "daily-production",
      "name": "Daily Production Summary",
      "category": "production",
      "description": "Overview of daily production activities",
      "lastRun": "2024-01-20T06:00:00Z",
      "scheduleEnabled": true,
      "parameters": [
        {
          "name": "date",
          "type": "date",
          "required": true,
          "default": "today"
        }
      ]
    }
  ]
}
```

### 6. Generate Report
Execute a report with parameters.

**Endpoint**: `POST /api/v1/reports/:reportId/generate`

**Request Body**:
```json
{
  "parameters": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "processId": 1,
    "groupBy": "week"
  },
  "format": "pdf",
  "options": {
    "includeCharts": true,
    "pageOrientation": "landscape"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "executionId": "exec_123456",
    "status": "processing",
    "estimatedTime": 5,
    "pollUrl": "/api/v1/reports/executions/exec_123456"
  }
}
```

### 7. Get Report Status
Check report generation status.

**Endpoint**: `GET /api/v1/reports/executions/:executionId`

**Response (Processing)**:
```json
{
  "success": true,
  "data": {
    "executionId": "exec_123456",
    "status": "processing",
    "progress": 65,
    "currentStep": "Generating charts"
  }
}
```

**Response (Completed)**:
```json
{
  "success": true,
  "data": {
    "executionId": "exec_123456",
    "status": "completed",
    "downloadUrl": "/api/v1/reports/download/exec_123456",
    "expiresAt": "2024-01-21T10:00:00Z",
    "fileSize": 1048576,
    "pageCount": 12
  }
}
```

### 8. Download Report
Download generated report file.

**Endpoint**: `GET /api/v1/reports/download/:executionId`

**Headers**:
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="daily-production-20240120.pdf"
```

**Response**: Binary file data

### 9. Schedule Report
Create or update report schedule.

**Endpoint**: `POST /api/v1/reports/:reportId/schedule`

**Request Body**:
```json
{
  "scheduleName": "Daily Production Report",
  "cronExpression": "0 6 * * *",
  "timezone": "Asia/Ho_Chi_Minh",
  "deliveryType": "email",
  "deliveryConfig": {
    "recipients": ["manager@vtlsaas.com"],
    "ccRecipients": [],
    "subject": "Daily Production Report - {date}",
    "body": "Please find attached the daily production report."
  },
  "outputFormat": "pdf",
  "parameters": {
    "date": "{yesterday}"
  }
}
```

**Response**: `201 Created`

## Analytics Query APIs

### 10. Production Analytics
Get production performance metrics.

**Endpoint**: `GET /api/v1/analytics/production`

**Query Parameters**:
- `dateRange` - Date range selection
- `groupBy` - day|week|month|quarter
- `processId` - Filter by process
- `stageId` - Filter by stage
- `metrics` - Comma-separated: efficiency,quality,delays

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalOrders": 450,
      "completedOrders": 380,
      "avgCycleTime": 5.2,
      "efficiencyRate": 87.5,
      "onTimeDelivery": 92.3
    },
    "trends": [
      {
        "date": "2024-01-15",
        "orders": 45,
        "efficiency": 85.2,
        "delays": 3
      }
    ],
    "breakdown": {
      "byProcess": [
        {
          "processId": 1,
          "processName": "Standard Shirt",
          "orders": 250,
          "efficiency": 88.5
        }
      ],
      "byStage": [
        {
          "stageId": 3,
          "stageName": "Sewing",
          "avgDuration": 240,
          "delayRate": 15.2
        }
      ]
    }
  }
}
```

### 11. Quality Analytics
Quality metrics and defect analysis.

**Endpoint**: `GET /api/v1/analytics/quality`

**Query Parameters**:
- `dateRange` - Date range
- `processId` - Filter by process
- `workerId` - Filter by worker
- `groupBy` - stage|worker|product|date

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalInspections": 1250,
      "passRate": 98.2,
      "avgQualityScore": 94.5,
      "totalDefects": 23,
      "reworkRate": 1.8
    },
    "defectAnalysis": [
      {
        "category": "Stitching",
        "count": 12,
        "percentage": 52.2,
        "trend": "decreasing"
      }
    ],
    "topIssues": [
      {
        "stage": "Sewing",
        "issue": "Uneven seams",
        "frequency": 8,
        "impact": "high"
      }
    ]
  }
}
```

### 12. Worker Performance
Individual and team performance metrics.

**Endpoint**: `GET /api/v1/analytics/workers`

**Query Parameters**:
- `dateRange` - Date range
- `workerId` - Specific worker or all
- `stageId` - Filter by stage
- `sortBy` - efficiency|quality|quantity

**Response**:
```json
{
  "success": true,
  "data": {
    "workers": [
      {
        "id": 10,
        "name": "Nguyen Van A",
        "metrics": {
          "ordersProcessed": 125,
          "avgProcessingTime": 118,
          "efficiencyRate": 102.5,
          "qualityScore": 96.5,
          "reworkRate": 1.2
        },
        "ranking": 2,
        "trend": "improving"
      }
    ],
    "teamAverage": {
      "ordersProcessed": 98,
      "efficiencyRate": 95.5,
      "qualityScore": 94.2
    }
  }
}
```

### 13. Order Analytics
Order fulfillment and delivery analysis.

**Endpoint**: `GET /api/v1/analytics/orders`

**Response**:
```json
{
  "success": true,
  "data": {
    "fulfillment": {
      "onTimeRate": 92.5,
      "avgLeadTime": 5.2,
      "backlogCount": 45,
      "overdueCount": 8
    },
    "byCustomer": [
      {
        "customerId": 1,
        "customerName": "Shinwon Vina",
        "orderCount": 125,
        "revenue": 625000000,
        "avgOrderValue": 5000000,
        "satisfaction": 95.5
      }
    ],
    "byProduct": [
      {
        "productId": 1,
        "productName": "Black Fabric",
        "orderCount": 85,
        "quantity": 8500,
        "revenue": 425000000
      }
    ]
  }
}
```

## Custom Report Builder APIs

### 14. Get Data Sources
List available data sources for report builder.

**Endpoint**: `GET /api/v1/reports/builder/sources`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "orders",
      "name": "Orders",
      "tables": [
        {
          "name": "orders",
          "alias": "Order Headers",
          "fields": [
            {
              "name": "order_number",
              "type": "string",
              "label": "Order Number"
            }
          ]
        }
      ],
      "relationships": [
        {
          "from": "orders.id",
          "to": "order_details.order_id",
          "type": "one_to_many"
        }
      ]
    }
  ]
}
```

### 15. Validate Query
Validate custom report query.

**Endpoint**: `POST /api/v1/reports/builder/validate`

**Request Body**:
```json
{
  "query": {
    "select": ["orders.order_number", "customers.name", "SUM(order_details.total_price)"],
    "from": "orders",
    "joins": [
      {
        "table": "customers",
        "on": "orders.customer_id = customers.id"
      }
    ],
    "where": "orders.order_date >= '2024-01-01'",
    "groupBy": ["orders.order_number", "customers.name"],
    "orderBy": "SUM(order_details.total_price) DESC",
    "limit": 100
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "estimatedRows": 1250,
    "warnings": [
      "Large result set, consider adding filters"
    ]
  }
}
```

### 16. Save Custom Report
Save report definition.

**Endpoint**: `POST /api/v1/reports/builder/save`

**Request Body**:
```json
{
  "name": "Top Customers by Revenue",
  "category": "financial",
  "query": { /* query object */ },
  "layout": {
    "type": "table",
    "columns": [
      { "field": "customer_name", "width": 200 },
      { "field": "total_revenue", "width": 150, "format": "currency" }
    ]
  },
  "parameters": [
    {
      "name": "startDate",
      "type": "date",
      "label": "Start Date",
      "required": true
    }
  ]
}
```

**Response**: `201 Created`

## Export APIs

### 17. Export Data
Export raw data in various formats.

**Endpoint**: `POST /api/v1/analytics/export`

**Request Body**:
```json
{
  "dataType": "production_orders",
  "filters": {
    "dateRange": "last_30_days",
    "status": ["completed", "in_production"]
  },
  "fields": ["order_number", "customer_name", "product", "quantity", "status"],
  "format": "excel",
  "options": {
    "includeHeaders": true,
    "dateFormat": "YYYY-MM-DD"
  }
}
```

**Response**: File download or async job

### 18. Get Export Templates
List available export templates.

**Endpoint**: `GET /api/v1/analytics/export/templates`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "orders-export",
      "name": "Orders Export",
      "description": "Standard order export with customer details",
      "fields": ["order_number", "customer", "product", "quantity", "amount"],
      "defaultFormat": "excel"
    }
  ]
}
```

## Real-time Analytics APIs

### 19. Subscribe to Metrics
WebSocket endpoint for real-time metrics.

**Connection**:
```javascript
const analyticsSocket = io('/analytics', {
  auth: { token: bearerToken }
});

// Subscribe to metrics
analyticsSocket.emit('subscribe:metrics', {
  metrics: ['active_orders', 'efficiency_rate', 'delays']
});

// Receive updates
analyticsSocket.on('metrics:update', (data) => {
  // { metric: 'active_orders', value: 125, timestamp: '...' }
});
```

### 20. Get Live Statistics
Current system statistics.

**Endpoint**: `GET /api/v1/analytics/live`

**Response**:
```json
{
  "success": true,
  "data": {
    "timestamp": "2024-01-20T10:30:00Z",
    "stats": {
      "activeOrders": 125,
      "workersOnline": 45,
      "currentEfficiency": 88.5,
      "ordersCompletedToday": 78,
      "avgCycleTimeToday": 4.8
    },
    "alerts": [
      {
        "type": "delay",
        "message": "3 orders delayed in Sewing stage",
        "severity": "warning"
      }
    ]
  }
}
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "REPORT_GENERATION_FAILED",
    "message": "Failed to generate report due to insufficient data",
    "details": {
      "reportId": 1,
      "missingData": ["production_orders for date range"]
    }
  }
}
```

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| REPORT_NOT_FOUND | 404 | Report definition not found |
| INVALID_PARAMETERS | 400 | Invalid report parameters |
| GENERATION_TIMEOUT | 504 | Report generation timeout |
| EXPORT_SIZE_LIMIT | 413 | Export exceeds size limit |
| RATE_LIMIT_EXCEEDED | 429 | Too many report requests |
| INSUFFICIENT_DATA | 422 | Not enough data for analysis |

## Performance Guidelines
1. Use caching headers (ETag, Last-Modified)
2. Implement pagination for large datasets
3. Use field selection to reduce payload
4. Schedule heavy reports during off-peak
5. Implement query timeouts (30s max)
6. Use streaming for large exports
