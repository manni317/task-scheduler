-- Drop permissive policies
DROP POLICY IF EXISTS "Allow all operations for public on projects" ON projects;
DROP POLICY IF EXISTS "Allow all operations for public on tasks" ON tasks;
DROP POLICY IF EXISTS "Allow all operations for public on profiles" ON profiles;

-- Create helper function for admin check
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- ORGANIZATIONS
CREATE POLICY "Admins can do everything on organizations" ON organizations
  FOR ALL USING (is_admin());

CREATE POLICY "Users can see organizations they belong to" ON organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update organizations they manage" ON organizations
  FOR UPDATE USING (
    id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role = 'manager')
  );

-- ORGANIZATION MEMBERS
CREATE POLICY "Admins can do everything on org members" ON organization_members
  FOR ALL USING (is_admin());

CREATE POLICY "Users can see members of their organizations" ON organization_members
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
  );

-- PROJECTS
CREATE POLICY "Admins can do everything on projects" ON projects
  FOR ALL USING (is_admin());

CREATE POLICY "Users can see projects in their organizations" ON projects
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
  );
  
CREATE POLICY "Managers can insert projects" ON projects
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role = 'manager')
  );
  
CREATE POLICY "Managers can update projects" ON projects
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role = 'manager')
  );

CREATE POLICY "Managers can delete projects" ON projects
  FOR DELETE USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role = 'manager')
  );

-- TASKS
CREATE POLICY "Admins can do everything on tasks" ON tasks
  FOR ALL USING (is_admin());

CREATE POLICY "Users can see tasks in their projects" ON tasks
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE org_id IN (
        SELECT org_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert tasks in their projects" ON tasks
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE org_id IN (
        SELECT org_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );
  
CREATE POLICY "Users can update tasks in their projects" ON tasks
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE org_id IN (
        SELECT org_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );
  
CREATE POLICY "Users can delete tasks in their projects" ON tasks
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE org_id IN (
        SELECT org_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );
