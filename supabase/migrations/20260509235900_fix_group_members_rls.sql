-- Create SECURITY DEFINER functions to check group membership without triggering RLS recursively
CREATE OR REPLACE FUNCTION public.is_group_member(check_group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = check_group_id 
    AND user_id = auth.uid()
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
    AND user_id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Drop the old recursive policies on group_members
DROP POLICY IF EXISTS "Group members viewable by members" ON public.group_members;
DROP POLICY IF EXISTS "Group members insertable by self or admin" ON public.group_members;
DROP POLICY IF EXISTS "Group members updatable by admins" ON public.group_members;
DROP POLICY IF EXISTS "Group members deletable by self or admin" ON public.group_members;

-- Recreate policies using the SECURITY DEFINER functions
CREATE POLICY "Group members viewable by members" ON public.group_members FOR SELECT 
  USING (public.is_group_member(group_id));

CREATE POLICY "Group members insertable by self or admin" ON public.group_members FOR INSERT WITH CHECK (
  auth.uid() = user_id OR public.is_group_admin(group_id)
);

CREATE POLICY "Group members updatable by admins" ON public.group_members FOR UPDATE 
  USING (public.is_group_admin(group_id));

CREATE POLICY "Group members deletable by self or admin" ON public.group_members FOR DELETE 
  USING (auth.uid() = user_id OR public.is_group_admin(group_id));
