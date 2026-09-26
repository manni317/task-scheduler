-- Muze Satwik Task Manager - RLS Policies
-- Run after 001_init.sql and functions.sql

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurrence_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS FOR POLICIES
-- ============================================================================

-- Current user ID from auth context
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = current_user_id()
        AND role = 'admin'
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if current user is project member
CREATE OR REPLACE FUNCTION is_project_member(p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = p_project_id
        AND user_id = current_user_id()
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get current user's project role
CREATE OR REPLACE FUNCTION current_user_project_role(p_project_id UUID)
RETURNS user_role AS $$
DECLARE
    v_role user_role;
BEGIN
    SELECT role INTO v_role FROM project_members
    WHERE project_id = p_project_id AND user_id = current_user_id();
    RETURN v_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if current user can manage project (admin or owner)
CREATE OR REPLACE FUNCTION can_manage_project(p_project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_owner_id UUID;
    v_role user_role;
BEGIN
    SELECT owner_id INTO v_owner_id FROM projects WHERE id = p_project_id;
    SELECT role INTO v_role FROM project_members
    WHERE project_id = p_project_id AND user_id = current_user_id();

    RETURN v_role = 'admin' OR v_owner_id = current_user_id() OR is_admin();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if current user can view project (member or admin)
CREATE OR REPLACE FUNCTION can_view_project(p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN is_project_member(p_project_id) OR is_admin();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if current user can edit project (admin, owner, or editor role)
CREATE OR REPLACE FUNCTION can_edit_project(p_project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_role user_role;
BEGIN
    SELECT role INTO v_role FROM project_members
    WHERE project_id = p_project_id AND user_id = current_user_id();

    RETURN v_role IN ('admin', 'employee') OR is_admin();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if current user is task assignee/reporter/reviewer
CREATE OR REPLACE FUNCTION is_task_participant(p_task_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM tasks
        WHERE id = p_task_id
        AND (assignee_id = current_user_id() OR reporter_id = current_user_id() OR reviewer_id = current_user_id())
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- USERS POLICIES
-- ============================================================================

-- Users can view their own profile and active users in their projects
CREATE POLICY users_select_own ON users FOR SELECT
USING (
    id = current_user_id() OR
    is_admin() OR
    EXISTS (
        SELECT 1 FROM project_members pm1
        JOIN project_members pm2 ON pm1.project_id = pm2.project_id
        WHERE pm1.user_id = current_user_id()
        AND pm2.user_id = users.id
    )
);

-- Users can update their own profile
CREATE POLICY users_update_own ON users FOR UPDATE
USING (id = current_user_id())
WITH CHECK (id = current_user_id());

-- Admins can insert/update/delete any user
CREATE POLICY users_admin_all ON users FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- ============================================================================
-- PROJECTS POLICIES
-- ============================================================================

-- Project members can view projects they belong to (non-deleted)
CREATE POLICY projects_select_member ON projects FOR SELECT
USING (
    can_view_project(id) AND deleted_at IS NULL
);

-- Admins can view all projects
CREATE POLICY projects_select_admin ON projects FOR SELECT
USING (is_admin());

-- Project owners/admins/employees can create projects
CREATE POLICY projects_insert_member ON projects FOR INSERT
WITH CHECK (
    owner_id = current_user_id() AND
    (is_admin() OR role IN ('admin', 'employee')::user_role)
);

-- Project owners/admins can update projects
CREATE POLICY projects_update_owner ON projects FOR UPDATE
USING (can_manage_project(id))
WITH CHECK (can_manage_project(id));

-- Project owners/admins can soft delete projects
CREATE POLICY projects_delete_owner ON projects FOR UPDATE
USING (can_manage_project(id))
WITH CHECK (can_manage_project(id));

-- ============================================================================
-- PROJECT MEMBERS POLICIES
-- ============================================================================

-- Project members can view project members
CREATE POLICY project_members_select ON project_members FOR SELECT
USING (can_view_project(project_id));

-- Project admins/owners can add members
CREATE POLICY project_members_insert ON project_members FOR INSERT
WITH CHECK (
    can_manage_project(project_id) AND
    NOT EXISTS (SELECT 1 FROM project_members WHERE project_id = project_members.project_id AND user_id = project_members.user_id)
);

-- Project admins/owners can update member roles
CREATE POLICY project_members_update ON project_members FOR UPDATE
USING (can_manage_project(project_id))
WITH CHECK (can_manage_project(project_id));

-- Project admins/owners can remove members (but not themselves if last admin)
CREATE POLICY project_members_delete ON project_members FOR DELETE
USING (
    can_manage_project(project_id) AND
    NOT (user_id = current_user_id() AND role = 'admin' AND
         (SELECT COUNT(*) FROM project_members WHERE project_id = project_members.project_id AND role = 'admin') = 1)
);

-- ============================================================================
-- MILESTONES POLICIES
-- ============================================================================

-- Project members can view milestones
CREATE POLICY milestones_select ON milestones FOR SELECT
USING (
    can_view_project(project_id) AND deleted_at IS NULL
);

-- Project admins/employees can create milestones
CREATE POLICY milestones_insert ON milestones FOR INSERT
WITH CHECK (
    can_edit_project(project_id) AND
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND deleted_at IS NULL)
);

-- Project admins/employees can update milestones
CREATE POLICY milestones_update ON milestones FOR UPDATE
USING (can_edit_project(project_id))
WITH CHECK (can_edit_project(project_id));

-- Project admins can delete milestones
CREATE POLICY milestones_delete ON milestones FOR UPDATE
USING (can_manage_project(project_id))
WITH CHECK (can_manage_project(project_id));

-- ============================================================================
-- TASKS POLICIES
-- ============================================================================

-- Project members can view tasks in their projects
CREATE POLICY tasks_select ON tasks FOR SELECT
USING (
    can_view_project(project_id) AND deleted_at IS NULL
);

-- Project members can create tasks
CREATE POLICY tasks_insert ON tasks FOR INSERT
WITH CHECK (
    can_view_project(project_id) AND
    reporter_id = current_user_id() AND
    (assignee_id IS NULL OR is_project_member(project_id)) AND
    (reviewer_id IS NULL OR is_project_member(project_id)) AND
    (milestone_id IS NULL OR EXISTS (SELECT 1 FROM milestones WHERE id = milestone_id AND project_id = tasks.project_id AND deleted_at IS NULL))
);

-- Task participants (assignee, reporter, reviewer) and project editors can update tasks
CREATE POLICY tasks_update ON tasks FOR UPDATE
USING (
    can_edit_project(project_id) OR
    is_task_participant(id) OR
    EXISTS (SELECT 1 FROM task_assignees WHERE task_id = tasks.id AND user_id = current_user_id())
)
WITH CHECK (
    can_edit_project(project_id) OR
    is_task_participant(id) OR
    EXISTS (SELECT 1 FROM task_assignees WHERE task_id = tasks.id AND user_id = current_user_id())
);

-- Project admins can delete tasks (soft delete)
CREATE POLICY tasks_delete ON tasks FOR UPDATE
USING (can_manage_project(project_id))
WITH CHECK (can_manage_project(project_id));

-- ============================================================================
-- TASK ASSIGNEES POLICIES
-- ============================================================================

-- Project members can view task assignees
CREATE POLICY task_assignees_select ON task_assignees FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM tasks t
        JOIN project_members pm ON pm.project_id = t.project_id
        WHERE t.id = task_assignees.task_id
        AND pm.user_id = current_user_id()
    )
);

-- Project editors can add assignees
CREATE POLICY task_assignees_insert ON task_assignees FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = task_id
        AND can_edit_project(t.project_id)
    ) AND
    is_project_member((SELECT project_id FROM tasks WHERE id = task_id))
);

-- Project editors can remove assignees
CREATE POLICY task_assignees_delete ON task_assignees FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = task_assignees.task_id
        AND can_edit_project(t.project_id)
    )
);

-- ============================================================================
-- SUB-TASKS POLICIES
-- ============================================================================

-- Task participants can view sub-tasks
CREATE POLICY sub_tasks_select ON sub_tasks FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = sub_tasks.task_id
        AND (can_view_project(t.project_id) OR is_task_participant(t.id))
    )
);

-- Task participants can create sub-tasks
CREATE POLICY sub_tasks_insert ON sub_tasks FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = task_id
        AND (can_edit_project(t.project_id) OR is_task_participant(t.id))
    )
);

-- Task participants can update sub-tasks
CREATE POLICY sub_tasks_update ON sub_tasks FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = sub_tasks.task_id
        AND (can_edit_project(t.project_id) OR is_task_participant(t.id))
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = sub_tasks.task_id
        AND (can_edit_project(t.project_id) OR is_task_participant(t.id))
    )
);

-- Task participants can delete sub-tasks
CREATE POLICY sub_tasks_delete ON sub_tasks FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = sub_tasks.task_id
        AND (can_edit_project(t.project_id) OR is_task_participant(t.id))
    )
);

-- ============================================================================
-- TASK DEPENDENCIES POLICIES
-- ============================================================================

-- Task participants can view dependencies
CREATE POLICY task_dependencies_select ON task_dependencies FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = task_dependencies.task_id
        AND (can_view_project(t.project_id) OR is_task_participant(t.id))
    )
);

-- Task participants can create dependencies
CREATE POLICY task_dependencies_insert ON task_dependencies FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM tasks t1
        JOIN tasks t2 ON t1.project_id = t2.project_id
        WHERE t1.id = task_id AND t2.id = depends_on_task_id
        AND (can_edit_project(t1.project_id) OR is_task_participant(t1.id))
    )
);

-- Task participants can delete dependencies
CREATE POLICY task_dependencies_delete ON task_dependencies FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = task_dependencies.task_id
        AND (can_edit_project(t.project_id) OR is_task_participant(t.id))
    )
);

-- ============================================================================
-- RECURRENCE RULES POLICIES
-- ============================================================================

-- Task participants can view recurrence rules
CREATE POLICY recurrence_rules_select ON recurrence_rules FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = recurrence_rules.task_id
        AND (can_view_project(t.project_id) OR is_task_participant(t.id))
    )
);

-- Task editors can manage recurrence rules
CREATE POLICY recurrence_rules_manage ON recurrence_rules FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = recurrence_rules.task_id
        AND (can_edit_project(t.project_id) OR is_task_participant(t.id))
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = recurrence_rules.task_id
        AND (can_edit_project(t.project_id) OR is_task_participant(t.id))
    )
);

-- ============================================================================
-- COMMENTS POLICIES
-- ============================================================================

-- Task participants can view comments
CREATE POLICY comments_select ON comments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = comments.task_id
        AND (can_view_project(t.project_id) OR is_task_participant(t.id))
        AND comments.deleted_at IS NULL
    )
);

-- Task participants can create comments
CREATE POLICY comments_insert ON comments FOR INSERT
WITH CHECK (
    user_id = current_user_id() AND
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = task_id
        AND (can_view_project(t.project_id) OR is_task_participant(t.id))
    )
);

-- Comment authors and project editors can update comments
CREATE POLICY comments_update ON comments FOR UPDATE
USING (
    user_id = current_user_id() OR
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = comments.task_id
        AND can_edit_project(t.project_id)
    )
)
WITH CHECK (
    user_id = current_user_id() OR
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = comments.task_id
        AND can_edit_project(t.project_id)
    )
);

-- Comment authors and project editors can soft delete comments
CREATE POLICY comments_delete ON comments FOR UPDATE
USING (
    user_id = current_user_id() OR
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = comments.task_id
        AND can_edit_project(t.project_id)
    )
)
WITH CHECK (
    user_id = current_user_id() OR
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = comments.task_id
        AND can_edit_project(t.project_id)
    )
);

-- ============================================================================
-- ATTACHMENTS POLICIES
-- ============================================================================

-- Task participants can view attachments
CREATE POLICY attachments_select ON attachments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = attachments.task_id
        AND (can_view_project(t.project_id) OR is_task_participant(t.id))
    )
);

-- Task participants can upload attachments
CREATE POLICY attachments_insert ON attachments FOR INSERT
WITH CHECK (
    uploaded_by = current_user_id() AND
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = task_id
        AND (can_view_project(t.project_id) OR is_task_participant(t.id))
    )
);

-- Uploaders and project editors can update attachments
CREATE POLICY attachments_update ON attachments FOR UPDATE
USING (
    uploaded_by = current_user_id() OR
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = attachments.task_id
        AND can_edit_project(t.project_id)
    )
)
WITH CHECK (
    uploaded_by = current_user_id() OR
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = attachments.task_id
        AND can_edit_project(t.project_id)
    )
);

-- Uploaders and project editors can delete attachments
CREATE POLICY attachments_delete ON attachments FOR DELETE
USING (
    uploaded_by = current_user_id() OR
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = attachments.task_id
        AND can_edit_project(t.project_id)
    )
);

-- ============================================================================
-- TIME ENTRIES POLICIES
-- ============================================================================

-- Task participants can view time entries
CREATE POLICY time_entries_select ON time_entries FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = time_entries.task_id
        AND (can_view_project(t.project_id) OR is_task_participant(t.id))
        AND time_entries.deleted_at IS NULL
    )
);

-- Users can create their own time entries
CREATE POLICY time_entries_insert ON time_entries FOR INSERT
WITH CHECK (
    user_id = current_user_id() AND
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = task_id
        AND (can_view_project(t.project_id) OR is_task_participant(t.id))
    )
);

-- Users can update their own time entries; project editors can update any
CREATE POLICY time_entries_update ON time_entries FOR UPDATE
USING (
    user_id = current_user_id() OR
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = time_entries.task_id
        AND can_edit_project(t.project_id)
    )
)
WITH CHECK (
    user_id = current_user_id() OR
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = time_entries.task_id
        AND can_edit_project(t.project_id)
    )
);

-- Users can soft delete their own time entries; project editors can delete any
CREATE POLICY time_entries_delete ON time_entries FOR UPDATE
USING (
    user_id = current_user_id() OR
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = time_entries.task_id
        AND can_edit_project(t.project_id)
    )
)
WITH CHECK (
    user_id = current_user_id() OR
    EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = time_entries.task_id
        AND can_edit_project(t.project_id)
    )
);

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================

-- Users can only view their own notifications
CREATE POLICY notifications_select ON notifications FOR SELECT
USING (user_id = current_user_id());

-- Users can update their own notifications (mark as read)
CREATE POLICY notifications_update ON notifications FOR UPDATE
USING (user_id = current_user_id())
WITH CHECK (user_id = current_user_id());

-- System can insert notifications (via triggers/functions)
CREATE POLICY notifications_insert ON notifications FOR INSERT
WITH CHECK (true); -- Controlled by SECURITY DEFINER functions

-- ============================================================================
-- AUDIT LOGS POLICIES
-- ============================================================================

-- Admins can view all audit logs
CREATE POLICY audit_logs_select_admin ON audit_logs FOR SELECT
USING (is_admin());

-- Project members can view audit logs for entities in their projects
CREATE POLICY audit_logs_select_member ON audit_logs FOR SELECT
USING (
    entity_type = 'project' AND can_view_project(entity_id) OR
    entity_type = 'milestone' AND EXISTS (
        SELECT 1 FROM milestones m
        JOIN projects p ON p.id = m.project_id
        WHERE m.id = audit_logs.entity_id AND can_view_project(p.id)
    ) OR
    entity_type IN ('task', 'sub_task', 'comment', 'attachment', 'time_entry') AND EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = audit_logs.entity_id AND can_view_project(t.project_id)
    ) OR
    entity_type = 'user' AND entity_id = current_user_id()
);

-- Only system (triggers) can insert audit logs
CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT
WITH CHECK (true); -- SECURITY DEFINER triggers

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON project_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON milestones TO authenticated;
GRANT SELECT, INSERT, UPDATE ON tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON task_assignees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sub_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON task_dependencies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON recurrence_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE ON comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON time_entries TO authenticated;
GRANT SELECT, UPDATE ON notifications TO authenticated;
GRANT SELECT ON audit_logs TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION current_user_id TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION is_project_member TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_project_role TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_project TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_project TO authenticated;
GRANT EXECUTE ON FUNCTION can_edit_project TO authenticated;
GRANT EXECUTE ON FUNCTION is_task_participant TO authenticated;