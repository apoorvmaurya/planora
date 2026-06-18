-- Add cover_image_url column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_image_url text;

-- Setup Storage for profile-covers
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-covers', 'profile-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for profile-covers
CREATE POLICY "Profile covers accessible to anyone" ON storage.objects FOR SELECT USING (bucket_id = 'profile-covers');

CREATE POLICY "Profile covers uploadable by authenticated users" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'profile-covers' AND auth.role() = 'authenticated'
);

CREATE POLICY "Profile covers deletable by owner" ON storage.objects FOR DELETE USING (
  bucket_id = 'profile-covers' AND auth.uid() = owner
);

CREATE POLICY "Profile covers updatable by owner" ON storage.objects FOR UPDATE USING (
  bucket_id = 'profile-covers' AND auth.uid() = owner
);
