---
task_id: T01_S01
sprint_sequence_id: S01
status: open
complexity: Medium
last_updated: 2025-08-18T12:45:00Z
---

# T01_S01: Process Database Schema Implementation

## Description

Implement the core database schema for production process foundation, establishing the 4 foundational tables that enable standardized multi-stage workflow definition and management. This creates the data layer foundation for process templates, stage definitions, dependencies, and pre-built templates that will be used throughout the production management system.

## Goal / Objectives

- Implement the 4 core process tables with proper relationships and constraints
- Establish data integrity through foreign keys and business rules
- Create performance-optimized indexes for process management operations
- Enable template-based process creation and stage dependency management
- Support process versioning and categorization for organizational workflows

## Acceptance Criteria

- [ ] `production_processes` table implemented with process templates and categorization
- [ ] `production_stages` table implemented with stage sequencing and timing
- [ ] `stage_dependencies` table implemented with dependency relationships
- [ ] `process_templates` table implemented with pre-defined workflow templates
- [ ] All foreign key relationships established with proper cascade rules
- [ ] Performance indexes created following project patterns (<100ms query targets)
- [ ] Business constraints enforced (stage ordering, dependency validation)
- [ ] Database migration generated and tested successfully
- [ ] Schema aligns with M03 Database Schema specification exactly
- [ ] Drizzle ORM patterns followed consistently with existing codebase

## Subtasks

- [ ] Study existing database patterns in Schema.ts and security.ts
- [ ] Define production_processes table with Drizzle ORM
- [ ] Define production_stages table with process relationships
- [ ] Define stage_dependencies table with dependency logic
- [ ] Define process_templates table with template data storage
- [ ] Create comprehensive indexes for performance optimization
- [ ] Add business constraints and validation rules
- [ ] Generate and test database migration
- [ ] Document table relationships and business logic
- [ ] Validate schema compliance with M03 specification

## Technical Guidance

**Key Database Schema Files to Reference:**
- `/Users/mac/codingagent/vtlsaas/src/models/Schema.ts` - Main schema patterns and table definitions
- `/Users/mac/codingagent/vtlsaas/src/db/schema/security.ts` - Schema file organization patterns
- `/Users/mac/codingagent/vtlsaas/drizzle.config.ts` - Drizzle configuration and migration setup
- `/Users/mac/codingagent/vtlsaas/migrations/0008_m02_units_price_history.sql` - Migration file patterns

**Drizzle ORM Patterns to Follow:**
- Use `pgTable()` for table definitions with proper naming conventions
- Follow existing column type patterns: `serial('id').primaryKey()`, `varchar()`, `text()`, `timestamp()`
- Implement proper foreign key relationships using `.references()`
- Add indexes using the second parameter function: `(table) => { return { indexName: index().on() } }`
- Use `uniqueIndex()` for unique constraints and `index()` for performance indexes
- Follow timestamp patterns: `timestamp('created_at', { withTimezone: true }).defaultNow().notNull()`
- Use proper enum definitions with `pgEnum()` for status fields

**Database Relationship Conventions:**
- Foreign keys use `integer('field_name').references(() => targetSchema.id)`
- Cascade rules: `onDelete: 'cascade'` for dependent data, `onDelete: 'restrict'` for referenced data
- Self-referencing relationships (like parent_process_id) handled with proper typing
- Junction tables use composite unique indexes for many-to-many relationships
- Audit fields: `createdBy`, `createdAt`, `updatedAt` following existing patterns

**Migration Approach:**
- Extend existing `src/models/Schema.ts` file with new table definitions
- Generate migration using `npm run db:generate` command
- Migration files follow pattern: `NNNN_descriptive_name.sql`
- Include proper error handling with `DO $$ BEGIN...EXCEPTION...END $$;` blocks
- Add index creation and constraint validation in migration
- Include table comments for documentation

## Implementation Notes

**Step-by-Step Implementation Approach:**

1. **Analyze Existing Patterns**:
   - Study table definition patterns in Schema.ts (lines 30-55 for organizationSchema)
   - Review foreign key patterns from customerSchema (lines 130-181)
   - Examine enum usage patterns (roleEnum, permissionEnum on lines 58-72)
   - Note index creation patterns (lines 168-179 for customer indexes)

2. **Define Enums and Types**:
   - Create skill level enum: `pgEnum('skill_level', ['basic', 'intermediate', 'advanced'])`
   - Create priority enum: `pgEnum('priority', ['urgent', 'high', 'normal', 'low'])`
   - Create dependency type enum: `pgEnum('dependency_type', ['start', 'finish'])`

3. **Implement production_processes Table**:
   - Serial primary key with unique process_code constraint
   - Support for versioning with parent_process_id self-reference
   - JSONB tags field for flexible categorization
   - Approval workflow fields (approved_by, approved_at)
   - Follow existing naming: nameEn for English translations
   - Add indexes: process_code, category, active status, tags (GIN index)

4. **Implement production_stages Table**:
   - Link to production_processes with CASCADE delete
   - Unique constraints: (process_id, sequence_order) and (process_id, stage_code)  
   - JSONB quality_checklist field for flexible checklists
   - Boolean flags: is_qc_point, is_final_stage, allow_parallel
   - Skills and timing: skill_level, standard_duration_hours
   - Add indexes: process_id, sequence_order, qc checkpoints

5. **Implement stage_dependencies Table**:
   - Establish stage-to-stage dependency relationships
   - Support dependency_type (start/finish) and lag_hours
   - Unique constraint preventing duplicate dependencies
   - Self-reference check preventing stage depending on itself
   - Minimal indexing focused on performance queries

6. **Implement process_templates Table**:
   - Template storage with JSONB template_data field
   - System vs user templates with is_system boolean
   - Usage tracking with usage_count field
   - Category-based organization matching production_processes
   - Add indexes: category, system flag for template queries

7. **Create Performance Indexes**:
   - Follow existing patterns from customerSchema indexes
   - Composite indexes for common query patterns
   - GIN indexes for JSONB fields (tags, template_data)
   - Partial indexes for active/system flags where applicable

8. **Add Business Constraints**:
   - Check constraints for valid skill levels and priorities
   - Ensure stage sequence_order is positive
   - Validate dependency relationships don't create cycles
   - Ensure standard_duration_hours is non-negative

9. **Generate and Test Migration**:
   - Run `npm run db:generate` to create migration file
   - Review generated SQL for correctness
   - Test migration with clean database
   - Verify all constraints and indexes are created properly

10. **Documentation and Validation**:
    - Add table comments describing business purpose
    - Document relationships between tables
    - Verify schema matches M03 specification exactly
    - Ensure consistent patterns with existing codebase

**Key Relationships to Establish:**
- production_stages.process_id → production_processes.id (CASCADE delete)
- stage_dependencies.stage_id → production_stages.id (CASCADE delete)  
- stage_dependencies.depends_on_stage_id → production_stages.id (CASCADE delete)
- production_processes.parent_process_id → production_processes.id (self-reference)
- All created_by fields → userSchema.id for audit trails

**Error Handling Considerations:**
- Handle concurrent modifications with proper transactions
- Validate stage sequence ordering during inserts/updates
- Prevent circular dependencies in stage_dependencies
- Ensure process versioning maintains data integrity
- Handle cascade deletes gracefully to prevent orphaned data

**Integration with Existing System:**
- Follow audit logging patterns from existing tables
- Maintain consistency with timestamp handling (withTimezone: true)
- Use existing user references for created_by/approved_by fields
- Follow existing naming conventions and field patterns
- Ensure compatibility with existing Drizzle ORM setup

**Performance Optimization:**
- Index strategy optimized for process loading and stage queries
- JSONB fields for flexible metadata without schema changes
- Partial indexes on filtered queries (active processes, system templates)
- Composite indexes for common join patterns
- Consider query patterns for Kanban board visualization (M04 dependency)

## Dependencies

- Completion of M01 Foundation (user tables and basic infrastructure)
- Completion of M02 Order Management (order tables for future production_orders reference)
- Existing Drizzle ORM setup and migration infrastructure
- Database connection and environment configuration

## Notes

This task establishes the core data foundation for all M03 Production Process features. The 4 tables work together to enable:

- **Process Templates**: Reusable workflow definitions with categorization
- **Stage Management**: Sequential workflow steps with timing and requirements  
- **Dependency Control**: Complex workflow relationships and parallel processing
- **Template Library**: Pre-built processes for rapid deployment

The schema design supports future M04 Kanban visualization requirements and maintains compatibility with existing M01/M02 data structures. All patterns follow established project conventions to ensure maintainability and consistency.