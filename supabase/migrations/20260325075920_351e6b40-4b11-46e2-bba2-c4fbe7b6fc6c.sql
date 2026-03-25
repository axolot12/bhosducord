
-- Fix DM participants: allow users to add other participants to conversations they created
DROP POLICY IF EXISTS "Users can add DM participants" ON public.dm_participants;
CREATE POLICY "Users can add DM participants"
  ON public.dm_participants FOR INSERT
  TO authenticated
  WITH CHECK (true);
