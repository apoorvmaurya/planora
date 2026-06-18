-- Add columns for suggestions to itinerary_items
ALTER TABLE public.itinerary_items ADD COLUMN IF NOT EXISTS suggestion_status text CHECK (suggestion_status IN ('approved', 'suggestion', 'rejected')) DEFAULT 'approved';
ALTER TABLE public.itinerary_items ADD COLUMN IF NOT EXISTS parent_item_id uuid REFERENCES public.itinerary_items(id) ON DELETE CASCADE;
ALTER TABLE public.itinerary_items ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.itinerary_items ADD COLUMN IF NOT EXISTS is_delete_suggestion boolean DEFAULT false;

-- Create index on parent_item_id for query performance
CREATE INDEX IF NOT EXISTS itinerary_items_parent_item_id_idx ON public.itinerary_items(parent_item_id);
CREATE INDEX IF NOT EXISTS itinerary_items_created_by_idx ON public.itinerary_items(created_by);

-- Helper to check if a user is an admin of a plan
CREATE OR REPLACE FUNCTION public.is_plan_admin(check_plan_id uuid)
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
        AND gm.role = 'admin'
      )
    )
  );
$$;

-- Drop existing RLS policies on itinerary_items
DROP POLICY IF EXISTS "Itinerary items viewable by group members" ON public.itinerary_items;
DROP POLICY IF EXISTS "Itinerary items insertable by group members" ON public.itinerary_items;
DROP POLICY IF EXISTS "Itinerary items updatable by group members" ON public.itinerary_items;
DROP POLICY IF EXISTS "Itinerary items deletable by group members" ON public.itinerary_items;

-- Re-create itinerary items policies
-- 1. Anyone in the plan can view items
CREATE POLICY "Itinerary items viewable by group members" ON public.itinerary_items FOR SELECT USING (
  public.is_plan_member(plan_id)
);

-- 2. Insert: Admins can insert approved, members can only insert as 'suggestion' with their own created_by
CREATE POLICY "Itinerary items insertable by group members" ON public.itinerary_items FOR INSERT WITH CHECK (
  public.is_plan_member(plan_id) AND (
    public.is_plan_admin(plan_id) OR (
      suggestion_status = 'suggestion' AND created_by = auth.uid()
    )
  )
);

-- 3. Update: Admins can update all. Members can only update their own suggestions.
CREATE POLICY "Itinerary items updatable by group members" ON public.itinerary_items FOR UPDATE USING (
  public.is_plan_member(plan_id) AND (
    public.is_plan_admin(plan_id) OR (
      suggestion_status = 'suggestion' AND created_by = auth.uid()
    )
  )
);

-- 4. Delete: Admins can delete all. Members can only delete their own suggestions.
CREATE POLICY "Itinerary items deletable by group members" ON public.itinerary_items FOR DELETE USING (
  public.is_plan_member(plan_id) AND (
    public.is_plan_admin(plan_id) OR (
      suggestion_status = 'suggestion' AND created_by = auth.uid()
    )
  )
);

-- BEFORE UPDATE trigger to clear parent_item_id on promotion
CREATE OR REPLACE FUNCTION public.handle_itinerary_item_promotion_before()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.suggestion_status = 'approved' AND OLD.suggestion_status = 'suggestion' THEN
    -- Clear parent relations so it becomes an official primary item
    NEW.parent_item_id := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER itinerary_item_promotion_before_trigger
BEFORE UPDATE ON public.itinerary_items
FOR EACH ROW EXECUTE FUNCTION public.handle_itinerary_item_promotion_before();

-- Merge suggestion logging, parent deletion, and vote cleanup into log_itinerary_item_change
CREATE OR REPLACE FUNCTION public.log_itinerary_item_change()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id uuid;
  user_name text;
  description_text text;
  plan_id_val uuid;
  parent_title text;
  parent_json jsonb;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NOT NULL THEN
    SELECT full_name INTO user_name FROM public.profiles WHERE id = current_user_id;
  ELSE
    user_name := 'Planora AI';
  END IF;

  IF TG_OP = 'INSERT' THEN
    plan_id_val := NEW.plan_id;
    
    IF NEW.suggestion_status = 'suggestion' THEN
      IF NEW.parent_item_id IS NOT NULL THEN
        SELECT title INTO parent_title FROM public.itinerary_items WHERE id = NEW.parent_item_id;
        description_text := COALESCE(user_name, 'Someone') || ' proposed an alternative to "' || COALESCE(parent_title, 'an activity') || '": "' || NEW.title || '"';
      ELSIF NEW.is_delete_suggestion THEN
        SELECT title INTO parent_title FROM public.itinerary_items WHERE id = NEW.parent_item_id;
        description_text := COALESCE(user_name, 'Someone') || ' proposed deleting "' || COALESCE(parent_title, 'an activity') || '"';
      ELSE
        description_text := COALESCE(user_name, 'Someone') || ' proposed adding "' || NEW.title || '" to Day ' || NEW.day_number || ' (' || NEW.time_of_day || ')';
      END IF;
      
      INSERT INTO public.plan_activity_logs (plan_id, user_id, activity_type, description, payload)
      VALUES (plan_id_val, current_user_id, 'PROPOSE_ITEM', description_text, jsonb_build_object('new_item', to_jsonb(NEW)));
    ELSE
      description_text := COALESCE(user_name, 'Someone') || ' added "' || NEW.title || '" to Day ' || NEW.day_number || ' (' || NEW.time_of_day || ')';
      
      INSERT INTO public.plan_activity_logs (plan_id, user_id, activity_type, description, payload)
      VALUES (plan_id_val, current_user_id, 'ADD_ITEM', description_text, jsonb_build_object('new_item', to_jsonb(NEW)));
    END IF;
    
  ELSIF TG_OP = 'UPDATE' THEN
    plan_id_val := NEW.plan_id;
    
    -- Consensus or manual approval promotion
    IF OLD.suggestion_status = 'suggestion' AND NEW.suggestion_status = 'approved' THEN
      -- If it is a delete suggestion
      IF OLD.is_delete_suggestion THEN
        IF OLD.parent_item_id IS NOT NULL THEN
          SELECT to_jsonb(p) INTO parent_json FROM public.itinerary_items p WHERE p.id = OLD.parent_item_id;
          
          -- Delete the parent item
          DELETE FROM public.itinerary_items WHERE id = OLD.parent_item_id;
          
          description_text := '"' || (parent_json->>'title') || '" was deleted by group consensus';
          
          INSERT INTO public.plan_activity_logs (plan_id, user_id, activity_type, description, payload)
          VALUES (plan_id_val, current_user_id, 'DELETE_ITEM', description_text, jsonb_build_object('deleted_item', parent_json));
        END IF;
        
        -- Delete the suggestion itself (since it was a delete suggestion, it shouldn't remain)
        DELETE FROM public.itinerary_items WHERE id = NEW.id;
        
      ELSE
        -- Normal suggestion promotion
        IF OLD.parent_item_id IS NOT NULL THEN
          SELECT to_jsonb(p) INTO parent_json FROM public.itinerary_items p WHERE p.id = OLD.parent_item_id;
          
          -- Delete parent item
          DELETE FROM public.itinerary_items WHERE id = OLD.parent_item_id;
          
          description_text := '"' || NEW.title || '" was promoted to replace "' || (parent_json->>'title') || '" by group consensus';
        ELSE
          description_text := '"' || NEW.title || '" was promoted to the official itinerary by group consensus';
        END IF;
        
        INSERT INTO public.plan_activity_logs (plan_id, user_id, activity_type, description, payload)
        VALUES (
          plan_id_val, 
          current_user_id, 
          'PROMOTE_ITEM', 
          description_text, 
          jsonb_build_object('promoted_item', to_jsonb(NEW), 'old_parent_item', parent_json)
        );
        
        -- Reset votes
        DELETE FROM public.member_votes WHERE item_id = NEW.id;
      END IF;
      
    ELSE
      -- Standard updates
      IF OLD.title <> NEW.title THEN
        description_text := COALESCE(user_name, 'Someone') || ' renamed "' || OLD.title || '" to "' || NEW.title || '"';
      ELSIF OLD.time_of_day <> NEW.time_of_day OR OLD.day_number <> NEW.day_number THEN
        description_text := COALESCE(user_name, 'Someone') || ' moved "' || NEW.title || '" to Day ' || NEW.day_number || ' (' || NEW.time_of_day || ')';
      ELSE
        description_text := COALESCE(user_name, 'Someone') || ' updated "' || NEW.title || '"';
      END IF;

      INSERT INTO public.plan_activity_logs (plan_id, user_id, activity_type, description, payload)
      VALUES (plan_id_val, current_user_id, 'UPDATE_ITEM', description_text, jsonb_build_object('old_item', to_jsonb(OLD), 'new_item', to_jsonb(NEW)));
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    plan_id_val := OLD.plan_id;
    
    -- If deleting a suggestion, log differently
    IF OLD.suggestion_status = 'suggestion' THEN
      description_text := COALESCE(user_name, 'Someone') || ' removed suggestion for "' || OLD.title || '"';
      INSERT INTO public.plan_activity_logs (plan_id, user_id, activity_type, description, payload)
      VALUES (plan_id_val, current_user_id, 'DELETE_SUGGESTION', description_text, jsonb_build_object('deleted_suggestion', to_jsonb(OLD)));
    ELSE
      description_text := COALESCE(user_name, 'Someone') || ' deleted "' || OLD.title || '" from Day ' || OLD.day_number || ' (' || OLD.time_of_day || ')';
      INSERT INTO public.plan_activity_logs (plan_id, user_id, activity_type, description, payload)
      VALUES (plan_id_val, current_user_id, 'DELETE_ITEM', description_text, jsonb_build_object('deleted_item', to_jsonb(OLD)));
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Consensus voting trigger
CREATE OR REPLACE FUNCTION public.check_consensus_promotion()
RETURNS TRIGGER AS $$
DECLARE
  v_item_id uuid;
  v_plan_id uuid;
  v_group_id uuid;
  v_member_count int;
  v_upvotes int;
  v_status text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_item_id := OLD.item_id;
    v_plan_id := OLD.plan_id;
  ELSE
    v_item_id := NEW.item_id;
    v_plan_id := NEW.plan_id;
  END IF;

  -- Get item status
  SELECT suggestion_status INTO v_status FROM public.itinerary_items WHERE id = v_item_id;
  
  -- Only promote if it's currently a suggestion
  IF v_status = 'suggestion' THEN
    -- Get plan's group_id
    SELECT group_id INTO v_group_id FROM public.plans WHERE id = v_plan_id;
    
    -- If there's a group, count members. Otherwise solo plan (1 member).
    IF v_group_id IS NOT NULL THEN
      SELECT count(*) INTO v_member_count FROM public.group_members WHERE group_id = v_group_id;
    ELSE
      v_member_count := 1;
    END IF;

    -- Count active upvotes
    SELECT count(*) INTO v_upvotes FROM public.member_votes WHERE item_id = v_item_id AND vote = 'up';

    -- If upvotes exceed strict majority
    IF v_upvotes > (v_member_count / 2.0) THEN
      UPDATE public.itinerary_items 
      SET suggestion_status = 'approved' 
      WHERE id = v_item_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS member_vote_change_trigger ON public.member_votes;
CREATE TRIGGER member_vote_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.member_votes
FOR EACH ROW EXECUTE FUNCTION public.check_consensus_promotion();

-- Creator auto-upvote trigger
CREATE OR REPLACE FUNCTION public.auto_upvote_creator_suggestion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.suggestion_status = 'suggestion' AND NEW.created_by IS NOT NULL THEN
    INSERT INTO public.member_votes (plan_id, user_id, item_id, vote)
    VALUES (NEW.plan_id, NEW.created_by, NEW.id, 'up')
    ON CONFLICT (item_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS itinerary_item_auto_upvote_trigger ON public.itinerary_items;
CREATE TRIGGER itinerary_item_auto_upvote_trigger
AFTER INSERT ON public.itinerary_items
FOR EACH ROW EXECUTE FUNCTION public.auto_upvote_creator_suggestion();
