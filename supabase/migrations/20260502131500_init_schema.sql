-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

-- 1. profiles
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  username text UNIQUE,
  avatar_url text,
  bio text,
  city text,
  country text,
  latitude float8,
  longitude float8,
  timezone text,
  travel_preferences jsonb,
  push_subscription jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. friendships
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);

-- 3. groups
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  cover_image_url text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. group_members
CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE (group_id, user_id)
);

-- 5. plans
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  destination_name text,
  destination_lat float8,
  destination_lng float8,
  start_date date,
  end_date date,
  status text CHECK (status IN ('draft', 'confirmed', 'completed', 'cancelled')) DEFAULT 'draft',
  budget_total numeric,
  currency text DEFAULT 'INR',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. itinerary_items
CREATE TABLE public.itinerary_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id uuid REFERENCES public.plans(id) ON DELETE CASCADE,
  day_number int,
  time_of_day text,
  title text NOT NULL,
  description text,
  location_name text,
  lat float8,
  lng float8,
  category text,
  duration_minutes int,
  estimated_cost numeric,
  sort_order int,
  created_at timestamptz DEFAULT now()
);

-- 7. member_votes
CREATE TABLE public.member_votes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id uuid REFERENCES public.plans(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.itinerary_items(id) ON DELETE CASCADE,
  vote text CHECK (vote IN ('up', 'down')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (item_id, user_id)
);

-- 8. plan_expenses
CREATE TABLE public.plan_expenses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id uuid REFERENCES public.plans(id) ON DELETE CASCADE,
  paid_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  amount numeric NOT NULL,
  split_type text CHECK (split_type IN ('equal', 'custom')),
  split_details jsonb,
  created_at timestamptz DEFAULT now()
);

-- 9. push_subscriptions
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  subscription jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 10. notification_log
CREATE TABLE public.notification_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id uuid REFERENCES public.plans(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text,
  message text,
  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz
);

-- 11. ai_conversations
CREATE TABLE public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.plans(id) ON DELETE CASCADE,
  messages jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.ai_conversations ALTER COLUMN plan_id DROP NOT NULL;

-- 12. trip_memories
CREATE TABLE public.trip_memories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id uuid REFERENCES public.plans(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text,
  created_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Enable Row Level Security (RLS)
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_memories ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- RLS Policies
-- -----------------------------------------------------------------------------

-- Profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Friendships
CREATE POLICY "Users can view own friendships" ON public.friendships FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Users can insert friendships" ON public.friendships FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update own friendships" ON public.friendships FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Users can delete own friendships" ON public.friendships FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Groups
CREATE POLICY "Groups viewable by members" ON public.groups FOR SELECT 
  USING (id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()));

CREATE POLICY "Groups insertable by authenticated users" ON public.groups FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Groups updatable by admins" ON public.groups FOR UPDATE 
  USING (id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Groups deletable by admins" ON public.groups FOR DELETE 
  USING (id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin'));

-- Group Members
CREATE POLICY "Group members viewable by members" ON public.group_members FOR SELECT 
  USING (group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()));

CREATE POLICY "Group members insertable by self or admin" ON public.group_members FOR INSERT WITH CHECK (
  auth.uid() = user_id OR group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Group members updatable by admins" ON public.group_members FOR UPDATE 
  USING (group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Group members deletable by self or admin" ON public.group_members FOR DELETE 
  USING (auth.uid() = user_id OR group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin'));

-- Plans
CREATE POLICY "Plans viewable by group members" ON public.plans FOR SELECT 
  USING (group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()));

CREATE POLICY "Plans insertable by group admins" ON public.plans FOR INSERT WITH CHECK (
  group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Plans updatable by group admins" ON public.plans FOR UPDATE 
  USING (group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Plans deletable by group admins" ON public.plans FOR DELETE 
  USING (group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin'));

-- Itinerary Items
CREATE POLICY "Itinerary items viewable by group members" ON public.itinerary_items FOR SELECT USING (
  plan_id IN (SELECT id FROM public.plans WHERE group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
);

CREATE POLICY "Itinerary items insertable by group members" ON public.itinerary_items FOR INSERT WITH CHECK (
  plan_id IN (SELECT id FROM public.plans WHERE group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
);

CREATE POLICY "Itinerary items updatable by group members" ON public.itinerary_items FOR UPDATE USING (
  plan_id IN (SELECT id FROM public.plans WHERE group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
);

CREATE POLICY "Itinerary items deletable by group members" ON public.itinerary_items FOR DELETE USING (
  plan_id IN (SELECT id FROM public.plans WHERE group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
);

-- Member Votes
CREATE POLICY "Member votes viewable by group members" ON public.member_votes FOR SELECT USING (
  plan_id IN (SELECT id FROM public.plans WHERE group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
);

CREATE POLICY "Users can vote if in group" ON public.member_votes FOR INSERT WITH CHECK (
  auth.uid() = user_id AND plan_id IN (SELECT id FROM public.plans WHERE group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
);

CREATE POLICY "Users can update own vote" ON public.member_votes FOR UPDATE USING (
  auth.uid() = user_id AND plan_id IN (SELECT id FROM public.plans WHERE group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
);

CREATE POLICY "Users can delete own vote" ON public.member_votes FOR DELETE USING (
  auth.uid() = user_id AND plan_id IN (SELECT id FROM public.plans WHERE group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
);

-- Plan Expenses
CREATE POLICY "Plan expenses viewable by group members" ON public.plan_expenses FOR SELECT USING (
  plan_id IN (SELECT id FROM public.plans WHERE group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
);

CREATE POLICY "Plan expenses insertable by group members" ON public.plan_expenses FOR INSERT WITH CHECK (
  plan_id IN (SELECT id FROM public.plans WHERE group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
);

CREATE POLICY "Plan expenses updatable by group members" ON public.plan_expenses FOR UPDATE USING (
  plan_id IN (SELECT id FROM public.plans WHERE group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
);

CREATE POLICY "Plan expenses deletable by group members" ON public.plan_expenses FOR DELETE USING (
  plan_id IN (SELECT id FROM public.plans WHERE group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
);

-- Trip Memories
CREATE POLICY "Trip memories viewable by group members" ON public.trip_memories FOR SELECT USING (
  plan_id IN (SELECT id FROM public.plans WHERE group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
);

CREATE POLICY "Users can insert memories if in group" ON public.trip_memories FOR INSERT WITH CHECK (
  auth.uid() = user_id AND plan_id IN (SELECT id FROM public.plans WHERE group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
);

CREATE POLICY "Users can update own memory" ON public.trip_memories FOR UPDATE USING (
  auth.uid() = user_id AND plan_id IN (SELECT id FROM public.plans WHERE group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
);

CREATE POLICY "Users can delete own memory" ON public.trip_memories FOR DELETE USING (
  auth.uid() = user_id AND plan_id IN (SELECT id FROM public.plans WHERE group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
);

-- Notification Log
CREATE POLICY "Notification logs viewable by recipient" ON public.notification_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notification_log FOR UPDATE USING (auth.uid() = user_id);

-- Push Subscriptions
CREATE POLICY "Push subscriptions viewable by owner" ON public.push_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Push subscriptions modifiable by owner" ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- AI Conversations
CREATE POLICY "AI conversations viewable by owner" ON public.ai_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert AI conversations" ON public.ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update AI conversations" ON public.ai_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete AI conversations" ON public.ai_conversations FOR DELETE USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

-- Auto-insert into profiles on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, created_at, updated_at)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    now(),
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
