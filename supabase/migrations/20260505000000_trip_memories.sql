-- Add recap and sharing columns to plans
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS recap_text text,
ADD COLUMN IF NOT EXISTS share_token uuid DEFAULT gen_random_uuid();

-- Create memory likes table
CREATE TABLE public.memory_likes (
  memory_id uuid REFERENCES public.trip_memories(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (memory_id, user_id)
);

ALTER TABLE public.memory_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Memory likes viewable by plan members" ON public.memory_likes FOR SELECT USING (
  memory_id IN (
    SELECT id FROM public.trip_memories WHERE plan_id IN (
      SELECT id FROM public.plans WHERE group_id IN (
        SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Memory likes insertable by self" ON public.memory_likes FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Memory likes deletable by self" ON public.memory_likes FOR DELETE USING (
  auth.uid() = user_id
);

-- Ensure trip_memories table has proper policies
CREATE POLICY "Trip memories viewable by plan members" ON public.trip_memories FOR SELECT USING (
  plan_id IN (
    SELECT id FROM public.plans WHERE group_id IN (
      SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Trip memories insertable by plan members" ON public.trip_memories FOR INSERT WITH CHECK (
  auth.uid() = user_id AND plan_id IN (
    SELECT id FROM public.plans WHERE group_id IN (
      SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
    )
  )
);

-- Setup Storage for memories
INSERT INTO storage.buckets (id, name, public) 
VALUES ('memories', 'memories', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Memories accessible to anyone" ON storage.objects FOR SELECT USING (bucket_id = 'memories');
CREATE POLICY "Memories uploadable by authenticated users" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'memories' AND auth.role() = 'authenticated'
);
CREATE POLICY "Memories deletable by owner" ON storage.objects FOR DELETE USING (
  bucket_id = 'memories' AND auth.uid() = owner
);
