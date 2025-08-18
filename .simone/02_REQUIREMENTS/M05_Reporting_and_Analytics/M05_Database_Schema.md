# M05: Database Schema Specification

## Overview
This document defines the database schema additions for Milestone 5: Reporting and Analytics. It includes data warehouse tables, aggregation tables, report metadata, and analytics-specific structures optimized for reporting performance.

## Schema Dependencies
- Requires all tables from M01-M04
- Adds analytical schemas and aggregation tables
- Implements time-series optimizations
- Creates report metadata management

## Data Warehouse Schema

### 1. fact_production_events
Central fact table for production analytics.

```sql
CREATE TABLE fact_production_events (
    id BIGSERIAL PRIMARY KEY,
    event_date DATE NOT NULL,
    event_time TIMESTAMPTZ NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'order_started', 'stage_completed', 'delay_occurred'

    -- Dimensions
    order_id INTEGER REFERENCES orders(id),
    production_order_id INTEGER REFERENCES production_orders(id),
    customer_id INTEGER REFERENCES customers(id),
    product_id INTEGER REFERENCES products(id),
    color_id INTEGER REFERENCES colors(id),
    process_id INTEGER REFERENCES production_processes(id),
    stage_id INTEGER REFERENCES production_stages(id),
    worker_id INTEGER REFERENCES users(id),

    -- Metrics
    quantity DECIMAL(10,2),
    duration_minutes INTEGER,
    delay_minutes INTEGER,
    quality_score INTEGER,
    defect_count INTEGER,

    -- Additional attributes
    priority VARCHAR(20),
    shift VARCHAR(20),
    is_rework BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (event_date);

-- Create monthly partitions
CREATE TABLE fact_production_events_2024_01 PARTITION OF fact_production_events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Indexes for common queries
CREATE INDEX idx_fact_prod_date ON fact_production_events (event_date);
CREATE INDEX idx_fact_prod_customer ON fact_production_events (customer_id, event_date);
CREATE INDEX idx_fact_prod_product ON fact_production_events (product_id, event_date);
CREATE INDEX idx_fact_prod_worker ON fact_production_events (worker_id, event_date);
```

### 2. dim_date
Date dimension for time-based analysis.

```sql
CREATE TABLE dim_date (
    date_id DATE PRIMARY KEY,
    year INTEGER NOT NULL,
    quarter INTEGER NOT NULL,
    month INTEGER NOT NULL,
    week INTEGER NOT NULL,
    day_of_month INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL,
    day_name VARCHAR(20),
    month_name VARCHAR(20),
    is_weekend BOOLEAN,
    is_holiday BOOLEAN,
    fiscal_year INTEGER,
    fiscal_quarter INTEGER,
    week_start_date DATE,
    week_end_date DATE,
    month_start_date DATE,
    month_end_date DATE
);

-- Populate for 10 years
INSERT INTO dim_date
SELECT
    d::date as date_id,
    EXTRACT(year FROM d) as year,
    EXTRACT(quarter FROM d) as quarter,
    EXTRACT(month FROM d) as month,
    EXTRACT(week FROM d) as week,
    EXTRACT(day FROM d) as day_of_month,
    EXTRACT(dow FROM d) as day_of_week,
    TO_CHAR(d, 'Day') as day_name,
    TO_CHAR(d, 'Month') as month_name,
    EXTRACT(dow FROM d) IN (0, 6) as is_weekend,
    false as is_holiday, -- Update with actual holidays
    EXTRACT(year FROM d) as fiscal_year,
    EXTRACT(quarter FROM d) as fiscal_quarter,
    DATE_TRUNC('week', d)::date as week_start_date,
    (DATE_TRUNC('week', d) + INTERVAL '6 days')::date as week_end_date,
    DATE_TRUNC('month', d)::date as month_start_date,
    (DATE_TRUNC('month', d) + INTERVAL '1 month - 1 day')::date as month_end_date
FROM generate_series('2020-01-01'::date, '2030-12-31'::date, '1 day'::interval) d;
```

### 3. agg_daily_production
Daily aggregated production metrics.

```sql
CREATE TABLE agg_daily_production (
    id SERIAL PRIMARY KEY,
    date_id DATE NOT NULL REFERENCES dim_date(date_id),
    process_id INTEGER REFERENCES production_processes(id),
    stage_id INTEGER REFERENCES production_stages(id),

    -- Metrics
    orders_started INTEGER DEFAULT 0,
    orders_completed INTEGER DEFAULT 0,
    orders_delayed INTEGER DEFAULT 0,
    total_quantity_produced DECIMAL(10,2) DEFAULT 0,
    total_quantity_rejected DECIMAL(10,2) DEFAULT 0,
    avg_cycle_time_minutes DECIMAL(10,2),
    avg_quality_score DECIMAL(5,2),
    total_delay_minutes INTEGER DEFAULT 0,
    worker_count INTEGER DEFAULT 0,

    -- Calculated fields
    efficiency_rate DECIMAL(5,2),
    defect_rate DECIMAL(5,2),
    on_time_rate DECIMAL(5,2),

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(date_id, process_id, stage_id)
);

CREATE INDEX idx_agg_daily_date ON agg_daily_production(date_id);
CREATE INDEX idx_agg_daily_process ON agg_daily_production(process_id);
```

### 4. agg_hourly_metrics
Hourly metrics for real-time dashboards.

```sql
CREATE TABLE agg_hourly_metrics (
    id SERIAL PRIMARY KEY,
    metric_hour TIMESTAMPTZ NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- 'production', 'quality', 'delay'

    -- Dimensions
    process_id INTEGER REFERENCES production_processes(id),
    stage_id INTEGER REFERENCES production_stages(id),

    -- Metrics
    value DECIMAL(10,2) NOT NULL,
    count INTEGER DEFAULT 1,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(metric_hour, metric_type, process_id, stage_id)
) PARTITION BY RANGE (metric_hour);

-- Create daily partitions
CREATE TABLE agg_hourly_metrics_2024_01_20 PARTITION OF agg_hourly_metrics
    FOR VALUES FROM ('2024-01-20 00:00:00') TO ('2024-01-21 00:00:00');
```

### 5. report_definitions
Store custom report configurations.

```sql
CREATE TABLE report_definitions (
    id SERIAL PRIMARY KEY,
    report_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- 'production', 'quality', 'order', 'financial'
    report_type VARCHAR(50), -- 'dashboard', 'detailed', 'summary'

    -- Configuration
    query_definition JSONB NOT NULL, -- Query builder output
    layout_config JSONB, -- UI layout configuration
    filters JSONB, -- Default filters
    parameters JSONB, -- Report parameters

    -- Permissions
    roles_allowed TEXT[], -- Array of roles
    is_public BOOLEAN DEFAULT false,

    -- Metadata
    created_by INTEGER REFERENCES users(id),
    modified_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_run_at TIMESTAMPTZ,
    run_count INTEGER DEFAULT 0,
    avg_run_time_ms INTEGER,

    INDEX idx_report_category (category),
    INDEX idx_report_public (is_public)
);
```

### 6. report_schedules
Scheduled report execution.

```sql
CREATE TABLE report_schedules (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL REFERENCES report_definitions(id) ON DELETE CASCADE,

    -- Schedule configuration
    schedule_name VARCHAR(255) NOT NULL,
    cron_expression VARCHAR(100), -- '0 9 * * MON-FRI'
    timezone VARCHAR(50) DEFAULT 'Asia/Ho_Chi_Minh',
    is_active BOOLEAN DEFAULT true,

    -- Delivery configuration
    delivery_type VARCHAR(20) NOT NULL CHECK (delivery_type IN ('email', 'webhook', 'storage')),
    delivery_config JSONB NOT NULL, -- Email addresses, webhook URL, storage path
    output_format VARCHAR(20) DEFAULT 'pdf', -- 'pdf', 'excel', 'csv'

    -- Runtime parameters
    runtime_parameters JSONB,

    -- Execution tracking
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    last_status VARCHAR(20), -- 'success', 'failed', 'running'
    last_error TEXT,
    consecutive_failures INTEGER DEFAULT 0,

    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_schedule_active (is_active, next_run_at),
    INDEX idx_schedule_report (report_id)
);
```

### 7. report_executions
Log of report executions.

```sql
CREATE TABLE report_executions (
    id BIGSERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL REFERENCES report_definitions(id),
    schedule_id INTEGER REFERENCES report_schedules(id),

    -- Execution details
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'

    -- Performance metrics
    rows_processed INTEGER,
    execution_time_ms INTEGER,
    memory_used_mb INTEGER,

    -- Output
    output_format VARCHAR(20),
    output_size_bytes INTEGER,
    output_location TEXT, -- S3 path or file location

    -- Parameters used
    parameters_used JSONB,
    filters_used JSONB,

    -- User context
    executed_by INTEGER REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,

    -- Error handling
    error_message TEXT,
    error_details JSONB,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_execution_report (report_id, started_at DESC),
    INDEX idx_execution_status (status, started_at DESC)
) PARTITION BY RANGE (started_at);

-- Monthly partitions
CREATE TABLE report_executions_2024_01 PARTITION OF report_executions
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### 8. dashboard_widgets
Dashboard widget configurations.

```sql
CREATE TABLE dashboard_widgets (
    id SERIAL PRIMARY KEY,
    widget_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    widget_type VARCHAR(50) NOT NULL, -- 'metric', 'chart', 'table', 'gauge'

    -- Configuration
    data_source VARCHAR(50) NOT NULL, -- Table or view name
    query_config JSONB NOT NULL,
    visualization_config JSONB NOT NULL,
    refresh_interval_seconds INTEGER DEFAULT 300,

    -- Layout
    default_width INTEGER DEFAULT 4, -- Grid units
    default_height INTEGER DEFAULT 3,
    min_width INTEGER DEFAULT 2,
    min_height INTEGER DEFAULT 2,

    -- Permissions
    roles_allowed TEXT[],

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### 9. user_dashboards
User-specific dashboard layouts.

```sql
CREATE TABLE user_dashboards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    dashboard_name VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT false,

    -- Layout configuration
    layout JSONB NOT NULL, -- Widget positions and sizes
    filters JSONB, -- Dashboard-level filters

    -- Sharing
    is_shared BOOLEAN DEFAULT false,
    shared_with_roles TEXT[],

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, dashboard_name),
    INDEX idx_user_dash_default (user_id, is_default)
);
```

### 10. analytics_cache
Cache for expensive calculations.

```sql
CREATE TABLE analytics_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    cache_type VARCHAR(50) NOT NULL, -- 'query', 'aggregate', 'report'

    -- Cache data
    cached_data JSONB NOT NULL,
    data_hash VARCHAR(64), -- For invalidation

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    hit_count INTEGER DEFAULT 0,
    last_hit_at TIMESTAMPTZ,

    -- Dependencies for invalidation
    depends_on_tables TEXT[],
    depends_on_date_range TSTZRANGE,

    INDEX idx_cache_expires (expires_at),
    INDEX idx_cache_type (cache_type)
);
```

## Materialized Views for Performance

### 1. mv_production_summary
Summary view for dashboard performance.

```sql
CREATE MATERIALIZED VIEW mv_production_summary AS
SELECT
    d.date_id,
    d.year,
    d.month,
    d.week,
    pp.id as process_id,
    pp.name as process_name,
    COUNT(DISTINCT po.id) as total_orders,
    COUNT(DISTINCT CASE WHEN po.production_status = 'completed' THEN po.id END) as completed_orders,
    COUNT(DISTINCT CASE WHEN po.is_delayed THEN po.id END) as delayed_orders,
    SUM(po.quantity_to_produce) as total_quantity_planned,
    SUM(po.quantity_completed) as total_quantity_completed,
    AVG(EXTRACT(EPOCH FROM (po.actual_end_date - po.actual_start_date))/3600) as avg_cycle_time_hours,
    AVG(po.rejection_rate) as avg_rejection_rate,
    COUNT(DISTINCT st.assigned_to) as unique_workers
FROM dim_date d
CROSS JOIN production_processes pp
LEFT JOIN production_orders po ON DATE(po.created_at) = d.date_id AND po.process_id = pp.id
LEFT JOIN stage_tracking st ON st.production_order_id = po.id
WHERE d.date_id >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY d.date_id, d.year, d.month, d.week, pp.id, pp.name;

CREATE UNIQUE INDEX idx_mv_prod_summary ON mv_production_summary (date_id, process_id);
```

### 2. mv_quality_metrics
Quality analysis view.

```sql
CREATE MATERIALIZED VIEW mv_quality_metrics AS
SELECT
    DATE(st.created_at) as date_id,
    ps.id as stage_id,
    ps.name as stage_name,
    pp.id as process_id,
    pp.name as process_name,
    COUNT(*) as total_inspections,
    COUNT(CASE WHEN st.status = 'pass' THEN 1 END) as passed,
    COUNT(CASE WHEN st.status = 'fail' THEN 1 END) as failed,
    AVG(st.quality_score) as avg_quality_score,
    SUM(st.defects_found) as total_defects,
    COUNT(CASE WHEN st.rework_required THEN 1 END) as rework_count
FROM stage_tracking st
JOIN production_stages ps ON st.stage_id = ps.id
JOIN production_processes pp ON ps.process_id = pp.id
WHERE ps.is_qc_point = true
GROUP BY DATE(st.created_at), ps.id, ps.name, pp.id, pp.name;

CREATE UNIQUE INDEX idx_mv_quality ON mv_quality_metrics (date_id, stage_id);
```

## Functions and Procedures

### Calculate KPIs
```sql
CREATE OR REPLACE FUNCTION calculate_daily_kpis(p_date DATE)
RETURNS void AS $$
BEGIN
    -- Insert or update daily production aggregates
    INSERT INTO agg_daily_production (
        date_id, process_id, stage_id,
        orders_started, orders_completed, orders_delayed,
        total_quantity_produced, avg_cycle_time_minutes,
        efficiency_rate, on_time_rate
    )
    SELECT
        p_date,
        pp.id,
        ps.id,
        COUNT(DISTINCT CASE WHEN DATE(po.actual_start_date) = p_date THEN po.id END),
        COUNT(DISTINCT CASE WHEN DATE(po.actual_end_date) = p_date THEN po.id END),
        COUNT(DISTINCT CASE WHEN po.is_delayed THEN po.id END),
        SUM(CASE WHEN DATE(po.actual_end_date) = p_date THEN po.quantity_completed ELSE 0 END),
        AVG(EXTRACT(EPOCH FROM (st.completed_at - st.entered_at))/60),
        AVG(CASE WHEN st.duration_hours > 0 THEN ps.standard_duration_hours / st.duration_hours * 100 END),
        AVG(CASE WHEN NOT po.is_delayed THEN 100 ELSE 0 END)
    FROM production_processes pp
    JOIN production_stages ps ON ps.process_id = pp.id
    LEFT JOIN production_orders po ON po.process_id = pp.id
    LEFT JOIN stage_tracking st ON st.stage_id = ps.id AND st.production_order_id = po.id
    WHERE DATE(COALESCE(po.actual_start_date, po.actual_end_date, st.entered_at)) = p_date
    GROUP BY pp.id, ps.id
    ON CONFLICT (date_id, process_id, stage_id) DO UPDATE
    SET
        orders_started = EXCLUDED.orders_started,
        orders_completed = EXCLUDED.orders_completed,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;
```

### Refresh Analytics
```sql
CREATE OR REPLACE FUNCTION refresh_analytics()
RETURNS void AS $$
BEGIN
    -- Refresh materialized views
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_production_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_quality_metrics;

    -- Clean old cache entries
    DELETE FROM analytics_cache WHERE expires_at < CURRENT_TIMESTAMP;

    -- Update daily aggregates for yesterday
    PERFORM calculate_daily_kpis(CURRENT_DATE - INTERVAL '1 day');
END;
$$ LANGUAGE plpgsql;
```

## Indexes for Analytics Performance

```sql
-- Time-based queries
CREATE INDEX idx_orders_date_range ON orders(order_date);
CREATE INDEX idx_production_date_range ON production_orders(planned_start_date, planned_end_date);

-- Analytics joins
CREATE INDEX idx_stage_tracking_analytics ON stage_tracking(production_order_id, stage_id, entered_at);
CREATE INDEX idx_orders_analytics ON orders(customer_id, order_date, status);

-- Report filtering
CREATE INDEX idx_products_analytics ON products(fabric_type, is_active);
CREATE INDEX idx_workers_analytics ON users(role) WHERE role = 'worker';
```

## Data Retention Policy

```sql
-- Archive old executions
CREATE OR REPLACE FUNCTION archive_old_data()
RETURNS void AS $$
BEGIN
    -- Move old report executions to archive
    INSERT INTO report_executions_archive
    SELECT * FROM report_executions
    WHERE started_at < CURRENT_DATE - INTERVAL '90 days';

    -- Delete from main table
    DELETE FROM report_executions
    WHERE started_at < CURRENT_DATE - INTERVAL '90 days';

    -- Drop old partitions
    DROP TABLE IF EXISTS fact_production_events_2022_01;
END;
$$ LANGUAGE plpgsql;
```

## Migration Notes
- Create partitions before loading data
- Build materialized views after initial data load
- Schedule refresh jobs for aggregates
- Set up data retention policies
- Configure backup strategy for analytics data
