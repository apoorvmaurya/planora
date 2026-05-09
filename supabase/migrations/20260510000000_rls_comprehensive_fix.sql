-- 1. Helper Functions
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

CREATE OR REPLACE FUNCTION public.is_plan_member(check_plan_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM plans p
    JOIN group_members gm ON p.group_id = gm.group_id
    WHERE p.id = check_plan_id 
    AND gm.user_id = auth.uid()
  );
$$;

-- 2. Drop Old Policies
-- Groups
DROP POLICY IF EXISTS "Groups viewable by members" ON public.groups;
DROP POLICY IF EXISTS "Groups insertable by authenticated users" ON public.groups;
DROP POLICY IF EXISTS "Groups updatable by admins" ON public.groups;
DROP POLICY IF EXISTS "Groups deletable by admins" ON public.groups;

-- Group Members
DROP POLICY IF EXISTS "Group members viewable by members" ON public.group_members;
DROP POLICY IF EXISTS "Group members insertable by self or admin" ON public.group_members;
DROP POLICY IF EXISTS "Group members updatable by admins" ON public.group_members;
DROP POLICY IF EXISTS "Group members deletable by self or admin" ON public.group_members;

-- Plans
DROP POLICY IF EXISTS "Plans viewable by group members" ON public.plans;
DROP POLICY IF EXISTS "Plans insertable by group admins" ON public.plans;
DROP POLICY IF EXISTS "Plans updatable by group admins" ON public.plans;
DROP POLICY IF EXISTS "Plans deletable by group admins" ON public.plans;

-- Itinerary Items
DROP POLICY IF EXISTS "Itinerary items viewable by group members" ON public.itinerary_items;
DROP POLICY IF EXISTS "Itinerary items insertable by group members" ON public.itinerary_items;
DROP POLICY IF EXISTS "Itinerary items updatable by group members" ON public.itinerary_items;
DROP POLICY IF EXISTS "Itinerary items deletable by group members" ON public.itinerary_items;

-- Member Votes
DROP POLICY IF EXISTS "Member votes viewable by group members" ON public.member_votes;
DROP POLICY IF EXISTS "Users can vote if in group" ON public.member_votes;
DROP POLICY IF EXISTS "Users can update own vote" ON public.member_votes;
DROP POLICY IF EXISTS "Users can delete own vote" ON public.member_votes;

-- Plan Expenses
DROP POLICY IF EXISTS "Plan expenses viewable by group members" ON public.plan_expenses;
DROP POLICY IF EXISTS "Plan expenses insertable by group members" ON public.plan_expenses;
DROP POLICY IF EXISTS "Plan expenses updatable by group members" ON public.plan_expenses;
DROP POLICY IF EXISTS "Plan expenses deletable by group members" ON public.plan_expenses;

-- Trip Memories
DROP POLICY IF EXISTS "Trip memories viewable by group members" ON public.trip_memories;
DROP POLICY IF EXISTS "Users can insert memories if in group" ON public.trip_memories;
DROP POLICY IF EXISTS "Users can update own memory" ON public.trip_memories;
DROP POLICY IF EXISTS "Users can delete own memory" ON public.trip_memories;


-- 3. Recreate Policies

-- Groups
CREATE POLICY "Groups viewable by members or creator" ON public.groups FOR SELECT 
  USING (created_by = auth.uid() OR public.is_group_member(id));
CREATE POLICY "Groups insertable by authenticated users" ON public.groups FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Groups updatable by admins" ON public.groups FOR UPDATE USING (public.is_group_admin(id));
CREATE POLICY "Groups deletable by admins" ON public.groups FOR DELETE USING (public.is_group_admin(id));

-- Group Members
CREATE POLICY "Group members viewable by members" ON public.group_members FOR SELECT USING (public.is_group_member(group_id));
CREATE POLICY "Group members insertable by self or admin" ON public.group_members FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_group_admin(group_id));
CREATE POLICY "Group members updatable by admins" ON public.group_members FOR UPDATE USING (public.is_group_admin(group_id));
CREATE POLICY "Group members deletable by self or admin" ON public.group_members FOR DELETE USING (auth.uid() = user_id OR public.is_group_admin(group_id));

-- Plans
CREATE POLICY "Plans viewable by group members" ON public.plans FOR SELECT USING (public.is_group_member(group_id));
CREATE POLICY "Plans insertable by group admins" ON public.plans FOR INSERT WITH CHECK (public.is_group_admin(group_id));
CREATE POLICY "Plans updatable by group admins" ON public.plans FOR UPDATE USING (public.is_group_admin(group_id));
CREATE POLICY "Plans deletable by group admins" ON public.plans FOR DELETE USING (public.is_group_admin(group_id));

-- Itinerary Items
CREATE POLICY "Itinerary items viewable by group members" ON public.itinerary_items FOR SELECT USING (public.is_plan_member(plan_id));
CREATE POLICY "Itinerary items insertable by group members" ON public.itinerary_items FOR INSERT WITH CHECK (public.is_plan_member(plan_id));
CREATE POLICY "Itinerary items updatable by group members" ON public.itinerary_items FOR UPDATE USING (public.is_plan_member(plan_id));
CREATE POLICY "Itinerary items deletable by group members" ON public.itinerary_items FOR DELETE USING (public.is_plan_member(plan_id));

-- Member Votes
CREATE POLICY "Member votes viewable by group members" ON public.member_votes FOR SELECT USING (public.is_plan_member(plan_id));
CREATE POLICY "Users can vote if in group" ON public.member_votes FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_plan_member(plan_id));
CREATE POLICY "Users can update own vote" ON public.member_votes FOR UPDATE USING (auth.uid() = user_id AND public.is_plan_member(plan_id));
CREATE POLICY "Users can delete own vote" ON public.member_votes FOR DELETE USING (auth.uid() = user_id AND public.is_plan_member(plan_id));

-- Plan Expenses
CREATE POLICY "Plan expenses viewable by group members" ON public.plan_expenses FOR SELECT USING (public.is_plan_member(plan_id));
CREATE POLICY "Plan expenses insertable by group members" ON public.plan_expenses FOR INSERT WITH CHECK (public.is_plan_member(plan_id));
CREATE POLICY "Plan expenses updatable by group members" ON public.plan_expenses FOR UPDATE USING (public.is_plan_member(plan_id));
CREATE POLICY "Plan expenses deletable by group members" ON public.plan_expenses FOR DELETE USING (public.is_plan_member(plan_id));

-- Trip Memories
CREATE POLICY "Trip memories viewable by group members" ON public.trip_memories FOR SELECT USING (public.is_plan_member(plan_id));
CREATE POLICY "Users can insert memories if in group" ON public.trip_memories FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_plan_member(plan_id));
CREATE POLICY "Users can update own memory" ON public.trip_memories FOR UPDATE USING (auth.uid() = user_id AND public.is_plan_member(plan_id));
CREATE POLICY "Users can delete own memory" ON public.trip_memories FOR DELETE USING (auth.uid() = user_id AND public.is_plan_member(plan_id));
