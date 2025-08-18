# M04: API Specifications

## Overview
This document defines the API specifications for Milestone 4: Kanban Board and Real-time Features. It includes REST endpoints for Kanban board data and WebSocket events for real-time updates.

## Base Configuration
- **REST Base URL**: `/api/v1`
- **WebSocket URL**: `wss://api.vtlsaas.com/socket.io`
- **Authentication**: Bearer token for REST, token in handshake for WebSocket
- **Protocol**: Socket.io for WebSocket, REST for standard APIs

## WebSocket Connection

### 1. Connection Handshake
Establish WebSocket connection with authentication.

**Connection**:
```javascript
const socket = io('wss://api.vtlsaas.com', {
  auth: {
    token: 'Bearer <jwt_token>'
  },
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});
```

**Server Events**:
```javascript
// Connection established
socket.on('connect', ({ userId, connectionId }) => {
  // Connection successful
});

// Authentication failed
socket.on('connect_error', (error) => {
  // Handle auth error
});

// Disconnection
socket.on('disconnect', (reason) => {
  // Handle disconnect
});
```

### 2. Room Subscriptions
Subscribe to specific Kanban boards or orders.

**Subscribe to Process Board**:
```javascript
socket.emit('subscribe:process', {
  processId: 1
});

// Response
socket.on('subscribed:process', {
  processId: 1,
  currentState: { /* board data */ }
});
```

**Subscribe to Order Updates**:
```javascript
socket.emit('subscribe:order', {
  orderId: 123
});
```

**Unsubscribe**:
```javascript
socket.emit('unsubscribe:process', {
  processId: 1
});
```

## WebSocket Events

### 3. Real-time Board Updates

**Stage Status Updated**:
```javascript
// Emitted when order status changes
socket.on('stage:updated', {
  processId: 1,
  stageId: 5,
  orderId: 123,
  previousStatus: 'pending',
  newStatus: 'in_progress',
  workerId: 10,
  workerName: 'Nguyen Van A',
  timestamp: '2024-01-20T10:30:00Z'
});
```

**Order Moved**:
```javascript
// When order moves between stages
socket.on('order:moved', {
  processId: 1,
  orderId: 123,
  fromStageId: 5,
  toStageId: 6,
  movedBy: 'system',
  timestamp: '2024-01-20T10:30:00Z'
});
```

**Order Delayed**:
```javascript
// Delay alert
socket.on('order:delayed', {
  processId: 1,
  orderId: 123,
  stageId: 5,
  delayMinutes: 30,
  standardDuration: 120,
  actualDuration: 150
});
```

**Worker Assignment Changed**:
```javascript
socket.on('worker:assigned', {
  orderId: 123,
  stageId: 5,
  previousWorkerId: 10,
  newWorkerId: 15,
  assignedBy: 12
});
```

**Process Completed**:
```javascript
socket.on('order:completed', {
  processId: 1,
  orderId: 123,
  completionTime: '2024-01-20T15:00:00Z',
  totalDuration: 480 // minutes
});
```

### 4. Presence Events

**User Joined Board**:
```javascript
socket.on('user:joined', {
  processId: 1,
  userId: 20,
  userName: 'Manager Name',
  role: 'manager'
});
```

**User Left Board**:
```javascript
socket.on('user:left', {
  processId: 1,
  userId: 20
});
```

**Active Users Update**:
```javascript
socket.on('users:active', {
  processId: 1,
  users: [
    { userId: 20, userName: 'Manager', role: 'manager' },
    { userId: 25, userName: 'Worker', role: 'worker' }
  ]
});
```

### 5. System Events

**Connection Stats**:
```javascript
socket.on('stats:update', {
  connectedUsers: 45,
  activeBoards: 12,
  updateRate: 120, // updates per minute
  serverTime: '2024-01-20T10:30:00Z'
});
```

**Maintenance Alert**:
```javascript
socket.on('system:maintenance', {
  message: 'System maintenance in 30 minutes',
  scheduledTime: '2024-01-20T22:00:00Z',
  estimatedDuration: 60 // minutes
});
```

## REST API Endpoints

### 6. Get Kanban Board Data
Load initial Kanban board state.

**Endpoint**: `GET /api/v1/kanban/process/:processId`

**Query Parameters**:
- `includeCompleted` (boolean) - Include completed orders
- `limit` (integer) - Max orders per stage
- `priority` (string) - Filter by priority

**Response**:
```json
{
  "success": true,
  "data": {
    "process": {
      "id": 1,
      "name": "Standard Shirt Production",
      "stageCount": 10
    },
    "stages": [
      {
        "id": 1,
        "name": "Cutting",
        "sequenceOrder": 1,
        "capacity": 10,
        "currentLoad": 3,
        "standardDuration": 120,
        "orders": [
          {
            "id": 123,
            "productionNumber": "PROD-2024-0123",
            "orderNumber": "ORD-2024-0045",
            "customer": "Shinwon Vina",
            "product": "Black Fabric",
            "color": "Black",
            "quantity": 100,
            "unit": "kg",
            "priority": "normal",
            "status": "in_progress",
            "enteredStageAt": "2024-01-20T08:00:00Z",
            "timeInStage": 150, // minutes
            "delayStatus": "warning",
            "assignedWorker": {
              "id": 10,
              "name": "Nguyen Van A"
            },
            "completionPercentage": 25
          }
        ]
      }
    ],
    "summary": {
      "totalOrders": 25,
      "delayedOrders": 3,
      "completedToday": 15,
      "activeWorkers": 12
    }
  }
}
```

### 7. Get Order Timeline
View order progression through stages.

**Endpoint**: `GET /api/v1/kanban/orders/:orderId/timeline`

**Response**:
```json
{
  "success": true,
  "data": {
    "order": {
      "id": 123,
      "productionNumber": "PROD-2024-0123",
      "currentStage": "Sewing",
      "currentStatus": "in_progress"
    },
    "timeline": [
      {
        "stageId": 1,
        "stageName": "Cutting",
        "status": "pass",
        "worker": "Nguyen Van A",
        "enteredAt": "2024-01-20T08:00:00Z",
        "exitedAt": "2024-01-20T10:00:00Z",
        "duration": 120,
        "notes": "Good quality"
      }
    ]
  }
}
```

### 8. Update Stage Status (Mobile API)
Simplified API for mobile/tablet updates.

**Endpoint**: `PUT /api/v1/kanban/stage-update`

**Request Body**:
```json
{
  "orderId": 123,
  "stageId": 5,
  "action": "complete", // start|complete|fail|hold
  "qualityScore": 95,
  "notes": "Minor adjustment needed",
  "photos": ["photo1.jpg"]
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "nextStage": {
      "id": 6,
      "name": "Pressing"
    },
    "notification": "Order moved to Pressing"
  }
}
```

### 9. Bulk Status Update
Update multiple orders at once.

**Endpoint**: `PUT /api/v1/kanban/bulk-update`

**Request Body**:
```json
{
  "updates": [
    {
      "orderId": 123,
      "stageId": 5,
      "status": "pass"
    },
    {
      "orderId": 124,
      "stageId": 5,
      "status": "pass"
    }
  ]
}
```

### 10. Get Worker Queue
Get assigned orders for a worker.

**Endpoint**: `GET /api/v1/kanban/worker/queue`

**Response**:
```json
{
  "success": true,
  "data": {
    "worker": {
      "id": 10,
      "name": "Nguyen Van A",
      "currentLoad": 5
    },
    "queue": [
      {
        "orderId": 123,
        "priority": "high",
        "stageName": "Cutting",
        "waitingTime": 30,
        "estimatedDuration": 120
      }
    ]
  }
}
```

### 11. Save View Preferences
Save user's Kanban view settings.

**Endpoint**: `PUT /api/v1/kanban/preferences`

**Request Body**:
```json
{
  "processId": 1,
  "viewMode": "detailed",
  "filters": {
    "priority": ["high", "urgent"],
    "showDelayed": true
  },
  "sortOrder": "priority",
  "columnWidth": 350,
  "autoRefresh": true
}
```

### 12. Get Real-time Metrics
Dashboard metrics for monitoring.

**Endpoint**: `GET /api/v1/kanban/metrics`

**Query Parameters**:
- `processId` - Filter by process
- `period` - today|week|month

**Response**:
```json
{
  "success": true,
  "data": {
    "connections": {
      "active": 45,
      "peak": 78
    },
    "updates": {
      "rate": 120, // per minute
      "total": 5420
    },
    "performance": {
      "avgLatency": 45, // ms
      "p95Latency": 120,
      "uptime": 99.95
    },
    "orders": {
      "active": 125,
      "delayed": 12,
      "completed": 450
    }
  }
}
```

### 13. Export Kanban Snapshot
Export current board state.

**Endpoint**: `GET /api/v1/kanban/export/:processId`

**Query Parameters**:
- `format` - pdf|excel|png
- `includeMetrics` - boolean

**Response**: File download

### 14. Offline Sync
Sync offline updates when reconnected.

**Endpoint**: `POST /api/v1/kanban/sync`

**Request Body**:
```json
{
  "deviceId": "tablet-001",
  "updates": [
    {
      "id": "local-1",
      "timestamp": "2024-01-20T10:00:00Z",
      "action": "stage_update",
      "data": {
        "orderId": 123,
        "stageId": 5,
        "status": "pass"
      }
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "synced": 5,
    "failed": 1,
    "conflicts": [
      {
        "localId": "local-1",
        "reason": "Order already moved",
        "serverState": { /* current state */ }
      }
    ]
  }
}
```

## Client-Side Events

### 15. Emit Stage Updates
Worker updates from client.

```javascript
// Start working on order
socket.emit('stage:start', {
  orderId: 123,
  stageId: 5
});

// Complete stage
socket.emit('stage:complete', {
  orderId: 123,
  stageId: 5,
  qualityScore: 95,
  notes: 'Good quality'
});

// Report issue
socket.emit('stage:fail', {
  orderId: 123,
  stageId: 5,
  reason: 'Material defect',
  photos: ['defect1.jpg']
});
```

### 16. Manager Actions

```javascript
// Reassign worker
socket.emit('order:reassign', {
  orderId: 123,
  stageId: 5,
  newWorkerId: 15
});

// Change priority
socket.emit('order:priority', {
  orderId: 123,
  priority: 'urgent'
});

// Emergency stop
socket.emit('order:stop', {
  orderId: 123,
  reason: 'Quality issue'
});
```

## Error Handling

### WebSocket Errors
```javascript
socket.on('error', {
  code: 'UNAUTHORIZED_ACTION',
  message: 'You cannot update this stage',
  details: {
    orderId: 123,
    stageId: 5,
    requiredRole: 'worker'
  }
});
```

### Error Codes
| Code | Description |
|------|-------------|
| WS_AUTH_FAILED | Authentication failed |
| WS_INVALID_ROOM | Invalid process/order ID |
| WS_RATE_LIMITED | Too many updates |
| WS_CONFLICT | Concurrent update conflict |
| WS_INVALID_ACTION | Action not allowed |
| WS_CONNECTION_LIMIT | Too many connections |

## Performance Guidelines

### Client-Side
1. Debounce rapid updates (500ms)
2. Batch multiple updates
3. Use optimistic UI updates
4. Cache board state locally
5. Lazy load historical data

### Server-Side
1. Use Redis pub/sub for scaling
2. Implement connection pooling
3. Rate limit per user (100 updates/min)
4. Compress large payloads
5. Use binary protocol for mobile

## Security Considerations
1. Validate all inputs server-side
2. Check permissions for each action
3. Sanitize user-generated content
4. Rate limit connections per IP
5. Implement CSRF protection
6. Use secure WebSocket (WSS)
7. Token refresh mechanism
8. Audit log all actions

## Testing WebSocket Events

### Test Client
```javascript
// Test connection
const testSocket = io('ws://localhost:3000', {
  auth: { token: 'test-token' }
});

// Simulate updates
testSocket.emit('test:stage:update', {
  orderId: 123,
  stageId: 5,
  status: 'pass'
});

// Verify broadcast
testSocket.on('stage:updated', (data) => {
  console.assert(data.orderId === 123);
});
```

### Load Testing
- Target: 1000 concurrent connections
- Update rate: 10,000 events/minute
- Latency: < 100ms p95
- Memory: < 2GB for 1000 connections
