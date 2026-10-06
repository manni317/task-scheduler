-- Drop infinite recursion policies
DROP POLICY IF EXISTS "Users can see members of their organizations" ON organization_members;
DROP POLICY IF EXISTS "Users can see organizations they belong to" ON organizations;
DROP POLICY IF EXISTS "Users can update organizations they manage" ON organizations;
DROP POLICY IF EXISTS "Users can see projects in their organizations" ON projects;
DROP POLICY IF EXISTS "Managers can insert projects" ON projects;
DROP POLICY IF EXISTS "Managers can update projects" ON projects;
DROP POLICY IF EXISTS "Managers can delete projects" ON projects;
DROP POLICY IF EXISTS "Users can see tasks in their projects" ON tasks;
DROP POLICY IF EXISTS "Users can insert tasks in their projects" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks in their projects" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks in their projects" ON tasks;

-- Use SECURITY DEFINER functions to bypass recursion safely
CREATE OR REPLACE FUNCTION public.user_orgs()
RETURNS SETOF uuid AS $$
  SELECT org_id FROM public.organization_members WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.user_managed_orgs()
RETURNS SETOF uuid AS $$
  SELECT org_id FROM public.organization_members WHERE user_id = auth.uid() AND role = 'manager';
$$ LANGUAGE sql SECURITY DEFINER;

-- RECREATE POLICIES using the helper functions
-- organizations
CREATE POLICY "Users can see organizations they belong to" ON organizations
  FOR SELECT USING (id IN (SELECT user_orgs()));
CREATE POLICY "Users can update organizations they manage" ON organizations
  FOR UPDATE USING (id IN (SELECT user_managed_orgs()));

-- organization_members
CREATE POLICY "Users can see members of their organizations" ON organization_members
  FOR SELECT USING (org_id IN (SELECT user_orgs()));

-- projects
CREATE POLICY "Users can see projects in their organizations" ON projects
  FOR SELECT USING (org_id IN (SELECT user_orgs()));
CREATE POLICY "Managers can insert projects" ON projects
  FOR INSERT WITH CHECK (org_id IN (SELECT user_managed_orgs()));
CREATE POLICY "Managers can update projects" ON projects
  FOR UPDATE USING (org_id IN (SELECT user_managed_orgs()));
CREATE POLICY "Managers can delete projects" ON projects
  FOR DELETE USING (org_id IN (SELECT user_managed_orgs()));

-- tasks
CREATE POLICY "Users can see tasks in their projects" ON tasks
  FOR SELECT USING (project_id IN (SELECT id FROM projects WHERE org_id IN (SELECT user_orgs())));
CREATE POLICY "Users can insert tasks in their projects" ON tasks
  FOR INSERT WITH CHECK (project_id IN (SELECT id FROM projects WHERE org_id IN (SELECT user_orgs())));
CREATE POLICY "Users can update tasks in their projects" ON tasks
  FOR UPDATE USING (project_id IN (SELECT id FROM projects WHERE org_id IN (SELECT user_orgs())));
CREATE POLICY "Users can delete tasks in their projects" ON tasks
  FOR DELETE USING (project_id IN (SELECT id FROM projects WHERE org_id IN (SELECT user_orgs())));

CREATE POLICY "Users can see tasks assigned to them" ON tasks
  FOR SELECT USING (assignee_id = auth.uid() OR reporter_id = auth.uid());
CREATE POLICY "Users can update tasks assigned to them" ON tasks
  FOR UPDATE USING (assignee_id = auth.uid() OR reporter_id = auth.uid());
