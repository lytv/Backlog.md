# M03: Database Schema Specification

## Overview
This document defines the database schema for Milestone 3: Production Process Core. It includes tables for production processes, stages, worker assignments, and production order management.

## Schema Dependencies
- Requires M01 tables: users, audit_logs
- Requires M02 tables: orders, order_details
- Referenced by M04: Kanban visualization will use these tables

## Table Definitions

### 1. production_processes
Master table for production process templates.

```sql
CREATE TABLE production_processes (
    id SERIAL PRIMARY KEY,
    process_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    description TEXT,
    category VARCHAR(100), -- 'Shirt', 'Pants', 'Fabric Processing', etc.
    estimated_days DECIMAL(5,2), -- Total estimated days
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false, -- Default for category
    version INTEGER DEFAULT 1,
    parent_process_id INTEGER REFERENCES production_processes(id), -- For versioning
    tags JSONB, -- ["complex", "quick", "standard"]
    created_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_processes_code (process_code),
    INDEX idx_processes_category (category),
    INDEX idx_processes_active (is_active),
    INDEX idx_processes_tags (tags) USING GIN
);
```

### 2. production_stages
Individual stages within a production process.

```sql
CREATE TABLE production_stages (
    id SERIAL PRIMARY KEY,
    process_id INTEGER NOT NULL REFERENCES production_processes(id) ON DELETE CASCADE,
    stage_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    sequence_order INTEGER NOT NULL,
    standard_duration_hours DECIMAL(8,2) NOT NULL DEFAULT 0,
    instructions TEXT,
    quality_checklist JSONB, -- ["Check seams", "Verify color match", etc.]
    equipment_required TEXT,
    skill_level VARCHAR(20) DEFAULT 'basic' CHECK (skill_level IN ('basic', 'intermediate', 'advanced')),
    is_qc_point BOOLEAN DEFAULT false, -- Quality control checkpoint
    is_final_stage BOOLEAN DEFAULT false,
    allow_parallel BOOLEAN DEFAULT false, -- Can run parallel with next stage
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(process_id, sequence_order),
    UNIQUE(process_id, stage_code),
    INDEX idx_stages_process (process_id),
    INDEX idx_stages_order (sequence_order),
    INDEX idx_stages_qc (is_qc_point)
);
```

### 3. stage_dependencies
Optional dependencies between stages (for complex workflows).

```sql
CREATE TABLE stage_dependencies (
    id SERIAL PRIMARY KEY,
    stage_id INTEGER NOT NULL REFERENCES production_stages(id) ON DELETE CASCADE,
    depends_on_stage_id INTEGER NOT NULL REFERENCES production_stages(id) ON DELETE CASCADE,
    dependency_type VARCHAR(20) DEFAULT 'finish' CHECK (dependency_type IN ('start', 'finish')),
    lag_hours DECIMAL(8,2) DEFAULT 0, -- Hours after dependency
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(stage_id, depends_on_stage_id),
    CHECK(stage_id != depends_on_stage_id)
);
```

### 4. worker_skills
Track worker skills for assignment matching.

```sql
CREATE TABLE worker_skills (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    skill_level VARCHAR(20) DEFAULT 'basic' CHECK (skill_level IN ('basic', 'intermediate', 'advanced', 'expert')),
    certified BOOLEAN DEFAULT false,
    certified_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, skill_name),
    INDEX idx_worker_skills_user (user_id),
    INDEX idx_worker_skills_skill (skill_name)
);
```

### 5. stage_assignments
Assigns workers to production stages.

```sql
CREATE TABLE stage_assignments (
    id SERIAL PRIMARY KEY,
    stage_id INTEGER NOT NULL REFERENCES production_stages(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assignment_type VARCHAR(20) DEFAULT 'primary' CHECK (assignment_type IN ('primary', 'backup', 'training')),
    shift VARCHAR(20) DEFAULT 'all' CHECK (shift IN ('all', 'morning', 'afternoon', 'night')),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    max_capacity INTEGER DEFAULT 10, -- Max orders worker can handle
    current_load INTEGER DEFAULT 0, -- Current active orders
    is_active BOOLEAN DEFAULT true,
    assigned_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_assignments_stage (stage_id),
    INDEX idx_assignments_user (user_id),
    INDEX idx_assignments_active (is_active),
    INDEX idx_assignments_dates (effective_from, effective_to)
);
```

### 6. production_orders
Links sales orders to production processes.

```sql
CREATE TABLE production_orders (
    id SERIAL PRIMARY KEY,
    production_number VARCHAR(50) UNIQUE NOT NULL,
    order_detail_id INTEGER NOT NULL REFERENCES order_details(id),
    process_id INTEGER NOT NULL REFERENCES production_processes(id),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
    production_status VARCHAR(20) NOT NULL DEFAULT 'planned'
        CHECK (production_status IN ('planned', 'in_production', 'completed', 'on_hold', 'cancelled')),
    planned_start_date TIMESTAMPTZ NOT NULL,
    actual_start_date TIMESTAMPTZ,
    planned_end_date TIMESTAMPTZ NOT NULL,
    actual_end_date TIMESTAMPTZ,
    current_stage_id INTEGER REFERENCES production_stages(id),
    batch_number VARCHAR(100),
    quantity_to_produce DECIMAL(10,2) NOT NULL,
    quantity_completed DECIMAL(10,2) DEFAULT 0,
    quantity_rejected DECIMAL(10,2) DEFAULT 0,
    rejection_rate DECIMAL(5,2) GENERATED ALWAYS AS
        (CASE WHEN quantity_completed > 0 THEN (quantity_rejected / quantity_completed * 100) ELSE 0 END) STORED,
    notes TEXT,
    special_instructions TEXT,
    is_delayed BOOLEAN DEFAULT false,
    delay_reason TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_production_orders_number (production_number),
    INDEX idx_production_orders_detail (order_detail_id),
    INDEX idx_production_orders_status (production_status),
    INDEX idx_production_orders_dates (planned_start_date, planned_end_date),
    INDEX idx_production_orders_current_stage (current_stage_id),
    INDEX idx_production_orders_priority (priority),
    INDEX idx_production_orders_delayed (is_delayed)
);
```

### 7. stage_tracking
Tracks production order progress through stages.

```sql
CREATE TABLE stage_tracking (
    id SERIAL PRIMARY KEY,
    production_order_id INTEGER NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
    stage_id INTEGER NOT NULL REFERENCES production_stages(id),
    stage_sequence INTEGER NOT NULL, -- Denormalized for performance
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'pass', 'fail', 'skipped')),
    assigned_to INTEGER REFERENCES users(id), -- Current worker
    checked_by INTEGER REFERENCES users(id), -- QC checker
    entered_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_hours DECIMAL(8,2) GENERATED ALWAYS AS
        (CASE WHEN completed_at IS NOT NULL AND started_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (completed_at - started_at))/3600 ELSE NULL END) STORED,
    standard_duration_hours DECIMAL(8,2), -- From stage definition
    is_delayed BOOLEAN GENERATED ALWAYS AS
        (duration_hours > standard_duration_hours * 1.1) STORED, -- 10% buffer
    check_notes TEXT,
    quality_score INTEGER CHECK (quality_score BETWEEN 0 AND 100),
    defects_found INTEGER DEFAULT 0,
    rework_required BOOLEAN DEFAULT false,
    attachments JSONB, -- ["photo1.jpg", "photo2.jpg"]
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(production_order_id, stage_id),
    INDEX idx_tracking_order (production_order_id),
    INDEX idx_tracking_stage (stage_id),
    INDEX idx_tracking_status (status),
    INDEX idx_tracking_assigned (assigned_to),
    INDEX idx_tracking_dates (entered_at, completed_at),
    INDEX idx_tracking_delayed (is_delayed)
);
```

### 8. stage_transitions
Log of all stage status changes for audit.

```sql
CREATE TABLE stage_transitions (
    id SERIAL PRIMARY KEY,
    stage_tracking_id INTEGER NOT NULL REFERENCES stage_tracking(id) ON DELETE CASCADE,
    from_status VARCHAR(20),
    to_status VARCHAR(20) NOT NULL,
    reason TEXT,
    transitioned_by INTEGER REFERENCES users(id),
    transitioned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB, -- Additional context

    INDEX idx_transitions_tracking (stage_tracking_id),
    INDEX idx_transitions_by (transitioned_by),
    INDEX idx_transitions_at (transitioned_at)
);
```

### 9. production_delays
Detailed delay tracking and analysis.

```sql
CREATE TABLE production_delays (
    id SERIAL PRIMARY KEY,
    production_order_id INTEGER NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
    stage_id INTEGER REFERENCES production_stages(id),
    delay_type VARCHAR(50) NOT NULL, -- 'material', 'worker', 'equipment', 'quality', 'other'
    delay_hours DECIMAL(8,2) NOT NULL,
    delay_reason TEXT NOT NULL,
    impact_level VARCHAR(20) DEFAULT 'medium' CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
    resolution_action TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by INTEGER REFERENCES users(id),
    prevented_future BOOLEAN DEFAULT false,
    cost_impact DECIMAL(15,2),
    reported_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_delays_order (production_order_id),
    INDEX idx_delays_stage (stage_id),
    INDEX idx_delays_type (delay_type),
    INDEX idx_delays_unresolved (resolved_at) WHERE resolved_at IS NULL
);
```

### 10. production_documents
Attachments and documents for production orders.

```sql
CREATE TABLE production_documents (
    id SERIAL PRIMARY KEY,
    production_order_id INTEGER NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
    stage_id INTEGER REFERENCES production_stages(id),
    document_type VARCHAR(50) NOT NULL, -- 'specification', 'quality_report', 'photo', 'instruction'
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    description TEXT,
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_prod_docs_order (production_order_id),
    INDEX idx_prod_docs_stage (stage_id),
    INDEX idx_prod_docs_type (document_type)
);
```

### 11. worker_performance
Track worker performance metrics.

```sql
CREATE TABLE worker_performance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    stage_id INTEGER NOT NULL REFERENCES production_stages(id),
    period_date DATE NOT NULL,
    orders_completed INTEGER DEFAULT 0,
    orders_failed INTEGER DEFAULT 0,
    average_duration_hours DECIMAL(8,2),
    efficiency_rate DECIMAL(5,2), -- percentage vs standard time
    quality_score DECIMAL(5,2), -- average quality score
    rework_rate DECIMAL(5,2), -- percentage requiring rework
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, stage_id, period_date),
    INDEX idx_performance_user (user_id),
    INDEX idx_performance_stage (stage_id),
    INDEX idx_performance_date (period_date)
);
```

### 12. process_templates
Pre-defined process templates for quick setup.

```sql
CREATE TABLE process_templates (
    id SERIAL PRIMARY KEY,
    template_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    template_data JSONB NOT NULL, -- Full process definition
    usage_count INTEGER DEFAULT 0,
    is_system BOOLEAN DEFAULT false, -- System templates cannot be edited
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_templates_category (category),
    INDEX idx_templates_system (is_system)
);
```

## Views for Performance

### Production Overview View
```sql
CREATE VIEW v_production_overview AS
SELECT
    po.id,
    po.production_number,
    po.production_status,
    po.priority,
    po.is_delayed,
    o.order_number,
    c.name as customer_name,
    p.name as product_name,
    col.name as color_name,
    pp.name as process_name,
    ps.name as current_stage_name,
    po.planned_start_date,
    po.planned_end_date,
    po.quantity_to_produce,
    po.quantity_completed,
    (SELECT COUNT(*) FROM stage_tracking st
     WHERE st.production_order_id = po.id AND st.status = 'pass') as stages_completed,
    (SELECT COUNT(*) FROM production_stages ps2
     WHERE ps2.process_id = po.process_id) as total_stages
FROM production_orders po
JOIN order_details od ON po.order_detail_id = od.id
JOIN orders o ON od.order_id = o.id
JOIN customers c ON o.customer_id = c.id
JOIN products p ON od.product_id = p.id
JOIN colors col ON od.color_id = col.id
JOIN production_processes pp ON po.process_id = pp.id
LEFT JOIN production_stages ps ON po.current_stage_id = ps.id;
```

### Worker Assignment View
```sql
CREATE VIEW v_worker_assignments AS
SELECT
    u.id as user_id,
    u.full_name as worker_name,
    ps.id as stage_id,
    ps.name as stage_name,
    pp.name as process_name,
    sa.assignment_type,
    sa.shift,
    sa.current_load,
    sa.max_capacity,
    (sa.current_load::DECIMAL / sa.max_capacity * 100) as utilization_percent,
    COUNT(st.id) as active_orders
FROM users u
JOIN stage_assignments sa ON u.id = sa.user_id
JOIN production_stages ps ON sa.stage_id = ps.id
JOIN production_processes pp ON ps.process_id = pp.id
LEFT JOIN stage_tracking st ON st.assigned_to = u.id
    AND st.status IN ('pending', 'in_progress')
WHERE sa.is_active = true
    AND u.role = 'worker'
GROUP BY u.id, ps.id, pp.id, sa.id;
```

## Triggers

### Update Current Stage
```sql
CREATE OR REPLACE FUNCTION update_current_stage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'pass' THEN
        -- Get next stage
        UPDATE production_orders
        SET current_stage_id = (
            SELECT ps.id
            FROM production_stages ps
            WHERE ps.process_id = (
                SELECT process_id FROM production_orders WHERE id = NEW.production_order_id
            )
            AND ps.sequence_order = NEW.stage_sequence + 1
        )
        WHERE id = NEW.production_order_id;

        -- Check if was final stage
        IF NOT FOUND THEN
            UPDATE production_orders
            SET production_status = 'completed',
                actual_end_date = CURRENT_TIMESTAMP
            WHERE id = NEW.production_order_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_current_stage
AFTER UPDATE OF status ON stage_tracking
FOR EACH ROW
WHEN (NEW.status = 'pass')
EXECUTE FUNCTION update_current_stage();
```

### Update Worker Load
```sql
CREATE OR REPLACE FUNCTION update_worker_load()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.assigned_to != OLD.assigned_to) THEN
        -- Decrease old worker load
        IF TG_OP = 'UPDATE' AND OLD.assigned_to IS NOT NULL THEN
            UPDATE stage_assignments
            SET current_load = GREATEST(0, current_load - 1)
            WHERE user_id = OLD.assigned_to AND stage_id = OLD.stage_id;
        END IF;

        -- Increase new worker load
        IF NEW.assigned_to IS NOT NULL AND NEW.status IN ('pending', 'in_progress') THEN
            UPDATE stage_assignments
            SET current_load = current_load + 1
            WHERE user_id = NEW.assigned_to AND stage_id = NEW.stage_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_worker_load
AFTER INSERT OR UPDATE OF assigned_to ON stage_tracking
FOR EACH ROW
EXECUTE FUNCTION update_worker_load();
```

## Indexes Strategy
- Primary keys: Automatically indexed
- Foreign keys: All indexed for joins
- Status fields: For filtering active records
- Date fields: For range queries and sorting
- Composite indexes: For common query patterns

## Migration Notes
- Run after M01 and M02 complete
- Create sample process templates
- Migrate any existing process data
- Set up initial worker assignments
- Configure skill matrix
