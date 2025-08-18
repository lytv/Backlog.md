# M04: Database Schema Specification

## Overview
This document defines the database schema additions for Milestone 4: Kanban Board and Real-time Features. Since M04 primarily focuses on visualization and real-time updates, the schema changes are minimal, focusing on performance optimization and real-time state management.

## Schema Dependencies
- Requires all tables from M01, M02, and M03
- Adds materialized views for performance
- Adds tables for WebSocket session management
- Adds caching tables for offline support

## New Table Definitions

### 1. websocket_connections
Track active WebSocket connections for presence and debugging.

```sql
CREATE TABLE websocket_connections (
    id SERIAL PRIMARY KEY,
    connection_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    socket_id VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    connected_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_ping_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    disconnected_at TIMESTAMPTZ,
    disconnect_reason VARCHAR(100),

    INDEX idx_ws_user (user_id),
    INDEX idx_ws_active (disconnected_at) WHERE disconnected_at IS NULL
);
```

### 2. kanban_subscriptions
Track which boards/processes users are watching.

```sql
CREATE TABLE kanban_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    process_id INTEGER REFERENCES production_processes(id),
    production_order_id INTEGER REFERENCES production_orders(id),
    subscription_type VARCHAR(20) NOT NULL CHECK (subscription_type IN ('process', 'order', 'stage')),
    stage_id INTEGER REFERENCES production_stages(id),
    subscribed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_viewed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_subs_user (user_id),
    INDEX idx_subs_process (process_id),
    INDEX idx_subs_order (production_order_id)
);
```

### 3. kanban_user_preferences
Store user-specific Kanban view preferences.

```sql
CREATE TABLE kanban_user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    process_id INTEGER REFERENCES production_processes(id),
    view_mode VARCHAR(20) DEFAULT 'compact' CHECK (view_mode IN ('compact', 'detailed', 'mobile')),
    filters JSONB DEFAULT '{}', -- {"priority": ["high"], "delayed": true}
    sort_order VARCHAR(20) DEFAULT 'priority' CHECK (sort_order IN ('priority', 'age', 'delay')),
    column_width INTEGER DEFAULT 300,
    auto_refresh BOOLEAN DEFAULT true,
    refresh_interval INTEGER DEFAULT 30, -- seconds
    show_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, process_id),
    INDEX idx_pref_user (user_id)
);
```

### 4. offline_queue
Queue for offline updates to be synced when reconnected.

```sql
CREATE TABLE offline_queue (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    action_type VARCHAR(50) NOT NULL, -- 'stage_update', 'status_change', etc.
    entity_type VARCHAR(50) NOT NULL, -- 'stage_tracking', 'production_order'
    entity_id INTEGER NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    synced_at TIMESTAMPTZ,
    sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'completed', 'failed')),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    INDEX idx_queue_user (user_id),
    INDEX idx_queue_status (sync_status),
    INDEX idx_queue_created (created_at)
);
```

### 5. real_time_metrics
Store real-time performance metrics.

```sql
CREATE TABLE real_time_metrics (
    id SERIAL PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL, -- 'latency', 'throughput', 'connections'
    metric_value DECIMAL(10,2) NOT NULL,
    metadata JSONB,
    recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_metrics_type (metric_type),
    INDEX idx_metrics_time (recorded_at)
);

-- Partition by day for efficient cleanup
CREATE TABLE real_time_metrics_y2024m01 PARTITION OF real_time_metrics
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

## Materialized Views for Performance

### 1. Kanban Board View
Optimized view for fast Kanban board loading.

```sql
CREATE MATERIALIZED VIEW mv_kanban_board AS
SELECT
    pp.id as process_id,
    pp.name as process_name,
    ps.id as stage_id,
    ps.name as stage_name,
    ps.sequence_order,
    ps.standard_duration_hours,
    po.id as production_order_id,
    po.production_number,
    po.priority,
    po.is_delayed,
    o.order_number,
    c.name as customer_name,
    p.product_code,
    p.name as product_name,
    col.name as color_name,
    st.status as stage_status,
    st.entered_at,
    st.assigned_to as worker_id,
    u.full_name as worker_name,
    EXTRACT(EPOCH FROM (NOW() - st.entered_at))/3600 as hours_in_stage,
    CASE
        WHEN EXTRACT(EPOCH FROM (NOW() - st.entered_at))/3600 > ps.standard_duration_hours THEN 'delayed'
        WHEN EXTRACT(EPOCH FROM (NOW() - st.entered_at))/3600 > ps.standard_duration_hours * 0.8 THEN 'warning'
        ELSE 'on_time'
    END as delay_status,
    po.quantity_to_produce,
    po.quantity_completed,
    (po.quantity_completed / po.quantity_to_produce * 100) as completion_percentage
FROM production_processes pp
JOIN production_stages ps ON pp.id = ps.process_id
LEFT JOIN production_orders po ON po.current_stage_id = ps.id
    AND po.production_status = 'in_production'
LEFT JOIN stage_tracking st ON st.production_order_id = po.id
    AND st.stage_id = ps.id
    AND st.status IN ('pending', 'in_progress')
LEFT JOIN order_details od ON po.order_detail_id = od.id
LEFT JOIN orders o ON od.order_id = o.id
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN products p ON od.product_id = p.id
LEFT JOIN colors col ON od.color_id = col.id
LEFT JOIN users u ON st.assigned_to = u.id
WHERE pp.is_active = true;

CREATE UNIQUE INDEX idx_mv_kanban_board ON mv_kanban_board (process_id, stage_id, production_order_id);
CREATE INDEX idx_mv_kanban_process ON mv_kanban_board (process_id);
CREATE INDEX idx_mv_kanban_delay ON mv_kanban_board (delay_status) WHERE delay_status = 'delayed';
```

### 2. Stage Workload View
Shows current workload per stage for capacity planning.

```sql
CREATE MATERIALIZED VIEW mv_stage_workload AS
SELECT
    ps.id as stage_id,
    ps.name as stage_name,
    pp.id as process_id,
    pp.name as process_name,
    COUNT(DISTINCT st.production_order_id) as active_orders,
    COUNT(DISTINCT st.assigned_to) as active_workers,
    AVG(EXTRACT(EPOCH FROM (NOW() - st.entered_at))/3600) as avg_time_in_stage,
    MAX(EXTRACT(EPOCH FROM (NOW() - st.entered_at))/3600) as max_time_in_stage,
    SUM(CASE WHEN st.is_delayed THEN 1 ELSE 0 END) as delayed_orders,
    array_agg(DISTINCT u.full_name) as assigned_workers
FROM production_stages ps
JOIN production_processes pp ON ps.process_id = pp.id
LEFT JOIN stage_tracking st ON st.stage_id = ps.id
    AND st.status IN ('pending', 'in_progress')
LEFT JOIN users u ON st.assigned_to = u.id
WHERE pp.is_active = true
GROUP BY ps.id, pp.id;

CREATE UNIQUE INDEX idx_mv_workload ON mv_stage_workload (stage_id);
```

### 3. Real-time Analytics View
Aggregated metrics for dashboard widgets.

```sql
CREATE MATERIALIZED VIEW mv_realtime_analytics AS
SELECT
    COUNT(DISTINCT po.id) as total_active_orders,
    COUNT(DISTINCT CASE WHEN po.is_delayed THEN po.id END) as delayed_orders,
    COUNT(DISTINCT st.assigned_to) as active_workers,
    AVG(po.rejection_rate) as avg_rejection_rate,
    SUM(po.quantity_completed) as total_quantity_completed,
    COUNT(DISTINCT CASE WHEN po.priority = 'urgent' THEN po.id END) as urgent_orders,
    COUNT(DISTINCT pp.id) as active_processes,
    MAX(st.entered_at) as last_activity
FROM production_orders po
JOIN production_processes pp ON po.process_id = pp.id
LEFT JOIN stage_tracking st ON st.production_order_id = po.id
WHERE po.production_status = 'in_production'
AND pp.is_active = true;
```

## Indexes for Real-time Performance

### Additional Indexes on Existing Tables
```sql
-- For fast Kanban queries
CREATE INDEX idx_prod_orders_kanban ON production_orders (process_id, production_status, current_stage_id)
WHERE production_status = 'in_production';

CREATE INDEX idx_stage_tracking_kanban ON stage_tracking (stage_id, status, entered_at)
WHERE status IN ('pending', 'in_progress');

-- For worker presence
CREATE INDEX idx_stage_tracking_worker ON stage_tracking (assigned_to, status)
WHERE status IN ('pending', 'in_progress');

-- For delay detection
CREATE INDEX idx_stage_tracking_delays ON stage_tracking (is_delayed, entered_at)
WHERE is_delayed = true;
```

## Triggers for Real-time Updates

### Notify on Stage Status Change
```sql
CREATE OR REPLACE FUNCTION notify_stage_update()
RETURNS TRIGGER AS $$
DECLARE
    channel TEXT;
    payload JSON;
BEGIN
    -- Build notification payload
    payload := json_build_object(
        'action', TG_OP,
        'production_order_id', NEW.production_order_id,
        'stage_id', NEW.stage_id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'assigned_to', NEW.assigned_to,
        'timestamp', NOW()
    );

    -- Notify on process-specific channel
    channel := 'kanban_process_' || (
        SELECT po.process_id
        FROM production_orders po
        WHERE po.id = NEW.production_order_id
    );

    PERFORM pg_notify(channel, payload::TEXT);

    -- Also notify on order-specific channel
    PERFORM pg_notify('kanban_order_' || NEW.production_order_id, payload::TEXT);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_stage_update
AFTER INSERT OR UPDATE ON stage_tracking
FOR EACH ROW
EXECUTE FUNCTION notify_stage_update();
```

### Refresh Materialized Views
```sql
-- Refresh views periodically (via cron job)
CREATE OR REPLACE FUNCTION refresh_kanban_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_kanban_board;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_stage_workload;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_realtime_analytics;
END;
$$ LANGUAGE plpgsql;
```

## Redis Schema for Real-time State

### Key Patterns
```
# Active connections
connections:{user_id} = {socket_id, connected_at, last_ping}

# Board subscriptions
board:{process_id}:subscribers = SET of user_ids

# User presence
presence:{process_id}:{stage_id} = SET of user_ids

# Cached board state
kanban:{process_id} = JSON of board data (TTL: 60s)

# Update queue
updates:{process_id} = LIST of pending updates
```

## Performance Considerations

### Caching Strategy
1. Cache Kanban board data in Redis (60s TTL)
2. Use materialized views for complex queries
3. Refresh views every 5 minutes
4. Invalidate cache on updates

### Connection Management
1. Limit connections per user (max 3)
2. Heartbeat every 30 seconds
3. Auto-disconnect after 5 minutes idle
4. Connection pooling for database

### Data Retention
1. Archive completed orders after 30 days
2. Delete WebSocket logs after 7 days
3. Aggregate metrics hourly
4. Partition real_time_metrics by month

## Migration Notes
- Create materialized views after data exists
- Set up refresh job for views
- Create initial user preferences
- Test WebSocket notification triggers
- Configure Redis for pub/sub
