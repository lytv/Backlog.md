# M06: Mobile and Performance Optimization - Database Schema

## 1. Overview

This document defines the database schema additions and modifications required for mobile optimization, offline capabilities, and performance monitoring. It includes both server-side PostgreSQL tables and client-side IndexedDB schema.

## 2. Server-Side Schema (PostgreSQL)

### 2.1 Sync Management Tables

#### sync_tokens
Tracks synchronization state for each device/user combination.

```sql
CREATE TABLE sync_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    device_id VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    last_sync_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sync_cursor JSONB DEFAULT '{}',
    device_info JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, device_id)
);

CREATE INDEX idx_sync_tokens_user_device ON sync_tokens(user_id, device_id);
CREATE INDEX idx_sync_tokens_token ON sync_tokens(token);
CREATE INDEX idx_sync_tokens_expires_at ON sync_tokens(expires_at) WHERE expires_at IS NOT NULL;
```

#### sync_queue
Stores pending synchronization operations.

```sql
CREATE TABLE sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sync_token_id UUID NOT NULL REFERENCES sync_tokens(id) ON DELETE CASCADE,
    operation_type VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete'
    entity_type VARCHAR(100) NOT NULL, -- 'orders', 'stage_tracking', etc.
    entity_id VARCHAR(255) NOT NULL,
    operation_data JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT sync_queue_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX idx_sync_queue_token_status ON sync_queue(sync_token_id, status);
CREATE INDEX idx_sync_queue_created_at ON sync_queue(created_at);
CREATE INDEX idx_sync_queue_entity ON sync_queue(entity_type, entity_id);
```

#### sync_conflicts
Records synchronization conflicts for resolution.

```sql
CREATE TABLE sync_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sync_token_id UUID NOT NULL REFERENCES sync_tokens(id),
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    local_version JSONB NOT NULL,
    server_version JSONB NOT NULL,
    conflict_type VARCHAR(50) NOT NULL, -- 'concurrent_update', 'delete_update', 'constraint_violation'
    resolution_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'resolved', 'ignored'
    resolution_type VARCHAR(50), -- 'keep_local', 'keep_server', 'merge', 'manual'
    resolved_data JSONB,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sync_conflicts_token_status ON sync_conflicts(sync_token_id, resolution_status);
CREATE INDEX idx_sync_conflicts_entity ON sync_conflicts(entity_type, entity_id);
```

### 2.2 Push Notification Tables

#### push_subscriptions
Stores push notification subscriptions.

```sql
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    device_info JSONB DEFAULT '{}',
    topics TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;
CREATE INDEX idx_push_subscriptions_topics ON push_subscriptions USING GIN(topics);
```

#### push_notifications
Log of sent push notifications.

```sql
CREATE TABLE push_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID REFERENCES push_subscriptions(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    icon VARCHAR(255),
    badge VARCHAR(255),
    data JSONB DEFAULT '{}',
    priority VARCHAR(20) DEFAULT 'normal', -- 'high', 'normal', 'low'
    topic VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_push_notifications_user ON push_notifications(user_id);
CREATE INDEX idx_push_notifications_status ON push_notifications(status);
CREATE INDEX idx_push_notifications_created_at ON push_notifications(created_at);
```

### 2.3 Performance Monitoring Tables

#### performance_metrics
Stores client-side performance metrics.

```sql
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES users(id),
    metric_type VARCHAR(50) NOT NULL, -- 'web_vitals', 'custom', 'resource'
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC NOT NULL,
    unit VARCHAR(20), -- 'ms', 'bytes', 'score', etc.
    tags JSONB DEFAULT '{}',
    user_agent TEXT,
    connection_type VARCHAR(20), -- '4g', '3g', 'wifi', etc.
    device_type VARCHAR(20), -- 'mobile', 'tablet', 'desktop'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_performance_metrics_session ON performance_metrics(session_id);
CREATE INDEX idx_performance_metrics_type_name ON performance_metrics(metric_type, metric_name);
CREATE INDEX idx_performance_metrics_created_at ON performance_metrics(created_at);
CREATE INDEX idx_performance_metrics_user ON performance_metrics(user_id) WHERE user_id IS NOT NULL;
```

#### error_logs
Stores client-side errors.

```sql
CREATE TABLE error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES users(id),
    error_type VARCHAR(50) NOT NULL, -- 'javascript', 'network', 'permission'
    message TEXT NOT NULL,
    stack_trace TEXT,
    url TEXT,
    line_number INTEGER,
    column_number INTEGER,
    user_agent TEXT,
    context JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_error_logs_session ON error_logs(session_id);
CREATE INDEX idx_error_logs_type ON error_logs(error_type);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX idx_error_logs_user ON error_logs(user_id) WHERE user_id IS NOT NULL;
```

### 2.4 Cache Management Tables

#### cache_metadata
Tracks cached resources and their metadata.

```sql
CREATE TABLE cache_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key VARCHAR(500) NOT NULL UNIQUE,
    resource_type VARCHAR(50) NOT NULL, -- 'api_response', 'image', 'static_asset'
    url TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    content_hash VARCHAR(64),
    headers JSONB DEFAULT '{}',
    hit_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cache_metadata_key ON cache_metadata(cache_key);
CREATE INDEX idx_cache_metadata_type ON cache_metadata(resource_type);
CREATE INDEX idx_cache_metadata_expires ON cache_metadata(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_cache_metadata_accessed ON cache_metadata(last_accessed_at);
```

## 3. Client-Side Schema (IndexedDB)

### 3.1 Database Structure

```javascript
// Database name: 'vtl_offline_db'
// Version: 1

const DB_CONFIG = {
  name: 'vtl_offline_db',
  version: 1,
  stores: {
    orders: { keyPath: 'id', indexes: ['status', 'customer_id', 'updated_at'] },
    production_orders: { keyPath: 'id', indexes: ['order_id', 'status', 'updated_at'] },
    stage_tracking: { keyPath: 'id', indexes: ['production_order_id', 'stage_id', 'status'] },
    sync_queue: { keyPath: 'id', indexes: ['status', 'created_at', 'entity_type'] },
    offline_actions: { keyPath: 'id', indexes: ['type', 'status', 'created_at'] },
    cached_data: { keyPath: 'key', indexes: ['type', 'expires_at'] },
    user_preferences: { keyPath: 'key' }
  }
};
```

### 3.2 Object Stores

#### orders (Cached Orders)
```javascript
{
  id: 'ORD001',
  order_number: 'ORD-2024-001',
  customer_id: 'CUST001',
  customer_name: 'ABC Textile Co.',
  status: 'in_production',
  items: [
    {
      product_id: 'PROD001',
      product_name: 'Cotton Fabric A',
      quantity: 1000,
      unit: 'meters'
    }
  ],
  created_at: '2024-01-20T10:00:00Z',
  updated_at: '2024-01-20T10:00:00Z',
  _sync_status: 'synced', // 'synced', 'pending', 'conflict'
  _last_synced: '2024-01-20T10:00:00Z'
}
```

#### production_orders (Cached Production Orders)
```javascript
{
  id: 'PROD_ORD001',
  order_id: 'ORD001',
  process_id: 'PROC001',
  status: 'in_progress',
  current_stage_id: 'STG003',
  stages: [
    {
      stage_id: 'STG001',
      name: 'Cutting',
      status: 'completed',
      completed_at: '2024-01-20T08:00:00Z'
    },
    {
      stage_id: 'STG002',
      name: 'Sewing',
      status: 'completed',
      completed_at: '2024-01-20T09:00:00Z'
    },
    {
      stage_id: 'STG003',
      name: 'Quality Check',
      status: 'in_progress',
      assigned_to: 'WRK001'
    }
  ],
  created_at: '2024-01-20T07:00:00Z',
  updated_at: '2024-01-20T10:00:00Z',
  _sync_status: 'synced'
}
```

#### sync_queue (Pending Sync Operations)
```javascript
{
  id: 'sync_001',
  entity_type: 'stage_tracking',
  entity_id: 'TRACK001',
  operation: 'update',
  data: {
    production_order_id: 'PROD_ORD001',
    stage_id: 'STG003',
    status: 'completed',
    completed_at: '2024-01-20T10:00:00Z'
  },
  status: 'pending', // 'pending', 'syncing', 'failed'
  retry_count: 0,
  created_at: '2024-01-20T10:00:00Z',
  error: null
}
```

#### offline_actions (User Actions While Offline)
```javascript
{
  id: 'action_001',
  type: 'stage_complete',
  title: 'Completed Quality Check',
  description: 'Order ORD-2024-001 quality check completed',
  data: {
    order_id: 'ORD001',
    stage_id: 'STG003'
  },
  status: 'pending', // 'pending', 'synced', 'failed'
  created_at: '2024-01-20T10:00:00Z',
  synced_at: null
}
```

#### cached_data (Generic Cache Storage)
```javascript
{
  key: 'dashboard_stats',
  type: 'api_response',
  data: {
    total_orders: 150,
    pending_orders: 45,
    completed_today: 12
  },
  url: '/api/v1/dashboard/stats',
  expires_at: '2024-01-20T11:00:00Z',
  cached_at: '2024-01-20T10:00:00Z'
}
```

#### user_preferences (Local Settings)
```javascript
{
  key: 'sync_settings',
  value: {
    auto_sync: true,
    sync_interval: 300000, // 5 minutes
    wifi_only: false,
    notifications_enabled: true
  }
}
```

### 3.3 Indexes

```javascript
// Orders indexes
createIndex('orders', 'status');
createIndex('orders', 'customer_id');
createIndex('orders', 'updated_at');

// Production orders indexes
createIndex('production_orders', 'order_id');
createIndex('production_orders', 'status');
createIndex('production_orders', 'updated_at');

// Stage tracking indexes
createIndex('stage_tracking', 'production_order_id');
createIndex('stage_tracking', 'stage_id');
createIndex('stage_tracking', 'status');

// Sync queue indexes
createIndex('sync_queue', 'status');
createIndex('sync_queue', 'created_at');
createIndex('sync_queue', 'entity_type');

// Offline actions indexes
createIndex('offline_actions', 'type');
createIndex('offline_actions', 'status');
createIndex('offline_actions', 'created_at');

// Cached data indexes
createIndex('cached_data', 'type');
createIndex('cached_data', 'expires_at');
```

## 4. Data Synchronization Strategy

### 4.1 Sync Rules

1. **Write Priority**: Local writes always succeed
2. **Conflict Resolution**: Last-write-wins with conflict tracking
3. **Sync Direction**: Bidirectional with selective sync
4. **Data Retention**: 7 days offline data, 30 days sync history

### 4.2 Sync Metadata

Each synced entity includes:
```javascript
{
  _sync_status: 'synced', // 'synced', 'pending', 'conflict'
  _last_synced: '2024-01-20T10:00:00Z',
  _local_version: 1,
  _server_version: 1,
  _sync_error: null
}
```

### 4.3 Storage Quotas

- **Total IndexedDB**: 500MB
- **Orders**: 100MB
- **Production Data**: 200MB
- **Cache**: 150MB
- **Sync Queue**: 50MB

## 5. Migration Scripts

### 5.1 Add Sync Tables

```sql
-- Run this migration to add sync-related tables
BEGIN;

-- Create sync_tokens table
CREATE TABLE IF NOT EXISTS sync_tokens (
    -- ... (as defined above)
);

-- Create sync_queue table
CREATE TABLE IF NOT EXISTS sync_queue (
    -- ... (as defined above)
);

-- Create sync_conflicts table
CREATE TABLE IF NOT EXISTS sync_conflicts (
    -- ... (as defined above)
);

-- Add sync tracking columns to existing tables
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sync_version INTEGER DEFAULT 1;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS sync_version INTEGER DEFAULT 1;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE stage_tracking ADD COLUMN IF NOT EXISTS sync_version INTEGER DEFAULT 1;
ALTER TABLE stage_tracking ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

COMMIT;
```

### 5.2 Add Performance Tables

```sql
-- Run this migration to add performance monitoring tables
BEGIN;

-- Create performance_metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    -- ... (as defined above)
);

-- Create error_logs table
CREATE TABLE IF NOT EXISTS error_logs (
    -- ... (as defined above)
);

-- Create cache_metadata table
CREATE TABLE IF NOT EXISTS cache_metadata (
    -- ... (as defined above)
);

COMMIT;
```

## 6. Performance Considerations

### 6.1 Indexes
- All foreign keys are indexed
- Composite indexes for common query patterns
- Partial indexes for filtered queries

### 6.2 Partitioning
- Consider partitioning performance_metrics by created_at
- Consider partitioning error_logs by created_at
- Archive old sync data after 90 days

### 6.3 Cleanup Jobs
- Delete expired sync tokens daily
- Archive completed sync queue entries weekly
- Purge old performance metrics monthly
- Clean expired cache metadata hourly
