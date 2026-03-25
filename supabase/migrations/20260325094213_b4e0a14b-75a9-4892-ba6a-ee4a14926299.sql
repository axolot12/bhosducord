CREATE OR REPLACE FUNCTION public.start_dm_conversation(_target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _conversation_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF _target_user_id IS NULL OR _target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Invalid target user' USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = _target_user_id
  ) THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0001';
  END IF;

  SELECT dc.id
  INTO _conversation_id
  FROM public.dm_conversations dc
  JOIN public.dm_participants me
    ON me.conversation_id = dc.id
   AND me.user_id = auth.uid()
  JOIN public.dm_participants them
    ON them.conversation_id = dc.id
   AND them.user_id = _target_user_id
  WHERE dc.is_group = false
    AND (
      SELECT COUNT(*)
      FROM public.dm_participants dp
      WHERE dp.conversation_id = dc.id
    ) = 2
  ORDER BY dc.created_at
  LIMIT 1;

  IF _conversation_id IS NOT NULL THEN
    RETURN _conversation_id;
  END IF;

  INSERT INTO public.dm_conversations (is_group)
  VALUES (false)
  RETURNING id INTO _conversation_id;

  INSERT INTO public.dm_participants (conversation_id, user_id)
  VALUES (_conversation_id, auth.uid());

  INSERT INTO public.dm_participants (conversation_id, user_id)
  VALUES (_conversation_id, _target_user_id);

  RETURN _conversation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_dm_conversation(uuid) TO authenticated;