-- Muze Satwik Task Manager - Functions & Triggers
-- Run after 001_init.sql

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_members_updated_at BEFORE UPDATE ON project_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_assignees_updated_at BEFORE UPDATE ON task_assignees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sub_tasks_updated_at BEFORE UPDATE ON sub_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_dependencies_updated_at BEFORE UPDATE ON task_dependencies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recurrence_rules_updated_at BEFORE UPDATE ON recurrence_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attachments_updated_at BEFORE UPDATE ON attachments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recurrence_rules_updated_at BEFORE UPDATE ON recurrence_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- AUDIT LOG TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_old_values JSONB;
    v_new_values JSONB;
    v_changed_fields TEXT[];
    v_entity_type TEXT;
BEGIN
    -- Get current user from request context (set by Supabase Auth)
    v_user_id := current_setting('request.jwt.claims', true)::jsonb ->> 'sub';
    v_user_id := NULLIF(v_user_id, '')::uuid;

    -- Determine entity type from table name
    v_entity_type := TG_TABLE_NAME;

    -- Build old/new values
    IF TG_OP = 'INSERT' THEN
        v_old_values := NULL;
        v_new_values := to_jsonb(NEW);
        v_changed_fields := ARRAY(SELECT jsonb_object_keys(to_jsonb(NEW)));
    ELSIF TG_OP = 'UPDATE' THEN
        v_old_values := to_jsonb(OLD);
        v_new_values := to_jsonb(NEW);
        v_changed_fields := ARRAY(
            SELECT key FROM jsonb_each(to_jsonb(NEW))
            WHERE value IS DISTINCT FROM (SELECT value FROM jsonb_each(to_jsonb(OLD)) WHERE key = jsonb_each.key)
        );
    ELSIF TG_OP = 'DELETE' THEN
        v_old_values := to_jsonb(OLD);
        v_new_values := NULL;
        v_changed_fields := ARRAY(SELECT jsonb_object_keys(to_jsonb(OLD)));
    END IF;

    -- Insert audit log
    INSERT INTO audit_logs (user_id, entity_type, entity_id, action, old_values, new_values, changed_fields)
    VALUES (
        v_user_id,
        v_entity_type,
        COALESCE(NEW.id, OLD.id),
        CASE TG_OP
            WHEN 'INSERT' THEN 'create'::audit_action
            WHEN 'UPDATE' THEN 'update'::audit_action
            WHEN 'DELETE' THEN 'delete'::audit_action
        END,
        v_old_values,
        v_new_values,
        v_changed_fields
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to main tables
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_projects AFTER INSERT OR UPDATE OR DELETE ON projects FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_milestones AFTER INSERT OR UPDATE OR DELETE ON milestones FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_tasks AFTER INSERT OR UPDATE OR DELETE ON tasks FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_sub_tasks AFTER INSERT OR UPDATE OR DELETE ON sub_tasks FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_task_dependencies AFTER INSERT OR UPDATE OR DELETE ON task_dependencies FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_comments AFTER INSERT OR UPDATE OR DELETE ON comments FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_attachments AFTER INSERT OR UPDATE OR DELETE ON attachments FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_time_entries AFTER INSERT OR UPDATE OR DELETE ON time_entries FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_recurrence_rules AFTER INSERT OR UPDATE OR DELETE ON recurrence_rules FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

-- ============================================================================
-- SEARCH VECTOR UPDATE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_task_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.task_key, '')), 'A') ||
        setweight(to_tsvector('english', array_to_string(NEW.tags, ' ')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_search_vector
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_task_search_vector();

-- ============================================================================
-- TASK KEY GENERATION
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_task_key()
RETURNS TRIGGER AS $$
DECLARE
    v_prefix TEXT;
    v_next_num INTEGER;
BEGIN
    -- Get project key prefix
    SELECT key_prefix INTO v_prefix FROM projects WHERE id = NEW.project_id;

    -- Get next sequence number for this project
    SELECT COALESCE(MAX(
        (regexp_match(task_key, v_prefix || '-(\d+)'))[1]::integer
    ), 0) + 1 INTO v_next_num
    FROM tasks WHERE project_id = NEW.project_id;

    NEW.task_key := v_prefix || '-' || v_next_num;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_task_key_trigger
    BEFORE INSERT ON tasks
    FOR EACH ROW EXECUTE FUNCTION generate_task_key();

-- ============================================================================
-- RECURRENCE TASK GENERATION
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_recurring_tasks()
RETURNS TRIGGER AS $$
DECLARE
    v_rule RECORD;
    v_next_due DATE;
    v_occurrence_count INTEGER := 0;
    v_new_task UUID;
BEGIN
    -- Only run on task completion for recurring tasks
    IF TG_OP = 'UPDATE' AND OLD.status = 'done' AND NEW.status = 'done' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.status = 'done' AND OLD.status != 'done' THEN
        -- Check if task has recurrence rule
        SELECT * INTO v_rule FROM recurrence_rules WHERE task_id = NEW.id;
        IF NOT FOUND THEN
            RETURN NEW;
        END IF;

        -- Calculate next due date based on recurrence rule
        v_next_due := CASE v_rule.frequency
            WHEN 'daily' THEN NEW.due_date + (v_rule.interval || ' days')::interval
            WHEN 'weekly' THEN NEW.due_date + (v_rule.interval || ' weeks')::interval
            WHEN 'monthly' THEN NEW.due_date + (v_rule.interval || ' months')::interval
            WHEN 'yearly' THEN NEW.due_date + (v_rule.interval || ' years')::interval
            ELSE NEW.due_date + (v_rule.interval || ' days')::interval
        END;

        -- Check termination conditions
        IF v_rule.until_date IS NOT NULL AND v_next_due > v_rule.until_date THEN
            RETURN NEW;
        END IF;

        -- Count existing occurrences
        SELECT COUNT(*) INTO v_occurrence_count
        FROM tasks
        WHERE parent_task_id = NEW.id OR id = NEW.id;

        IF v_rule.count IS NOT NULL AND v_occurrence_count >= v_rule.count THEN
            RETURN NEW;
        END IF;

        -- Create next recurring task
        INSERT INTO tasks (
            project_id, milestone_id, title, description, status, priority,
            assignee_id, reporter_id, reviewer_id, start_date, due_date,
            estimated_hours, tags, custom_fields, parent_task_id
        )
        SELECT
            NEW.project_id, NEW.milestone_id, NEW.title, NEW.description,
            'backlog'::task_status, NEW.priority,
            NEW.assignee_id, NEW.reporter_id, NEW.reviewer_id,
            v_next_due, v_next_due + (NEW.due_date - NEW.start_date),
            NEW.estimated_hours, NEW.tags, NEW.custom_fields, NEW.id
        RETURNING id INTO v_new_task;

        -- Copy sub-tasks
        INSERT INTO sub_tasks (task_id, title, is_completed, order_index)
        SELECT v_new_task, title, FALSE, order_index
        FROM sub_tasks WHERE task_id = NEW.id;

        -- Copy dependencies (as relates_to)
        INSERT INTO task_dependencies (task_id, depends_on_task_id, dependency_type)
        SELECT v_new_task, depends_on_task_id, 'relates_to'
        FROM task_dependencies WHERE task_id = NEW.id;

        -- Log recurrence creation
        INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
        SELECT assignee_id, 'recurrence_created', 'Recurring task created',
            'New recurring task generated: ' || NEW.title, v_new_task, 'task'
        FROM tasks WHERE id = v_new_task AND assignee_id IS NOT NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_recurring_tasks_trigger
    AFTER UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION generate_recurring_tasks();

-- ============================================================================
-- NOTIFICATION TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.assignee_id IS DISTINCT FROM OLD.assignee_id) THEN
        IF NEW.assignee_id IS NOT NULL THEN
            INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
            VALUES (
                NEW.assignee_id,
                'task_assigned',
                'Task assigned: ' || NEW.title,
                'You have been assigned to task ' || NEW.task_key,
                NEW.id, 'task'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_task_assigned_trigger
    AFTER INSERT OR UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION notify_task_assigned();

-- Notify on task status change
CREATE OR REPLACE FUNCTION notify_task_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
        -- Notify assignee
        IF NEW.assignee_id IS NOT NULL THEN
            INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
            VALUES (
                NEW.assignee_id,
                'task_updated',
                'Task status changed: ' || NEW.title,
                'Task ' || NEW.task_key || ' status changed from ' || OLD.status || ' to ' || NEW.status,
                NEW.id, 'task'
            );
        END IF;
        -- Notify reporter
        IF NEW.reporter_id IS NOT NULL AND NEW.reporter_id != NEW.assignee_id THEN
            INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
            VALUES (
                NEW.reporter_id,
                'task_updated',
                'Task status changed: ' || NEW.title,
                'Task ' || NEW.task_key || ' status changed from ' || OLD.status || ' to ' || NEW.status,
                NEW.id, 'task'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_task_status_change_trigger
    AFTER UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION notify_task_status_change();

-- Notify on comment added
CREATE OR REPLACE FUNCTION notify_comment_added()
RETURNS TRIGGER AS $$
DECLARE
    v_task RECORD;
    v_mentioned_users UUID[];
BEGIN
    IF TG_OP = 'INSERT' AND NOT NEW.is_system THEN
        SELECT * INTO v_task FROM tasks WHERE id = NEW.task_id;

        -- Notify assignee (if not the commenter)
        IF v_task.assignee_id IS NOT NULL AND v_task.assignee_id != NEW.user_id THEN
            INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
            VALUES (
                v_task.assignee_id, 'comment_added',
                'New comment on: ' || v_task.title,
                'New comment on task ' || v_task.task_key,
                NEW.id, 'comment'
            );
        END IF;

        -- Notify reporter (if not commenter or assignee)
        IF v_task.reporter_id IS NOT NULL AND v_task.reporter_id != NEW.user_id AND v_task.reporter_id != v_task.assignee_id THEN
            INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
            VALUES (
                v_task.reporter_id, 'comment_added',
                'New comment on: ' || v_task.title,
                'New comment on task ' || v_task.task_key,
                NEW.id, 'comment'
            );
        END IF;

        -- Extract @mentions from comment content
        SELECT ARRAY(
            SELECT (regexp_match(content, '@(\w+)', 'g'))[1]::uuid
            FROM comments WHERE id = NEW.id
        ) INTO v_mentioned_users;

        -- Notify mentioned users
        IF v_mentioned_users IS NOT NULL THEN
            INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
            SELECT unnest(v_mentioned_users), 'mention',
                'You were mentioned in: ' || v_task.title,
                'You were mentioned in a comment on task ' || v_task.task_key,
                NEW.id, 'comment'
            WHERE unnest(v_mentioned_users) != NEW.user_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_comment_added_trigger
    AFTER INSERT ON comments
    FOR EACH ROW EXECUTE FUNCTION notify_comment_added();

-- ============================================================================
-- DEADLINE NOTIFICATIONS (run via pg_cron or scheduled job)
-- ============================================================================

CREATE OR REPLACE FUNCTION check_upcoming_deadlines()
RETURNS VOID AS $$
DECLARE
    v_task RECORD;
BEGIN
    -- Tasks due in 24 hours
    FOR v_task IN
        SELECT id, task_key, title, assignee_id, due_date
        FROM tasks
        WHERE status NOT IN ('done', 'cancelled')
        AND due_date = CURRENT_DATE + INTERVAL '1 day'
        AND assignee_id IS NOT NULL
    LOOP
        INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
        VALUES (
            v_task.assignee_id, 'deadline_approaching',
            'Deadline approaching: ' || v_task.title,
            'Task ' || v_task.task_key || ' is due tomorrow',
            v_task.id, 'task'
        ) ON CONFLICT DO NOTHING;
    END LOOP;

    -- Overdue tasks
    FOR v_task IN
        SELECT id, task_key, title, assignee_id, due_date
        FROM tasks
        WHERE status NOT IN ('done', 'cancelled')
        AND due_date < CURRENT_DATE
        AND assignee_id IS NOT NULL
    LOOP
        INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
        VALUES (
            v_task.assignee_id, 'deadline_missed',
            'Deadline missed: ' || v_task.title,
            'Task ' || v_task.task_key || ' was due on ' || v_task.due_date,
            v_task.id, 'task'
        ) ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MILESTONE COMPLETION CHECK
-- ============================================================================

CREATE OR REPLACE FUNCTION check_milestone_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_incomplete_count INTEGER;
    v_milestone RECORD;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.status = 'done' AND OLD.status != 'done' THEN
        IF NEW.milestone_id IS NOT NULL THEN
            SELECT COUNT(*) INTO v_incomplete_count
            FROM tasks
            WHERE milestone_id = NEW.milestone_id
            AND status NOT IN ('done', 'cancelled');

            IF v_incomplete_count = 0 THEN
                UPDATE milestones SET status = 'completed', completed_at = NOW()
                WHERE id = NEW.milestone_id AND status != 'completed';

                -- Notify project members
                INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
                SELECT user_id, 'milestone_completed',
                    'Milestone completed',
                    'All tasks in milestone are complete',
                    NEW.milestone_id, 'milestone'
                FROM project_members pm
                JOIN milestones m ON m.project_id = pm.project_id
                WHERE m.id = NEW.milestone_id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_milestone_completion_trigger
    AFTER UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION check_milestone_completion();

-- ============================================================================
-- TASK COMPLETION TIMESTAMP
-- ============================================================================

CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.status = 'done' AND OLD.status != 'done' THEN
        NEW.completed_at = NOW();
    ELSIF TG_OP = 'UPDATE' AND NEW.status != 'done' AND OLD.status = 'done' THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_task_completed_at_trigger
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION set_task_completed_at();

-- ============================================================================
-- ACTUAL HOURS AGGREGATION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_task_actual_hours()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE tasks SET actual_hours = (
            SELECT COALESCE(SUM(duration_minutes), 0) / 60.0
            FROM time_entries
            WHERE task_id = NEW.task_id AND deleted_at IS NULL
        ) WHERE id = NEW.task_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tasks SET actual_hours = (
            SELECT COALESCE(SUM(duration_minutes), 0) / 60.0
            FROM time_entries
            WHERE task_id = OLD.task_id AND deleted_at IS NULL
        ) WHERE id = OLD.task_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_task_actual_hours_trigger
    AFTER INSERT OR UPDATE OR DELETE ON time_entries
    FOR EACH ROW EXECUTE FUNCTION update_task_actual_hours();

-- ============================================================================
-- SUB-TASK COMPLETION PROGRESS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_task_subtask_progress()
RETURNS TRIGGER AS $$
DECLARE
    v_total INTEGER;
    v_completed INTEGER;
BEGIN
    IF TG_OP IN ('INSERT', 'UPDATE', 'DELETE') THEN
        SELECT COUNT(*), COUNT(*) FILTER (WHERE is_completed)
        INTO v_total, v_completed
        FROM sub_tasks WHERE task_id = COALESCE(NEW.task_id, OLD.task_id);

        -- Auto-complete task if all sub-tasks done (optional behavior)
        -- UPDATE tasks SET status = 'done' WHERE id = COALESCE(NEW.task_id, OLD.task_id) AND v_total > 0 AND v_total = v_completed;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_task_subtask_progress_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sub_tasks
    FOR EACH ROW EXECUTE FUNCTION update_task_subtask_progress();

-- ============================================================================
-- PROJECT MEMBER VALIDATION
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_project_member()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure task assignee is a project member
    IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.assignee_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM project_members
            WHERE project_id = NEW.project_id AND user_id = NEW.assignee_id
        ) THEN
            RAISE EXCEPTION 'Assignee must be a project member';
        END IF;
    END IF;

    -- Ensure task reporter is a project member
    IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.reporter_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM project_members
            WHERE project_id = NEW.project_id AND user_id = NEW.reporter_id
        ) THEN
            RAISE EXCEPTION 'Reporter must be a project member';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_project_member_trigger
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION validate_project_member();

-- ============================================================================
-- CLEANUP FUNCTIONS
-- ============================================================================

-- Soft delete helper
CREATE OR REPLACE FUNCTION soft_delete(rel regclass, p_id uuid)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('UPDATE %s SET deleted_at = NOW() WHERE id = $1', rel) USING p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restore soft-deleted record
CREATE OR REPLACE FUNCTION restore_deleted(rel regclass, p_id uuid)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('UPDATE %s SET deleted_at = NULL WHERE id = $1', rel) USING p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PERMISSION HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION user_has_role(p_user_id uuid, p_role user_role)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users WHERE id = p_user_id AND role = p_role AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION user_is_project_member(p_user_id uuid, p_project_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = p_project_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION user_project_role(p_user_id uuid, p_project_id uuid)
RETURNS user_role AS $$
DECLARE
    v_role user_role;
BEGIN
    SELECT role INTO v_role FROM project_members
    WHERE project_id = p_project_id AND user_id = p_user_id;
    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can manage project (admin or owner)
CREATE OR REPLACE FUNCTION user_can_manage_project(p_user_id uuid, p_project_id uuid)
RETURNS BOOLEAN AS $$
DECLARE
    v_role user_role;
    v_owner_id uuid;
BEGIN
    SELECT role INTO v_role FROM project_members
    WHERE project_id = p_project_id AND user_id = p_user_id;

    SELECT owner_id INTO v_owner_id FROM projects WHERE id = p_project_id;

    RETURN v_role = 'admin' OR v_owner_id = p_user_id OR user_has_role(p_user_id, 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STATISTICS / ANALYTICS FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_project_stats(p_project_id uuid)
RETURNS TABLE (
    total_tasks BIGINT,
    completed_tasks BIGINT,
    in_progress_tasks BIGINT,
    overdue_tasks BIGINT,
    total_hours DECIMAL,
    completion_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE status = 'done')::BIGINT,
        COUNT(*) FILTER (WHERE status = 'in_progress')::BIGINT,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('done', 'cancelled'))::BIGINT,
        COALESCE(SUM(actual_hours), 0)::DECIMAL,
        CASE WHEN COUNT(*) > 0
            THEN ROUND(COUNT(*) FILTER (WHERE status = 'done')::DECIMAL / COUNT(*) * 100, 2)
            ELSE 0 END::DECIMAL
    FROM tasks
    WHERE project_id = p_project_id AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_workload(p_user_id uuid)
RETURNS TABLE (
    project_id UUID,
    project_name TEXT,
    assigned_tasks BIGINT,
    in_progress_tasks BIGINT,
    total_estimated_hours DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id, p.name,
        COUNT(t.id)::BIGINT,
        COUNT(t.id) FILTER (WHERE t.status = 'in_progress')::BIGINT,
        COALESCE(SUM(t.estimated_hours), 0)::DECIMAL
    FROM projects p
    JOIN project_members pm ON pm.project_id = p.id
    LEFT JOIN tasks t ON t.project_id = p.id AND t.assignee_id = p_user_id AND t.deleted_at IS NULL
    WHERE pm.user_id = p_user_id AND p.deleted_at IS NULL
    GROUP BY p.id, p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION update_updated_at_column TO authenticated;
GRANT EXECUTE ON FUNCTION audit_log_trigger TO authenticated;
GRANT EXECUTE ON FUNCTION update_task_search_vector TO authenticated;
GRANT EXECUTE ON FUNCTION generate_task_key TO authenticated;
GRANT EXECUTE ON FUNCTION generate_recurring_tasks TO authenticated;
GRANT EXECUTE ON FUNCTION notify_task_assigned TO authenticated;
GRANT EXECUTE ON FUNCTION notify_task_status_change TO authenticated;
GRANT EXECUTE ON FUNCTION notify_comment_added TO authenticated;
GRANT EXECUTE ON FUNCTION check_upcoming_deadlines TO authenticated;
GRANT EXECUTE ON FUNCTION check_milestone_completion TO authenticated;
GRANT EXECUTE ON FUNCTION set_task_completed_at TO authenticated;
GRANT EXECUTE ON FUNCTION update_task_actual_hours TO authenticated;
GRANT EXECUTE ON FUNCTION update_task_subtask_progress TO authenticated;
GRANT EXECUTE ON FUNCTION validate_project_member TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete TO authenticated;
GRANT EXECUTE ON FUNCTION restore_deleted TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_role TO authenticated;
GRANT EXECUTE ON FUNCTION user_is_project_member TO authenticated;
GRANT EXECUTE ON FUNCTION user_project_role TO authenticated;
GRANT EXECUTE ON FUNCTION user_can_manage_project TO authenticated;
GRANT EXECUTE ON FUNCTION get_project_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_workload TO authenticated;