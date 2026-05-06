-- Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA public;

-- 1. Create plan_notification_preferences table
CREATE TABLE public.plan_notification_preferences (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id uuid REFERENCES public.plans(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  opt_out_t30 boolean DEFAULT false,
  opt_out_t7 boolean DEFAULT false,
  opt_out_t24 boolean DEFAULT false,
  opt_out_t0 boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (plan_id, user_id)
);

ALTER TABLE public.plan_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Preferences viewable by self" ON public.plan_notification_preferences FOR SELECT USING (
  auth.uid() = user_id
);

CREATE POLICY "Preferences insertable by self" ON public.plan_notification_preferences FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Preferences updatable by self" ON public.plan_notification_preferences FOR UPDATE USING (
  auth.uid() = user_id
);

-- 2. Schedule Momentum Engine Edge Function
-- NOTE: You must update the URL and Authorization header with your actual deployed Edge Function URL and Service Role Key!
-- This job runs every day at 08:00 IST (02:30 UTC)
SELECT cron.schedule(
  'momentum-engine-daily',
  '30 2 * * *',
  $$
    SELECT net.http_post(
        url:='https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/momentum-engine',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer <YOUR_SERVICE_ROLE_KEY>"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
