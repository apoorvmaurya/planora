-- Update log_itinerary_item_change to prevent foreign key errors on cascade delete
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
  -- Identify plan ID first to check if the plan still exists
  IF TG_OP = 'DELETE' THEN
    plan_id_val := OLD.plan_id;
  ELSE
    plan_id_val := NEW.plan_id;
  END IF;

  -- Exit early if the plan itself is being deleted to avoid foreign key violations on cascade
  IF NOT EXISTS (SELECT 1 FROM public.plans WHERE id = plan_id_val) THEN
    RETURN NULL;
  END IF;

  current_user_id := auth.uid();
  
  IF current_user_id IS NOT NULL THEN
    SELECT full_name INTO user_name FROM public.profiles WHERE id = current_user_id;
  ELSE
    user_name := 'Planora AI';
  END IF;

  IF TG_OP = 'INSERT' THEN
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
