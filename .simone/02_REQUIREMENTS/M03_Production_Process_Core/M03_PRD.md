# M03: Production Process Core - Product Requirements Document

## Overview
This milestone implements the core production process management system, establishing the foundation for manufacturing workflow control. It includes process templates, stage configuration, worker assignments, and the production planning interface.

## Milestone Objectives
- Create production process templates
- Implement multi-stage workflow configuration
- Build worker-stage assignment system
- Develop production planning interface
- Establish production order lifecycle

## Timeline
- **Duration**: 5-6 weeks
- **Dependencies**: M01 (Foundation completed)
- **Parallel Work**: Can run alongside M02
- **Team Size**: 2 backend developers, 1 frontend developer

## Deliverables

### 1. Production Process Management
- Process template creation
- Process activation/deactivation
- Process cloning and versioning
- Process category management
- Visual process designer
- Process documentation attachments

### 2. Production Stage Configuration
- Sequential stage definition
- Stage naming and coding
- Standard duration setting (hours)
- Stage instruction management
- Final stage marking
- Stage reordering capability
- Stage dependency rules

### 3. Worker Assignment System
- Stage-worker mapping interface
- Multi-worker per stage support
- Worker skill tracking
- Assignment scheduling
- Temporary assignment handling
- Assignment history tracking
- Bulk assignment tools

### 4. Production Planning
- Order to process assignment
- Batch planning support
- Capacity planning view
- Production calendar
- Priority management
- Planned vs actual tracking
- Resource allocation

### 5. Production Order Management
- Production order creation from sales orders
- Status tracking through stages
- Stage entry/exit timestamps
- Current location tracking
- Production notes system
- Document attachments
- QR code generation

## Success Criteria
- [ ] Process creation completes in < 5 seconds
- [ ] Support 50+ stages per process
- [ ] Stage assignments update in real-time
- [ ] Production planning handles 1000+ orders
- [ ] Worker can see only assigned stages
- [ ] Audit trail for all changes
- [ ] Mobile-friendly worker interfaces
- [ ] Zero data loss during transitions

## Technical Specifications

### Database Schema Additions
```sql
-- Production processes
production_processes (
  id, process_code, name, description, category,
  is_active, version, created_by, created_at, updated_at
)

-- Production stages
production_stages (
  id, process_id, stage_code, name, sequence_order,
  standard_duration_hours, instructions, is_final_stage,
  created_at, updated_at
)

-- Stage assignments
stage_assignments (
  id, stage_id, user_id, assigned_date, assigned_by,
  is_active, start_date, end_date, created_at
)

-- Production orders
production_orders (
  id, order_detail_id, process_id, production_status,
  planned_start_date, actual_start_date, planned_end_date,
  actual_end_date, current_stage_id, priority, notes
)

-- Stage tracking
stage_tracking (
  id, production_order_id, stage_id, status,
  checked_by, check_notes, entered_at, exited_at,
  duration_hours, is_delayed
)
```

### API Endpoints
- **Production Processes**:
  - GET /api/production-processes
  - GET /api/production-processes/:id
  - POST /api/production-processes
  - PUT /api/production-processes/:id
  - POST /api/production-processes/:id/clone
  - GET /api/production-processes/:id/stages

- **Stages**:
  - GET /api/stages
  - POST /api/stages
  - PUT /api/stages/:id
  - PUT /api/stages/reorder
  - DELETE /api/stages/:id

- **Assignments**:
  - GET /api/assignments
  - POST /api/assignments
  - PUT /api/assignments/:id
  - POST /api/assignments/bulk
  - GET /api/assignments/worker/:userId

- **Production Orders**:
  - GET /api/production-orders
  - POST /api/production-orders
  - PUT /api/production-orders/:id
  - GET /api/production-orders/:id/tracking
  - PUT /api/production-orders/:id/stage

### Business Logic

#### Process Creation Flow
1. Define process name and category
2. Add stages sequentially
3. Set standard durations
4. Assign workers to stages
5. Activate process
6. Make available for planning

#### Production Planning Flow
1. Select confirmed orders
2. Choose appropriate process
3. Check worker availability
4. Set priorities
5. Generate production orders
6. Notify assigned workers

#### Stage Transition Rules
1. Must complete current stage
2. Check quality status (pass/fail/pending)
3. Record exit timestamp
4. Move to next sequential stage
5. Notify next stage workers
6. Update order location

## User Interface Requirements

### Process Designer
- Drag-drop stage creation
- Visual flow representation
- Stage property panels
- Duration visualization
- Worker assignment preview
- Process simulation mode

### Planning Dashboard
- Calendar view of production
- Capacity utilization charts
- Order queue management
- Drag-drop scheduling
- Conflict detection
- What-if scenarios

### Worker Assignment Matrix
- Grid view: Workers × Stages
- Skill-based filtering
- Availability calendar
- Quick assignment toggles
- Conflict warnings
- Historical view

## Business Rules
1. Process must have at least one stage
2. Stage order cannot have gaps
3. Worker can be assigned to multiple stages
4. Final stage must be explicitly marked
5. Cannot delete stage with active orders
6. Process changes require version increment
7. Inactive workers cannot be assigned
8. Standard duration must be positive

## Integration Requirements
- Pull orders from M02 (Order Management)
- Worker data from M01 (Authentication)
- Feed into M04 (Kanban visualization)
- Provide data for M05 (Analytics)

## Performance Requirements
- Process list loads in < 2 seconds
- Stage reordering < 500ms response
- Assignment updates < 1 second
- Support 100+ concurrent planners
- Handle 10,000+ active orders

## Security Considerations
- Role-based process access
- Stage-level permissions
- Audit all assignments
- Encrypt sensitive instructions
- IP-based access for floor

## Future Enhancements
- AI-based process optimization
- Automated worker assignment
- Predictive duration adjustment
- Multi-plant support
- Process template marketplace
