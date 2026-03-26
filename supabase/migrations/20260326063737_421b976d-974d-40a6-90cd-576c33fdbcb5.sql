ALTER TABLE public.channels
ADD COLUMN IF NOT EXISTS category_position integer NOT NULL DEFAULT 0;

-- Ensure server bootstrap logic runs on new servers
DROP TRIGGER IF EXISTS trg_handle_new_server ON public.servers;
CREATE TRIGGER trg_handle_new_server
AFTER INSERT ON public.servers
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_server();

-- Keep member_count accurate in real time
DROP TRIGGER IF EXISTS trg_sync_server_member_count ON public.server_members;
CREATE TRIGGER trg_sync_server_member_count
AFTER INSERT OR DELETE ON public.server_members
FOR EACH ROW
EXECUTE FUNCTION public.sync_server_member_count();

-- Backfill owner membership for existing servers
INSERT INTO public.server_members (server_id, user_id)
SELECT s.id, s.owner_id
FROM public.servers s
LEFT JOIN public.server_members sm
  ON sm.server_id = s.id
 AND sm.user_id = s.owner_id
WHERE sm.id IS NULL
ON CONFLICT (server_id, user_id) DO NOTHING;

-- Backfill default channels for servers missing them
INSERT INTO public.channels (server_id, name, type, category, category_position, position)
SELECT s.id, 'general', 'text', 'Text Channels', 0, 0
FROM public.servers s
WHERE NOT EXISTS (
  SELECT 1 FROM public.channels c WHERE c.server_id = s.id AND c.type = 'text'
);

INSERT INTO public.channels (server_id, name, type, category, category_position, position)
SELECT s.id, 'General', 'voice', 'Voice Channels', 1, 0
FROM public.servers s
WHERE NOT EXISTS (
  SELECT 1 FROM public.channels c WHERE c.server_id = s.id AND c.type = 'voice'
);

-- Normalize existing category ordering per server
WITH category_order AS (
  SELECT
    c.server_id,
    c.category,
    dense_rank() OVER (
      PARTITION BY c.server_id
      ORDER BY MIN(c.created_at), c.category
    ) - 1 AS category_pos
  FROM public.channels c
  GROUP BY c.server_id, c.category
)
UPDATE public.channels c
SET category_position = co.category_pos
FROM category_order co
WHERE c.server_id = co.server_id
  AND c.category = co.category;

-- Recompute member_count for all servers
UPDATE public.servers s
SET member_count = COALESCE(mc.total_members, 0),
    updated_at = now()
FROM (
  SELECT server_id, COUNT(*)::integer AS total_members
  FROM public.server_members
  GROUP BY server_id
) mc
WHERE s.id = mc.server_id;

UPDATE public.servers s
SET member_count = 0,
    updated_at = now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.server_members sm WHERE sm.server_id = s.id
);