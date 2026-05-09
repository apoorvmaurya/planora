-- Setup Storage for avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatars accessible to anyone" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Avatars uploadable by authenticated users" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND auth.role() = 'authenticated'
);

CREATE POLICY "Avatars deletable by owner" ON storage.objects FOR DELETE USING (
  bucket_id = 'avatars' AND auth.uid() = owner
);

CREATE POLICY "Avatars updatable by owner" ON storage.objects FOR UPDATE USING (
  bucket_id = 'avatars' AND auth.uid() = owner
);

-- Setup Storage for group covers
INSERT INTO storage.buckets (id, name, public) 
VALUES ('group_covers', 'group_covers', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Group covers accessible to anyone" ON storage.objects FOR SELECT USING (bucket_id = 'group_covers');

CREATE POLICY "Group covers uploadable by authenticated users" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'group_covers' AND auth.role() = 'authenticated'
);

CREATE POLICY "Group covers deletable by owner" ON storage.objects FOR DELETE USING (
  bucket_id = 'group_covers' AND auth.uid() = owner
);

CREATE POLICY "Group covers updatable by owner" ON storage.objects FOR UPDATE USING (
  bucket_id = 'group_covers' AND auth.uid() = owner
);
