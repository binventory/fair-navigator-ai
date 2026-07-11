
-- Phase 3: add optional exhibitor link to schedule items
ALTER TABLE public.schedule_items
  ADD COLUMN IF NOT EXISTS exhibitor_id uuid REFERENCES public.exhibitors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS schedule_items_exhibitor_id_idx ON public.schedule_items(exhibitor_id);
CREATE INDEX IF NOT EXISTS schedule_items_fair_starts_idx ON public.schedule_items(fair_id, starts_at);

-- Ensure one map asset per fair (upsert semantics)
CREATE UNIQUE INDEX IF NOT EXISTS map_assets_fair_id_uidx ON public.map_assets(fair_id);

-- Storage RLS on fair-maps bucket.
-- Path convention: {org_id}/{fair_id}/{filename}
-- Managers of the org can read/write; visitors get signed URLs via a server fn.

CREATE POLICY "managers read own-org fair-maps"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'fair-maps'
  AND public.is_org_member((storage.foldername(name))[1]::uuid, auth.uid())
);

CREATE POLICY "managers insert own-org fair-maps"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'fair-maps'
  AND public.is_org_member((storage.foldername(name))[1]::uuid, auth.uid())
);

CREATE POLICY "managers update own-org fair-maps"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'fair-maps'
  AND public.is_org_member((storage.foldername(name))[1]::uuid, auth.uid())
)
WITH CHECK (
  bucket_id = 'fair-maps'
  AND public.is_org_member((storage.foldername(name))[1]::uuid, auth.uid())
);

CREATE POLICY "managers delete own-org fair-maps"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'fair-maps'
  AND public.is_org_member((storage.foldername(name))[1]::uuid, auth.uid())
);
