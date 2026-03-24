
-- Fix overly permissive DM conversation insert policy
DROP POLICY "Users can create DM conversations" ON public.dm_conversations;
CREATE POLICY "Users can create DM conversations" ON public.dm_conversations FOR INSERT TO authenticated
  WITH CHECK (id IN (SELECT conversation_id FROM public.dm_participants WHERE user_id = auth.uid()) OR NOT EXISTS (SELECT 1 FROM public.dm_participants WHERE conversation_id = id));

-- Fix overly permissive DM participants insert policy
DROP POLICY "Users can add DM participants" ON public.dm_participants;
CREATE POLICY "Users can add DM participants" ON public.dm_participants FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
