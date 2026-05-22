-- 1. Optimize group member helper functions for RLS performance
CREATE OR REPLACE FUNCTION public.is_group_member(check_group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = check_group_id 
    AND user_id = (select auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(check_group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = check_group_id 
    AND user_id = (select auth.uid())
    AND role = 'admin'
  );
$$;

-- 2. Fix is_plan_member to support solo plans (created_by is self)
CREATE OR REPLACE FUNCTION public.is_plan_member(check_plan_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM plans p
    WHERE p.id = check_plan_id 
    AND (
      p.created_by = (select auth.uid()) 
      OR 
      EXISTS (
        SELECT 1 FROM group_members gm 
        WHERE gm.group_id = p.group_id 
        AND gm.user_id = (select auth.uid())
      )
    )
  );
$$;

-- 3. Recreate policies on plans table to allow solo operations
DROP POLICY IF EXISTS "Plans viewable by group members" ON public.plans;
DROP POLICY IF EXISTS "Plans insertable by group admins" ON public.plans;
DROP POLICY IF EXISTS "Plans updatable by group admins" ON public.plans;
DROP POLICY IF EXISTS "Plans deletable by group admins" ON public.plans;

CREATE POLICY "Plans viewable by group members or creator" ON public.plans FOR SELECT USING (
  created_by = (select auth.uid()) OR (select public.is_group_member(group_id))
);
CREATE POLICY "Plans insertable by creator or group admin" ON public.plans FOR INSERT WITH CHECK (
  created_by = (select auth.uid()) OR (select public.is_group_admin(group_id))
);
CREATE POLICY "Plans updatable by creator or group admin" ON public.plans FOR UPDATE USING (
  created_by = (select auth.uid()) OR (select public.is_group_admin(group_id))
);
CREATE POLICY "Plans deletable by creator or group admin" ON public.plans FOR DELETE USING (
  created_by = (select auth.uid()) OR (select public.is_group_admin(group_id))
);

-- 4. Create coming_soon_interest table
CREATE TABLE IF NOT EXISTS public.coming_soon_interest (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  suggestion text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coming_soon_interest ENABLE ROW LEVEL SECURITY;

-- Allow insert/select for public visitors
DROP POLICY IF EXISTS "Anyone can insert interest" ON public.coming_soon_interest;
DROP POLICY IF EXISTS "Anyone can view interest list" ON public.coming_soon_interest;

CREATE POLICY "Anyone can insert interest" ON public.coming_soon_interest FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view interest list" ON public.coming_soon_interest FOR SELECT USING (true);

-- Index for sorting by date
CREATE INDEX IF NOT EXISTS coming_soon_interest_created_at_idx ON public.coming_soon_interest (created_at DESC);
