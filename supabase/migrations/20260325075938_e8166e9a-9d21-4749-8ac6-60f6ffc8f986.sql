
-- Tighten DM participants policy: only allow adding participants to conversations you're part of
DROP POLICY IF EXISTS "Users can add DM participants" ON public.dm_participants;
CREATE POLICY "Users can add DM participants"
  ON public.dm_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dm_participants dp
      WHERE dp.conversation_id = dm_participants.conversation_id
        AND dp.user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );
