-- ==============================================================================
-- Complete Multi-Organization RLS & Column Sync Setup
-- Safe & idempotent script for Supabase Database
-- ==============================================================================

-- 1. Ensure columns exist on all relevant tables
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'general';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.organization_members ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
UPDATE public.organization_members SET organization_id = org_id WHERE organization_id IS NULL;

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
UPDATE public.tasks SET org_id = organization_id WHERE org_id IS NULL;

-- 2. Triggers to keep org_id and organization_id in 100% automatic sync
CREATE OR REPLACE FUNCTION public.sync_org_id_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.org_id IS NULL AND NEW.organization_id IS NOT NULL THEN
    NEW.org_id := NEW.organization_id;
  ELSIF NEW.organization_id IS NULL AND NEW.org_id IS NOT NULL THEN
    NEW.organization_id := NEW.org_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_org_members_org_id ON public.organization_members;
CREATE TRIGGER trg_sync_org_members_org_id
BEFORE INSERT OR UPDATE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.sync_org_id_columns();

DROP TRIGGER IF EXISTS trg_sync_projects_org_id ON public.projects;
CREATE TRIGGER trg_sync_projects_org_id
BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.sync_org_id_columns();

DROP TRIGGER IF EXISTS trg_sync_tasks_org_id ON public.tasks;
CREATE TRIGGER trg_sync_tasks_org_id
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.sync_org_id_columns();

-- 3. Helper Functions (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION public.user_orgs()
RETURNS SETOF uuid AS $$
  SELECT COALESCE(org_id, organization_id)
  FROM public.organization_members
  WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.user_managed_orgs()
RETURNS SETOF uuid AS $$
  SELECT COALESCE(org_id, organization_id)
  FROM public.organization_members
  WHERE user_id = auth.uid()
    AND (role IN ('manager', 'admin', 'owner') OR role IS NULL);
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- 5. Department Columns and Policies
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;
ALTER TABLE public.organization_members ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE POLICY "Users can see departments in their orgs" ON public.departments
  FOR SELECT USING (organization_id IN (SELECT user_orgs()));

CREATE POLICY "Managers can insert departments in their orgs" ON public.departments
  FOR INSERT WITH CHECK (organization_id IN (SELECT user_managed_orgs()));

CREATE POLICY "Managers can update departments in their orgs" ON public.departments
  FOR UPDATE USING (organization_id IN (SELECT user_managed_orgs()));

CREATE POLICY "Managers can delete departments in their orgs" ON public.departments
  FOR DELETE USING (organization_id IN (SELECT user_managed_orgs()));

