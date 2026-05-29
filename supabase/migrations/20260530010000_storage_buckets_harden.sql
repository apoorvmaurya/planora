-- Setup Storage for group-covers (with dash)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('group-covers', 'group-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for group-covers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Group-covers accessible to anyone') THEN
    CREATE POLICY "Group-covers accessible to anyone" ON storage.objects FOR SELECT USING (bucket_id = 'group-covers');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Group-covers uploadable by authenticated users') THEN
    CREATE POLICY "Group-covers uploadable by authenticated users" ON storage.objects FOR INSERT WITH CHECK (
      bucket_id = 'group-covers' AND auth.role() = 'authenticated'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Group-covers deletable by owner') THEN
    CREATE POLICY "Group-covers deletable by owner" ON storage.objects FOR DELETE USING (
      bucket_id = 'group-covers' AND auth.uid() = owner
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Group-covers updatable by owner') THEN
    CREATE POLICY "Group-covers updatable by owner" ON storage.objects FOR UPDATE USING (
      bucket_id = 'group-covers' AND auth.uid() = owner
    );
  END IF;

  -- Add UPDATE policy for memories if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Memories updatable by owner') THEN
    CREATE POLICY "Memories updatable by owner" ON storage.objects FOR UPDATE USING (
      bucket_id = 'memories' AND auth.uid() = owner
    );
  END IF;
END
$$;
