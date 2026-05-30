-- Create group_invitations table
CREATE TABLE IF NOT EXISTS public.group_invitations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  invitee_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE (group_id, invitee_id)
);

-- Enable RLS
ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Invitations viewable by invitee or group admin" ON public.group_invitations;
DROP POLICY IF EXISTS "Invitations insertable by group admin" ON public.group_invitations;
DROP POLICY IF EXISTS "Invitations updatable by invitee" ON public.group_invitations;
DROP POLICY IF EXISTS "Invitations deletable by invitee or group admin" ON public.group_invitations;

-- Create policies
CREATE POLICY "Invitations viewable by invitee or group admin" ON public.group_invitations
  FOR SELECT USING (auth.uid() = invitee_id OR public.is_group_admin(group_id));

CREATE POLICY "Invitations insertable by group admin" ON public.group_invitations
  FOR INSERT WITH CHECK (public.is_group_admin(group_id));

CREATE POLICY "Invitations updatable by invitee" ON public.group_invitations
  FOR UPDATE USING (auth.uid() = invitee_id) WITH CHECK (auth.uid() = invitee_id);

CREATE POLICY "Invitations deletable by invitee or group admin" ON public.group_invitations
  FOR DELETE USING (auth.uid() = invitee_id OR public.is_group_admin(group_id));
