# M01: Database Schema Specification

## Overview
This document defines the database schema for Milestone 1: Foundation and Authentication. Only core tables required for authentication and user management are included.

## Database Configuration
- **Database**: PostgreSQL 15+
- **ORM**: Drizzle ORM
- **Naming Convention**: snake_case for tables and columns
- **Timestamps**: All tables include created_at and updated_at

## Schema Definition

### 1. users
Primary table for user accounts integrated with Clerk.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    clerk_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'worker')),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),

    INDEX idx_users_clerk_id (clerk_id),
    INDEX idx_users_email (email),
    INDEX idx_users_role (role),
    INDEX idx_users_active (is_active)
);
```

### 2. audit_logs
Tracks all user actions for security and compliance.

```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_audit_user (user_id),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_created (created_at)
);
```

### 3. user_sessions
Tracks active user sessions for security monitoring.

```sql
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_sessions_user (user_id),
    INDEX idx_sessions_token (session_token),
    INDEX idx_sessions_expires (expires_at)
);
```

### 4. permissions
Defines granular permissions for future RBAC expansion.

```sql
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### 5. role_permissions
Maps permissions to roles for access control.

```sql
CREATE TABLE role_permissions (
    id SERIAL PRIMARY KEY,
    role VARCHAR(20) NOT NULL,
    permission_id INTEGER NOT NULL REFERENCES permissions(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(role, permission_id),
    INDEX idx_role_perms_role (role)
);
```

## Drizzle Schema (TypeScript)

```typescript
// src/models/users.ts
import { boolean, index, integer, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  clerkId: varchar('clerk_id', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  role: varchar('role', { length: 20 }).notNull(),
  isActive: boolean('is_active').default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
}, (table) => {
  return {
    clerkIdIdx: index('idx_users_clerk_id').on(table.clerkId),
    emailIdx: index('idx_users_email').on(table.email),
    roleIdx: index('idx_users_role').on(table.role),
    activeIdx: index('idx_users_active').on(table.isActive),
  };
});
```

## Migration Scripts

### Initial Migration
```sql
-- migrations/0001_initial_schema.sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
    -- table definition as above
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    -- table definition as above
);

-- Continue for all tables...

-- Insert default permissions
INSERT INTO permissions (code, name, module) VALUES
('users.view', 'View Users', 'users'),
('users.create', 'Create Users', 'users'),
('users.edit', 'Edit Users', 'users'),
('users.delete', 'Delete Users', 'users');

-- Assign permissions to admin role
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions;
```

## Seed Data

```typescript
// src/db/seeds/001_users.ts
export async function seedUsers(db: Database) {
  await db.insert(users).values([
    {
      clerkId: 'clerk_test_admin',
      email: 'admin@vtlsaas.com',
      username: 'admin',
      fullName: 'System Administrator',
      role: 'admin',
      isActive: true,
    },
    {
      clerkId: 'clerk_test_manager',
      email: 'manager@vtlsaas.com',
      username: 'manager1',
      fullName: 'Production Manager',
      role: 'manager',
      isActive: true,
    },
  ]);
}
```

## Indexes Strategy
- Primary keys: Automatically indexed
- Foreign keys: Indexed for join performance
- Search fields: email, username indexed
- Filter fields: role, is_active indexed
- Timestamp fields: Indexed for audit queries

## Future Considerations
- Partitioning audit_logs by month when data grows
- Adding full-text search indexes for user search
- Implementing row-level security policies
- Adding database-level encryption for sensitive data
