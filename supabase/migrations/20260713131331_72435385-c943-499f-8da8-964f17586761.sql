
-- 1. Data cleanup
UPDATE public.exhibitors SET website = NULL
  WHERE website IS NOT NULL AND website !~* '^https?://';
UPDATE public.exhibitors SET logo_url = NULL
  WHERE logo_url IS NOT NULL AND logo_url !~* '^https?://';

-- 2. New helpers (auth.uid() bound internally)
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.org_members
                 WHERE org_id = _org_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_org_id uuid, _roles public.org_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.org_members
                 WHERE org_id = _org_id AND user_id = auth.uid() AND role = ANY(_roles));
$$;

GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, public.org_role[]) TO authenticated;

COMMENT ON FUNCTION public.is_org_member(uuid) IS
  'SECURITY DEFINER helper used by RLS policies to check org membership of the current user. Must remain EXECUTE-able by authenticated — every RLS policy references it and Postgres evaluates predicates as the calling role. Reads auth.uid() internally so a caller cannot probe another user. Do NOT switch to SECURITY INVOKER (infinite recursion on org_members).';
COMMENT ON FUNCTION public.has_org_role(uuid, public.org_role[]) IS
  'SECURITY DEFINER helper for role-scoped RLS. Same rules as is_org_member: keep EXECUTE granted to authenticated, keep SECURITY DEFINER, do NOT inline as EXISTS(...) into policies.';
COMMENT ON FUNCTION public.fair_is_published(uuid) IS
  'SECURITY DEFINER helper used by anon RLS policies. MUST remain EXECUTE-able by anon and authenticated — the entire public visitor portal depends on it. Returns only a boolean the caller is already entitled to know.';

-- 3. Re-point every dependent policy.

-- organizations
DROP POLICY IF EXISTS "org members read own org" ON public.organizations;
CREATE POLICY "org members read own org" ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(id));
DROP POLICY IF EXISTS "org owners/admins update own org" ON public.organizations;
CREATE POLICY "org owners/admins update own org" ON public.organizations FOR UPDATE TO authenticated
  USING (public.has_org_role(id, ARRAY['owner','admin']::public.org_role[]))
  WITH CHECK (public.has_org_role(id, ARRAY['owner','admin']::public.org_role[]));

-- org_members
DROP POLICY IF EXISTS "members read own-org memberships" ON public.org_members;
CREATE POLICY "members read own-org memberships" ON public.org_members FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "owners/admins add members" ON public.org_members;
CREATE POLICY "owners/admins add members" ON public.org_members FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(org_id, ARRAY['owner','admin']::public.org_role[]));
DROP POLICY IF EXISTS "owners/admins update members" ON public.org_members;
CREATE POLICY "owners/admins update members" ON public.org_members FOR UPDATE TO authenticated
  USING (public.has_org_role(org_id, ARRAY['owner','admin']::public.org_role[]))
  WITH CHECK (public.has_org_role(org_id, ARRAY['owner','admin']::public.org_role[]));
DROP POLICY IF EXISTS "owners/admins or self remove members" ON public.org_members;
CREATE POLICY "owners/admins or self remove members" ON public.org_members FOR DELETE TO authenticated
  USING (public.has_org_role(org_id, ARRAY['owner','admin']::public.org_role[]) OR user_id = auth.uid());

-- fairs
DROP POLICY IF EXISTS "managers read own-org fairs" ON public.fairs;
CREATE POLICY "managers read own-org fairs" ON public.fairs FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "managers insert fairs in own org" ON public.fairs;
CREATE POLICY "managers insert fairs in own org" ON public.fairs FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "managers update own-org fairs" ON public.fairs;
CREATE POLICY "managers update own-org fairs" ON public.fairs FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "owners/admins delete own-org fairs" ON public.fairs;
CREATE POLICY "owners/admins delete own-org fairs" ON public.fairs FOR DELETE TO authenticated
  USING (public.has_org_role(org_id, ARRAY['owner','admin']::public.org_role[]));

-- exhibitors
DROP POLICY IF EXISTS "managers read own-org exhibitors" ON public.exhibitors;
CREATE POLICY "managers read own-org exhibitors" ON public.exhibitors FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "managers insert exhibitors in own org" ON public.exhibitors;
CREATE POLICY "managers insert exhibitors in own org" ON public.exhibitors FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "managers update own-org exhibitors" ON public.exhibitors;
CREATE POLICY "managers update own-org exhibitors" ON public.exhibitors FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "managers delete own-org exhibitors" ON public.exhibitors;
CREATE POLICY "managers delete own-org exhibitors" ON public.exhibitors FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

-- exhibitor_sales_contacts
DROP POLICY IF EXISTS "managers read own-org sales contacts" ON public.exhibitor_sales_contacts;
CREATE POLICY "managers read own-org sales contacts" ON public.exhibitor_sales_contacts FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "managers insert own-org sales contacts" ON public.exhibitor_sales_contacts;
CREATE POLICY "managers insert own-org sales contacts" ON public.exhibitor_sales_contacts FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "managers update own-org sales contacts" ON public.exhibitor_sales_contacts;
CREATE POLICY "managers update own-org sales contacts" ON public.exhibitor_sales_contacts FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "managers delete own-org sales contacts" ON public.exhibitor_sales_contacts;
CREATE POLICY "managers delete own-org sales contacts" ON public.exhibitor_sales_contacts FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

-- map_assets
DROP POLICY IF EXISTS "managers read own-org map assets" ON public.map_assets;
CREATE POLICY "managers read own-org map assets" ON public.map_assets FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "managers insert own-org map assets" ON public.map_assets;
CREATE POLICY "managers insert own-org map assets" ON public.map_assets FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "managers update own-org map assets" ON public.map_assets;
CREATE POLICY "managers update own-org map assets" ON public.map_assets FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "managers delete own-org map assets" ON public.map_assets;
CREATE POLICY "managers delete own-org map assets" ON public.map_assets FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

-- map_hotspots
DROP POLICY IF EXISTS "managers read own-org hotspots" ON public.map_hotspots;
CREATE POLICY "managers read own-org hotspots" ON public.map_hotspots FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "managers insert own-org hotspots" ON public.map_hotspots;
CREATE POLICY "managers insert own-org hotspots" ON public.map_hotspots FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "managers update own-org hotspots" ON public.map_hotspots;
CREATE POLICY "managers update own-org hotspots" ON public.map_hotspots FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "managers delete own-org hotspots" ON public.map_hotspots;
CREATE POLICY "managers delete own-org hotspots" ON public.map_hotspots FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

-- schedule_items
DROP POLICY IF EXISTS "managers read own-org schedule" ON public.schedule_items;
CREATE POLICY "managers read own-org schedule" ON public.schedule_items FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "managers insert own-org schedule" ON public.schedule_items;
CREATE POLICY "managers insert own-org schedule" ON public.schedule_items FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "managers update own-org schedule" ON public.schedule_items;
CREATE POLICY "managers update own-org schedule" ON public.schedule_items FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP POLICY IF EXISTS "managers delete own-org schedule" ON public.schedule_items;
CREATE POLICY "managers delete own-org schedule" ON public.schedule_items FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

-- credit_ledger
DROP POLICY IF EXISTS "managers read own-org credit ledger" ON public.credit_ledger;
CREATE POLICY "managers read own-org credit ledger" ON public.credit_ledger FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

-- ai_queries
DROP POLICY IF EXISTS "managers read own-org ai queries" ON public.ai_queries;
CREATE POLICY "managers read own-org ai queries" ON public.ai_queries FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

-- storage.objects (fair-maps bucket)
DROP POLICY IF EXISTS "managers read own-org fair-maps" ON storage.objects;
CREATE POLICY "managers read own-org fair-maps" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'fair-maps'
         AND public.is_org_member(((storage.foldername(name))[1])::uuid));
DROP POLICY IF EXISTS "managers insert own-org fair-maps" ON storage.objects;
CREATE POLICY "managers insert own-org fair-maps" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fair-maps'
              AND public.is_org_member(((storage.foldername(name))[1])::uuid));
DROP POLICY IF EXISTS "managers update own-org fair-maps" ON storage.objects;
CREATE POLICY "managers update own-org fair-maps" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'fair-maps'
         AND public.is_org_member(((storage.foldername(name))[1])::uuid))
  WITH CHECK (bucket_id = 'fair-maps'
              AND public.is_org_member(((storage.foldername(name))[1])::uuid));
DROP POLICY IF EXISTS "managers delete own-org fair-maps" ON storage.objects;
CREATE POLICY "managers delete own-org fair-maps" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'fair-maps'
         AND public.is_org_member(((storage.foldername(name))[1])::uuid));

-- 4. Drop the old two/three-arg helpers now that no policy references them.
DROP FUNCTION IF EXISTS public.is_org_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.has_org_role(uuid, uuid, public.org_role[]);
