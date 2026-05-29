-- 1. Add user_id column to itinerary_items table
ALTER TABLE public.itinerary_items ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Create index on user_id for faster querying
CREATE INDEX IF NOT EXISTS itinerary_items_user_id_idx ON public.itinerary_items(user_id);

-- 3. Hardening RLS policies to restrict personal/exclusive itinerary transits
DROP POLICY IF EXISTS "Itinerary items viewable by group members" ON public.itinerary_items;
CREATE POLICY "Itinerary items viewable by group members" ON public.itinerary_items FOR SELECT USING (
  public.is_plan_member(plan_id) AND (user_id IS NULL OR user_id = auth.uid())
);

DROP POLICY IF EXISTS "Itinerary items updatable by group members" ON public.itinerary_items;
CREATE POLICY "Itinerary items updatable by group members" ON public.itinerary_items FOR UPDATE USING (
  public.is_plan_member(plan_id) AND (user_id IS NULL OR user_id = auth.uid())
);

DROP POLICY IF EXISTS "Itinerary items deletable by group members" ON public.itinerary_items;
CREATE POLICY "Itinerary items deletable by group members" ON public.itinerary_items FOR DELETE USING (
  public.is_plan_member(plan_id) AND (user_id IS NULL OR user_id = auth.uid())
);
