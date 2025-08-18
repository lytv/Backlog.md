# M03: API Specifications

## Overview
This document defines the RESTful API endpoints for Milestone 3: Production Process Core. These APIs manage production processes, stages, worker assignments, and production order lifecycle.

## Base Configuration
- **Base URL**: `/api/v1`
- **Authentication**: Bearer token via Clerk
- **Content-Type**: `application/json`
- **Rate Limiting**: 100 requests per minute per user
- **Real-time Updates**: WebSocket for production tracking

## Production Process APIs

### 1. List Production Processes
Get all production process templates.

**Endpoint**: `GET /api/v1/production-processes`

**Query Parameters**:
- `category` (string) - Filter by category
- `isActive` (boolean) - Filter active processes
- `search` (string) - Search in name, code
- `tags` (array) - Filter by tags
- `page`, `limit`, `sortBy`, `sortOrder`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "processCode": "PROC-SHIRT-001",
      "name": "Standard Shirt Production",
      "category": "Shirt",
      "estimatedDays": 5.5,
      "stageCount": 12,
      "isActive": true,
      "isDefault": true,
      "version": 1,
      "tags": ["standard", "shirt", "quick"],
      "usageCount": 45
    }
  ]
}
```

### 2. Get Process Details
Get complete process with all stages.

**Endpoint**: `GET /api/v1/production-processes/:id`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "processCode": "PROC-SHIRT-001",
    "name": "Standard Shirt Production",
    "description": "Standard process for shirt manufacturing",
    "category": "Shirt",
    "estimatedDays": 5.5,
    "isActive": true,
    "stages": [
      {
        "id": 1,
        "stageCode": "CUT",
        "name": "Cutting",
        "sequenceOrder": 1,
        "standardDurationHours": 2.0,
        "instructions": "Cut fabric according to pattern",
        "skillLevel": "intermediate",
        "isQcPoint": true,
        "isFinalStage": false,
        "assignedWorkers": 3
      }
    ],
    "createdBy": {
      "id": 1,
      "fullName": "Admin User"
    },
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### 3. Create Production Process
Create new process template.

**Endpoint**: `POST /api/v1/production-processes`

**Request Body**:
```json
{
  "processCode": "PROC-PANT-001",
  "name": "Standard Pant Production",
  "category": "Pant",
  "description": "Process for pant manufacturing",
  "tags": ["standard", "pant"],
  "stages": [
    {
      "stageCode": "CUT",
      "name": "Cutting",
      "sequenceOrder": 1,
      "standardDurationHours": 3.0,
      "instructions": "Cut fabric pieces",
      "skillLevel": "intermediate",
      "isQcPoint": true
    }
  ]
}
```

**Business Rules**:
- Process code must be unique
- At least one stage required
- One stage must be marked as final
- Sequence orders must be continuous

**Response**: `201 Created`

### 4. Update Production Process
Update process (creates new version).

**Endpoint**: `PUT /api/v1/production-processes/:id`

**Business Rules**:
- Creates new version if used in production
- Updates in-place if never used
- Cannot modify active production orders

### 5. Clone Production Process
Create copy of existing process.

**Endpoint**: `POST /api/v1/production-processes/:id/clone`

**Request Body**:
```json
{
  "newCode": "PROC-SHIRT-002",
  "newName": "Premium Shirt Production"
}
```

### 6. Deactivate Process
Mark process as inactive.

**Endpoint**: `DELETE /api/v1/production-processes/:id`

## Production Stage APIs

### 7. List Stages
Get stages for a process.

**Endpoint**: `GET /api/v1/production-processes/:processId/stages`

**Response**: Array of stages in sequence order

### 8. Create Stage
Add stage to process.

**Endpoint**: `POST /api/v1/production-stages`

**Request Body**:
```json
{
  "processId": 1,
  "stageCode": "SEW",
  "name": "Sewing",
  "sequenceOrder": 2,
  "standardDurationHours": 4.0,
  "instructions": "Sew according to specification",
  "qualityChecklist": [
    "Check stitch quality",
    "Verify measurements"
  ],
  "skillLevel": "advanced",
  "isQcPoint": true
}
```

### 9. Update Stage
Modify stage details.

**Endpoint**: `PUT /api/v1/production-stages/:id`

### 10. Reorder Stages
Change stage sequence.

**Endpoint**: `PUT /api/v1/production-stages/reorder`

**Request Body**:
```json
{
  "processId": 1,
  "stages": [
    { "stageId": 1, "sequenceOrder": 1 },
    { "stageId": 3, "sequenceOrder": 2 },
    { "stageId": 2, "sequenceOrder": 3 }
  ]
}
```

### 11. Delete Stage
Remove stage from process.

**Endpoint**: `DELETE /api/v1/production-stages/:id`

**Business Rules**:
- Cannot delete if orders in this stage
- Resequences remaining stages

## Worker Assignment APIs

### 12. List Assignments
Get worker-stage assignments.

**Endpoint**: `GET /api/v1/stage-assignments`

**Query Parameters**:
- `stageId` - Filter by stage
- `userId` - Filter by worker
- `isActive` - Active assignments only
- `shift` - Filter by shift

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "stage": {
        "id": 1,
        "name": "Cutting",
        "processName": "Standard Shirt"
      },
      "worker": {
        "id": 5,
        "fullName": "Nguyen Van A",
        "currentLoad": 5,
        "maxCapacity": 10
      },
      "assignmentType": "primary",
      "shift": "morning",
      "effectiveFrom": "2024-01-01",
      "isActive": true
    }
  ]
}
```

### 13. Create Assignment
Assign worker to stage.

**Endpoint**: `POST /api/v1/stage-assignments`

**Request Body**:
```json
{
  "stageId": 1,
  "userId": 5,
  "assignmentType": "primary",
  "shift": "morning",
  "maxCapacity": 10,
  "effectiveFrom": "2024-01-01"
}
```

### 14. Update Assignment
Modify assignment details.

**Endpoint**: `PUT /api/v1/stage-assignments/:id`

### 15. Bulk Assign Workers
Assign multiple workers at once.

**Endpoint**: `POST /api/v1/stage-assignments/bulk`

**Request Body**:
```json
{
  "stageId": 1,
  "assignments": [
    { "userId": 5, "type": "primary", "shift": "morning" },
    { "userId": 6, "type": "backup", "shift": "morning" }
  ]
}
```

### 16. Get Worker Schedule
View worker's assigned stages.

**Endpoint**: `GET /api/v1/workers/:userId/assignments`

**Response**: List of stages assigned to worker

## Production Order APIs

### 17. Create Production Orders
Convert sales orders to production.

**Endpoint**: `POST /api/v1/production-orders`

**Request Body**:
```json
{
  "orderDetailId": 1,
  "processId": 1,
  "priority": "normal",
  "plannedStartDate": "2024-02-01T08:00:00Z",
  "specialInstructions": "Rush order",
  "quantityToProduce": 100
}
```

**Business Rules**:
- Order must be confirmed status
- Process must be active
- Start date must be future
- Auto-generates production number

**Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "productionNumber": "PROD-2024-0001",
    "status": "planned",
    "estimatedEndDate": "2024-02-06T17:00:00Z"
  }
}
```

### 18. List Production Orders
Get production orders with filters.

**Endpoint**: `GET /api/v1/production-orders`

**Query Parameters**:
- `status` - planned|in_production|completed|on_hold|cancelled
- `priority` - urgent|high|normal|low
- `isDelayed` - Show only delayed orders
- `currentStageId` - Orders at specific stage
- `startDate`, `endDate` - Date range
- `search` - Search in production number

### 19. Get Production Details
Complete production order information.

**Endpoint**: `GET /api/v1/production-orders/:id`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "productionNumber": "PROD-2024-0001",
    "orderInfo": {
      "orderNumber": "ORD-2024-0001",
      "customer": "Shinwon Vina",
      "product": "Black Fabric",
      "color": "Black",
      "quantity": 100,
      "unit": "kg"
    },
    "process": {
      "id": 1,
      "name": "Standard Process",
      "totalStages": 10
    },
    "currentStage": {
      "id": 3,
      "name": "Sewing",
      "sequenceOrder": 3
    },
    "progress": {
      "stagesCompleted": 2,
      "percentComplete": 20,
      "quantityCompleted": 0,
      "estimatedCompletion": "2024-02-06T17:00:00Z"
    },
    "timeline": [
      {
        "stageId": 1,
        "stageName": "Cutting",
        "status": "pass",
        "startTime": "2024-02-01T08:00:00Z",
        "endTime": "2024-02-01T10:30:00Z",
        "worker": "Nguyen Van A"
      }
    ]
  }
}
```

### 20. Update Production Status
Change production order status.

**Endpoint**: `PUT /api/v1/production-orders/:id/status`

**Request Body**:
```json
{
  "status": "on_hold",
  "reason": "Material shortage"
}
```

### 21. Start Production
Begin production process.

**Endpoint**: `POST /api/v1/production-orders/:id/start`

**Business Rules**:
- Creates stage tracking records
- Assigns to first stage workers
- Updates status to in_production

## Stage Tracking APIs

### 22. Get Current Stage Status
Get current stage for production order.

**Endpoint**: `GET /api/v1/production-orders/:id/current-stage`

### 23. Update Stage Status
Worker updates stage status.

**Endpoint**: `PUT /api/v1/stage-tracking/:id/status`

**Request Body**:
```json
{
  "status": "pass",
  "qualityScore": 95,
  "checkNotes": "Good quality",
  "defectsFound": 0
}
```

**Status Options**:
- `in_progress` - Started working
- `pass` - Passed QC, move to next
- `fail` - Failed QC, stop production
- `pending` - Need more time

**Business Rules**:
- Only assigned worker can update
- Pass moves to next stage automatically
- Fail requires manager intervention

### 24. Assign Worker to Stage
Assign/reassign worker to stage.

**Endpoint**: `PUT /api/v1/stage-tracking/:id/assign`

**Request Body**:
```json
{
  "userId": 5
}
```

### 25. Upload Stage Photos
Attach photos to stage tracking.

**Endpoint**: `POST /api/v1/stage-tracking/:id/photos`

**Request**: Multipart form data with images

**Response**: Array of uploaded file names

## Production Planning APIs

### 26. Get Production Calendar
View production schedule.

**Endpoint**: `GET /api/v1/planning/calendar`

**Query Parameters**:
- `startDate`, `endDate` - Date range
- `view` - day|week|month
- `stageId` - Filter by stage
- `workerId` - Filter by worker

### 27. Check Capacity
Verify production capacity.

**Endpoint**: `POST /api/v1/planning/check-capacity`

**Request Body**:
```json
{
  "processId": 1,
  "quantity": 100,
  "targetDate": "2024-02-15"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "hasCapacity": true,
    "suggestedStartDate": "2024-02-10",
    "bottlenecks": [],
    "workerAvailability": 85
  }
}
```

### 28. Bulk Plan Orders
Plan multiple orders at once.

**Endpoint**: `POST /api/v1/planning/bulk`

**Request Body**:
```json
{
  "orders": [
    {
      "orderDetailId": 1,
      "processId": 1,
      "priority": "high"
    }
  ],
  "startDate": "2024-02-01"
}
```

## Analytics APIs

### 29. Get Process Performance
Process efficiency metrics.

**Endpoint**: `GET /api/v1/analytics/process-performance`

**Query Parameters**:
- `processId` - Specific process
- `startDate`, `endDate` - Date range

**Response**:
```json
{
  "success": true,
  "data": {
    "processId": 1,
    "metrics": {
      "averageCompletionDays": 5.2,
      "onTimeRate": 85.5,
      "rejectionRate": 2.3,
      "stageBottlenecks": [
        {
          "stageId": 3,
          "stageName": "Sewing",
          "averageDelay": 2.5
        }
      ]
    }
  }
}
```

### 30. Get Worker Performance
Worker productivity metrics.

**Endpoint**: `GET /api/v1/analytics/worker-performance/:userId`

### 31. Get Stage Analytics
Stage-level performance data.

**Endpoint**: `GET /api/v1/analytics/stage/:stageId`

## Real-time WebSocket Events

### Connection
```javascript
const socket = io('/production', {
  auth: { token: bearerToken }
});
```

### Events

**Subscribe to production updates**:
```javascript
socket.emit('subscribe', {
  productionOrderId: 1
});
```

**Stage status changed**:
```javascript
socket.on('stage:updated', (data) => {
  // {productionOrderId, stageId, newStatus, worker}
});
```

**Production completed**:
```javascript
socket.on('production:completed', (data) => {
  // {productionOrderId, completionTime}
});
```

**Delay alert**:
```javascript
socket.on('production:delayed', (data) => {
  // {productionOrderId, stageId, delayHours}
});
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| PROCESS_NOT_FOUND | 404 | Process ID invalid |
| STAGE_NOT_FOUND | 404 | Stage ID invalid |
| WORKER_NOT_ASSIGNED | 403 | Worker not assigned to stage |
| INVALID_STAGE_ORDER | 400 | Stage sequence invalid |
| PRODUCTION_IN_PROGRESS | 400 | Cannot modify active production |
| CAPACITY_EXCEEDED | 400 | Worker capacity limit reached |
| INVALID_TRANSITION | 400 | Status transition not allowed |

## Performance Optimization
- Cached process definitions
- Indexed stage assignments
- Optimized worker load queries
- Batch status updates
- Connection pooling for real-time
