-- Add invite_code column to groups table
ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS invite_code text UNIQUE DEFAULT substring(md5(random()::text) from 1 for 8);
