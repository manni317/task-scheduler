-- Migration to add Organizations and Departments

-- 1. Create Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    business_type TEXT, -- e.g., 'service_based', 'product_based'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Organization Members table
CREATE TABLE organization_members (
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'employee',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (organization_id, user_id)
);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_org ON organization_members(organization_id);

-- 3. Create Departments table
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_departments_org ON departments(organization_id);

-- 4. Create Project Departments (Many-to-Many)
CREATE TABLE project_departments (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (project_id, department_id)
);

-- 5. Add organization_id to existing tables
-- First create a default organization so we can attach existing data to it
DO $$
DECLARE
    default_org_id UUID;
    user_rec RECORD;
BEGIN
    -- Check if we need to create a default org
    IF NOT EXISTS (SELECT 1 FROM organizations) THEN
        INSERT INTO organizations (name, business_type) 
        VALUES ('Default Organization', 'general') 
        RETURNING id INTO default_org_id;

        -- Add all existing users to the default organization
        FOR user_rec IN SELECT id, role FROM users LOOP
            INSERT INTO organization_members (organization_id, user_id, role)
            VALUES (default_org_id, user_rec.id, user_rec.role)
            ON CONFLICT DO NOTHING;
        END LOOP;
    ELSE
        SELECT id INTO default_org_id FROM organizations LIMIT 1;
    END IF;

    -- Add organization_id to users (primary org)
    ALTER TABLE users ADD COLUMN organization_id UUID REFERENCES organizations(id);
    UPDATE users SET organization_id = default_org_id WHERE organization_id IS NULL;

    -- Add organization_id to projects
    ALTER TABLE projects ADD COLUMN organization_id UUID REFERENCES organizations(id);
    UPDATE projects SET organization_id = default_org_id WHERE organization_id IS NULL;

    -- Add organization_id to tasks (optional but good for strict isolation)
    ALTER TABLE tasks ADD COLUMN organization_id UUID REFERENCES organizations(id);
    UPDATE tasks SET organization_id = default_org_id WHERE organization_id IS NULL;
    
END $$;
