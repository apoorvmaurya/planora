-- Create plan activity logs table
CREATE TABLE public.plan_activity_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id uuid REFERENCES public.plans(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  activity_type text NOT NULL,
  description text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plan_activity_logs ENABLE ROW LEVEL SECURITY;

-- Select policy: users can select logs of plans they have access to
CREATE POLICY "Users can select plan activity logs" ON public.plan_activity_logs FOR SELECT
  USING (
    plan_id IN (
      SELECT id FROM public.plans 
      WHERE created_by = auth.uid() 
      OR group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
    )
  );

-- Trigger function to automatically log changes to itinerary_items
CREATE OR REPLACE FUNCTION public.log_itinerary_item_change()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id uuid;
  user_name text;
  description_text text;
  plan_id_val uuid;
BEGIN
  -- Get user ID
  current_user_id := auth.uid();
  
  -- If user ID is null, we check if it is system/AI
  IF current_user_id IS NOT NULL THEN
    SELECT full_name INTO user_name FROM public.profiles WHERE id = current_user_id;
  ELSE
    user_name := 'Planora AI';
  END IF;

  IF TG_OP = 'INSERT' THEN
    plan_id_val := NEW.plan_id;
    description_text := COALESCE(user_name, 'Someone') || ' added "' || NEW.title || '" to Day ' || NEW.day_number || ' (' || NEW.time_of_day || ')';
    
    INSERT INTO public.plan_activity_logs (plan_id, user_id, activity_type, description, payload)
    VALUES (plan_id_val, current_user_id, 'ADD_ITEM', description_text, jsonb_build_object('new_item', to_jsonb(NEW)));
    
  ELSIF TG_OP = 'UPDATE' THEN
    plan_id_val := NEW.plan_id;
    
    IF OLD.title <> NEW.title THEN
      description_text := COALESCE(user_name, 'Someone') || ' renamed "' || OLD.title || '" to "' || NEW.title || '"';
    ELSIF OLD.time_of_day <> NEW.time_of_day OR OLD.day_number <> NEW.day_number THEN
      description_text := COALESCE(user_name, 'Someone') || ' moved "' || NEW.title || '" to Day ' || NEW.day_number || ' (' || NEW.time_of_day || ')';
    ELSE
      description_text := COALESCE(user_name, 'Someone') || ' updated "' || NEW.title || '"';
    END IF;

    INSERT INTO public.plan_activity_logs (plan_id, user_id, activity_type, description, payload)
    VALUES (plan_id_val, current_user_id, 'UPDATE_ITEM', description_text, jsonb_build_object('old_item', to_jsonb(OLD), 'new_item', to_jsonb(NEW)));

  ELSIF TG_OP = 'DELETE' THEN
    plan_id_val := OLD.plan_id;
    description_text := COALESCE(user_name, 'Someone') || ' deleted "' || OLD.title || '" from Day ' || OLD.day_number || ' (' || OLD.time_of_day || ')';

    INSERT INTO public.plan_activity_logs (plan_id, user_id, activity_type, description, payload)
    VALUES (plan_id_val, current_user_id, 'DELETE_ITEM', description_text, jsonb_build_object('deleted_item', to_jsonb(OLD)));
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER itinerary_item_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.itinerary_items
FOR EACH ROW EXECUTE FUNCTION public.log_itinerary_item_change();

-- Enable Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.plan_activity_logs;
