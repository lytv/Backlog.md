# M06: Mobile and Performance Optimization - API Specifications

## 1. Overview

This document defines the API endpoints required for Progressive Web App functionality, offline synchronization, performance monitoring, and mobile-specific features in the VTL SaaS platform.

## 2. API Categories

### 2.1 Service Worker & PWA APIs
- Service worker registration
- App manifest serving
- Update notifications
- Installation tracking

### 2.2 Offline Sync APIs
- Data synchronization
- Conflict resolution
- Queue management
- Sync status

### 2.3 Push Notification APIs
- Subscription management
- Notification sending
- Topic management
- Delivery tracking

### 2.4 Performance Monitoring APIs
- Metrics collection
- Error reporting
- Analytics events
- Performance budgets

## 3. Authentication & Headers

### 3.1 Required Headers
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
X-Client-Version: {app_version}
X-Sync-Token: {sync_token} // For sync operations
```

### 3.2 Offline Authentication
- JWT tokens with extended expiry for offline use
- Refresh token stored securely
- Automatic token renewal on sync

## 4. Service Worker & PWA Endpoints

### 4.1 Register Service Worker
```
GET /api/v1/sw.js
```

**Response**: Service worker JavaScript file
```javascript
// Dynamic service worker with cache strategies
self.addEventListener('install', ...);
self.addEventListener('fetch', ...);
self.addEventListener('sync', ...);
```

### 4.2 Web App Manifest
```
GET /api/v1/manifest.json
```

**Response**:
```json
{
  "name": "VTL Production Management",
  "short_name": "VTL Production",
  "description": "Textile production management system",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#3B82F6",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "shortcuts": [
    {
      "name": "Kanban Board",
      "url": "/production/kanban",
      "icon": "/icons/kanban.png"
    },
    {
      "name": "My Tasks",
      "url": "/worker/tasks",
      "icon": "/icons/tasks.png"
    }
  ]
}
```

### 4.3 Check for Updates
```
GET /api/v1/pwa/update-check
```

**Query Parameters**:
- `current_version`: string

**Response**:
```json
{
  "update_available": true,
  "latest_version": "2.1.0",
  "update_url": "/api/v1/pwa/update",
  "changes": [
    "Improved offline sync",
    "Bug fixes"
  ],
  "mandatory": false
}
```

## 5. Offline Sync Endpoints

### 5.1 Sync Queue Status
```
GET /api/v1/sync/queue
```

**Response**:
```json
{
  "pending_items": 12,
  "failed_items": 2,
  "last_sync": "2024-01-20T10:30:00Z",
  "next_sync": "2024-01-20T10:35:00Z",
  "sync_status": "active",
  "queue": [
    {
      "id": "sync_001",
      "type": "status_update",
      "timestamp": "2024-01-20T10:28:00Z",
      "retry_count": 0,
      "data": {
        "order_id": "ORD001",
        "stage_id": "STG003",
        "status": "completed"
      }
    }
  ]
}
```

### 5.2 Bulk Sync
```
POST /api/v1/sync/bulk
```

**Request Body**:
```json
{
  "sync_token": "last_sync_token",
  "device_id": "device_123",
  "changes": [
    {
      "id": "change_001",
      "entity": "stage_tracking",
      "operation": "update",
      "timestamp": "2024-01-20T10:28:00Z",
      "data": {
        "order_id": "ORD001",
        "stage_id": "STG003",
        "status": "completed",
        "worker_id": "WRK001",
        "completed_at": "2024-01-20T10:28:00Z"
      }
    }
  ]
}
```

**Response**:
```json
{
  "sync_token": "new_sync_token",
  "accepted": 10,
  "rejected": 2,
  "conflicts": [
    {
      "change_id": "change_001",
      "reason": "concurrent_modification",
      "server_version": {
        "status": "in_progress",
        "updated_at": "2024-01-20T10:27:00Z",
        "updated_by": "WRK002"
      },
      "resolution_options": ["keep_local", "keep_server", "merge"]
    }
  ],
  "server_changes": [
    {
      "entity": "orders",
      "operation": "update",
      "data": { /* ... */ }
    }
  ]
}
```

### 5.3 Resolve Conflict
```
POST /api/v1/sync/conflicts/{conflict_id}/resolve
```

**Request Body**:
```json
{
  "resolution": "keep_local",
  "merge_data": null
}
```

**Response**:
```json
{
  "resolved": true,
  "final_data": { /* ... */ },
  "sync_token": "updated_token"
}
```

### 5.4 Get Sync Delta
```
GET /api/v1/sync/delta
```

**Query Parameters**:
- `since_token`: string
- `entity_types[]`: array (orders, stage_tracking, etc.)
- `limit`: number (default: 100)

**Response**:
```json
{
  "changes": [
    {
      "entity": "orders",
      "id": "ORD001",
      "operation": "update",
      "timestamp": "2024-01-20T10:30:00Z",
      "data": { /* ... */ }
    }
  ],
  "next_token": "delta_token_xyz",
  "has_more": true
}
```

## 6. Push Notification Endpoints

### 6.1 Subscribe to Push Notifications
```
POST /api/v1/notifications/subscribe
```

**Request Body**:
```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "base64_key",
      "auth": "base64_auth"
    }
  },
  "topics": ["delays", "assignments", "system"],
  "device_info": {
    "type": "mobile",
    "os": "android",
    "browser": "chrome"
  }
}
```

**Response**:
```json
{
  "subscription_id": "sub_123",
  "subscribed_topics": ["delays", "assignments", "system"],
  "expires_at": "2024-12-31T23:59:59Z"
}
```

### 6.2 Update Subscription Topics
```
PUT /api/v1/notifications/subscriptions/{subscription_id}/topics
```

**Request Body**:
```json
{
  "add_topics": ["urgent_orders"],
  "remove_topics": ["system"]
}
```

### 6.3 Send Test Notification
```
POST /api/v1/notifications/test
```

**Request Body**:
```json
{
  "subscription_id": "sub_123",
  "notification": {
    "title": "Test Notification",
    "body": "This is a test",
    "icon": "/icons/notification.png",
    "badge": "/icons/badge.png",
    "data": {
      "type": "test"
    }
  }
}
```

## 7. Performance Monitoring Endpoints

### 7.1 Report Performance Metrics
```
POST /api/v1/monitoring/metrics
```

**Request Body**:
```json
{
  "session_id": "session_123",
  "metrics": [
    {
      "type": "web_vitals",
      "timestamp": "2024-01-20T10:30:00Z",
      "data": {
        "lcp": 2.5,
        "fid": 100,
        "cls": 0.1,
        "fcp": 1.8,
        "ttfb": 0.8
      }
    },
    {
      "type": "custom",
      "name": "kanban_load_time",
      "value": 1.2,
      "tags": {
        "route": "/production/kanban",
        "connection": "4g"
      }
    }
  ]
}
```

**Response**:
```json
{
  "accepted": true,
  "violations": [
    {
      "metric": "lcp",
      "value": 2.5,
      "threshold": 2.0,
      "severity": "warning"
    }
  ]
}
```

### 7.2 Report Errors
```
POST /api/v1/monitoring/errors
```

**Request Body**:
```json
{
  "session_id": "session_123",
  "errors": [
    {
      "timestamp": "2024-01-20T10:30:00Z",
      "type": "javascript_error",
      "message": "Cannot read property 'id' of undefined",
      "stack": "Error stack trace...",
      "context": {
        "url": "/production/kanban",
        "user_agent": "Mozilla/5.0...",
        "user_id": "USR001"
      }
    }
  ]
}
```

### 7.3 Get Performance Budget Status
```
GET /api/v1/monitoring/budgets
```

**Response**:
```json
{
  "budgets": [
    {
      "metric": "bundle_size",
      "current": 450000,
      "limit": 500000,
      "status": "ok",
      "utilization": 0.9
    },
    {
      "metric": "api_response_time",
      "current": 180,
      "limit": 200,
      "status": "ok",
      "p95": 195
    }
  ],
  "overall_status": "healthy"
}
```

## 8. Mobile-Specific Endpoints

### 8.1 Get Mobile Configuration
```
GET /api/v1/mobile/config
```

**Response**:
```json
{
  "features": {
    "offline_mode": true,
    "biometric_auth": true,
    "camera_upload": true,
    "push_notifications": true
  },
  "sync_settings": {
    "interval_minutes": 5,
    "wifi_only": false,
    "batch_size": 50
  },
  "ui_config": {
    "compact_mode": true,
    "swipe_actions": true,
    "haptic_feedback": true
  }
}
```

### 8.2 Upload Image (Optimized for Mobile)
```
POST /api/v1/mobile/upload
```

**Headers**:
```
Content-Type: multipart/form-data
X-Upload-Quality: medium // low, medium, high
```

**Request**: Multipart form data with image

**Response**:
```json
{
  "upload_id": "img_123",
  "url": "/uploads/img_123.jpg",
  "thumbnail": "/uploads/img_123_thumb.jpg",
  "size": 245000,
  "dimensions": {
    "width": 1200,
    "height": 800
  }
}
```

## 9. Cache Management Endpoints

### 9.1 Get Cache Status
```
GET /api/v1/cache/status
```

**Response**:
```json
{
  "cache_size": 4500000,
  "cache_limit": 5000000,
  "cached_resources": 145,
  "hit_rate": 0.85,
  "categories": {
    "images": 2000000,
    "api_responses": 1500000,
    "static_assets": 1000000
  }
}
```

### 9.2 Clear Cache
```
POST /api/v1/cache/clear
```

**Request Body**:
```json
{
  "categories": ["api_responses"],
  "older_than": "2024-01-15T00:00:00Z"
}
```

## 10. Error Handling

### 10.1 Standard Error Response
```json
{
  "error": {
    "code": "SYNC_CONFLICT",
    "message": "Data conflict detected during synchronization",
    "details": {
      "conflicts": 3,
      "entity": "stage_tracking"
    },
    "request_id": "req_123"
  }
}
```

### 10.2 Error Codes
- `OFFLINE_SYNC_FAILED`: Sync operation failed
- `SYNC_CONFLICT`: Data conflict during sync
- `QUOTA_EXCEEDED`: Storage quota exceeded
- `INVALID_SYNC_TOKEN`: Sync token expired or invalid
- `NOTIFICATION_FAILED`: Push notification delivery failed

## 11. Rate Limiting

### 11.1 Sync Operations
- Bulk sync: 10 requests per minute
- Conflict resolution: 30 requests per minute
- Delta sync: 60 requests per minute

### 11.2 Monitoring
- Metrics reporting: 100 requests per minute
- Error reporting: 50 requests per minute

### 11.3 Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642694400
```
