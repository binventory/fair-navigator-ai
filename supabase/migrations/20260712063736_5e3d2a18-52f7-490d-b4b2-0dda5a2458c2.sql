-- Tighten the shared helper: a fair is public only when published AND has a slug.
CREATE OR REPLACE FUNCTION public.fair_is_published(_fair_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.fairs
    WHERE id = _fair_id
      AND status = 'published'
      AND public_slug IS NOT NULL
  );
$$;

-- Tighten the direct anon policy on fairs to match.
DROP POLICY IF EXISTS "public reads published fairs" ON public.fairs;
CREATE POLICY "public reads published fairs"
  ON public.fairs
  FOR SELECT
  TO anon
  USING (status = 'published' AND public_slug IS NOT NULL);
