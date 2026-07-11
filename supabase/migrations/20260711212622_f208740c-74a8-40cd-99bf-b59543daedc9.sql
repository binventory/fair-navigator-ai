
-- Enums
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'staff');
CREATE TYPE public.fair_status AS ENUM ('draft', 'published');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- organizations
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  credit_balance BIGINT NOT NULL DEFAULT 0 CHECK (credit_balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_organizations_owner ON public.organizations(owner_user_id);
CREATE TRIGGER trg_orgs_updated BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- org_members
CREATE TABLE public.org_members (
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.org_role NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);
CREATE INDEX idx_org_members_user ON public.org_members(user_id);

-- Security-definer membership helpers (avoid recursive RLS on org_members)
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.org_members
                 WHERE org_id = _org_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_org_id UUID, _user_id UUID, _roles public.org_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.org_members
                 WHERE org_id = _org_id AND user_id = _user_id AND role = ANY(_roles));
$$;

-- fairs
CREATE TABLE public.fairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  location TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  public_slug TEXT UNIQUE,
  status public.fair_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fairs_org ON public.fairs(org_id);
CREATE INDEX idx_fairs_slug ON public.fairs(public_slug) WHERE status = 'published';
CREATE TRIGGER trg_fairs_updated BEFORE UPDATE ON public.fairs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Now that fairs exists, define published-check helper
CREATE OR REPLACE FUNCTION public.fair_is_published(_fair_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.fairs
                 WHERE id = _fair_id AND status = 'published');
$$;

-- exhibitors (public-safe fields only)
CREATE TABLE public.exhibitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fair_id UUID NOT NULL REFERENCES public.fairs(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  booth_code TEXT NOT NULL,
  category TEXT,
  logo_url TEXT,
  website TEXT,
  socials JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fair_id, booth_code)
);
CREATE INDEX idx_exhibitors_fair ON public.exhibitors(fair_id);
CREATE INDEX idx_exhibitors_org ON public.exhibitors(org_id);
CREATE INDEX idx_exhibitors_category ON public.exhibitors(fair_id, category);
CREATE TRIGGER trg_exhibitors_updated BEFORE UPDATE ON public.exhibitors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- exhibitor_sales_contacts (MANAGER-ONLY table)
CREATE TABLE public.exhibitor_sales_contacts (
  exhibitor_id UUID PRIMARY KEY REFERENCES public.exhibitors(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sales_contacts_org ON public.exhibitor_sales_contacts(org_id);
CREATE TRIGGER trg_sales_contacts_updated BEFORE UPDATE ON public.exhibitor_sales_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- map_assets
CREATE TABLE public.map_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fair_id UUID NOT NULL REFERENCES public.fairs(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_map_assets_fair ON public.map_assets(fair_id);
CREATE TRIGGER trg_map_assets_updated BEFORE UPDATE ON public.map_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- map_hotspots — polygon uses normalized 0..1 coords so it scales on any screen
CREATE TABLE public.map_hotspots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_asset_id UUID NOT NULL REFERENCES public.map_assets(id) ON DELETE CASCADE,
  exhibitor_id UUID REFERENCES public.exhibitors(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  booth_code TEXT NOT NULL,
  polygon JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_hotspots_asset ON public.map_hotspots(map_asset_id);
CREATE INDEX idx_hotspots_exhibitor ON public.map_hotspots(exhibitor_id);
CREATE TRIGGER trg_hotspots_updated BEFORE UPDATE ON public.map_hotspots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- schedule_items
CREATE TABLE public.schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fair_id UUID NOT NULL REFERENCES public.fairs(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_schedule_fair ON public.schedule_items(fair_id, starts_at);
CREATE TRIGGER trg_schedule_updated BEFORE UPDATE ON public.schedule_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ai_queries (analytics + billing; server-side writes only)
CREATE TABLE public.ai_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fair_id UUID NOT NULL REFERENCES public.fairs(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  visitor_session_id TEXT NOT NULL,
  input_text TEXT,
  intent TEXT,
  credits_used INTEGER NOT NULL DEFAULT 1 CHECK (credits_used >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_queries_fair_time ON public.ai_queries(fair_id, created_at DESC);
CREATE INDEX idx_ai_queries_org_time ON public.ai_queries(org_id, created_at DESC);
CREATE INDEX idx_ai_queries_session ON public.ai_queries(visitor_session_id, created_at DESC);

-- credit_ledger (server-side writes only)
CREATE TABLE public.credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  delta BIGINT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_credit_ledger_org_time ON public.credit_ledger(org_id, created_at DESC);

-- =========================================================================
-- GRANTS
-- =========================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_members TO authenticated;
GRANT ALL ON public.org_members TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fairs TO authenticated;
GRANT SELECT ON public.fairs TO anon;
GRANT ALL ON public.fairs TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exhibitors TO authenticated;
GRANT SELECT ON public.exhibitors TO anon;
GRANT ALL ON public.exhibitors TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exhibitor_sales_contacts TO authenticated;
GRANT ALL ON public.exhibitor_sales_contacts TO service_role;
-- No anon grant: sales contacts are manager-only.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.map_assets TO authenticated;
GRANT SELECT ON public.map_assets TO anon;
GRANT ALL ON public.map_assets TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.map_hotspots TO authenticated;
GRANT SELECT ON public.map_hotspots TO anon;
GRANT ALL ON public.map_hotspots TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_items TO authenticated;
GRANT SELECT ON public.schedule_items TO anon;
GRANT ALL ON public.schedule_items TO service_role;

GRANT SELECT ON public.ai_queries TO authenticated;
GRANT ALL ON public.ai_queries TO service_role;

GRANT SELECT ON public.credit_ledger TO authenticated;
GRANT ALL ON public.credit_ledger TO service_role;

-- =========================================================================
-- ENABLE RLS
-- =========================================================================
ALTER TABLE public.organizations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fairs                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exhibitors                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exhibitor_sales_contacts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_assets                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_hotspots               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_queries                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger              ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- POLICIES
-- =========================================================================

-- organizations: members read their org row (incl. credit_balance for managers)
CREATE POLICY "org members read own org" ON public.organizations
  FOR SELECT TO authenticated
  USING (public.is_org_member(id, auth.uid()));
-- Owners/admins update org fields. Real credit_balance updates happen server-side via ledger fn.
CREATE POLICY "org owners/admins update own org" ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.has_org_role(id, auth.uid(), ARRAY['owner','admin']::public.org_role[]))
  WITH CHECK (public.has_org_role(id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));
-- Any authenticated user may create an org, but only as its own owner.
CREATE POLICY "authenticated create org as self-owner" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());
-- Only the owner may delete the org.
CREATE POLICY "owner deletes own org" ON public.organizations
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());

-- org_members: members see teammates of their own orgs
CREATE POLICY "members read own-org memberships" ON public.org_members
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));
-- Owners/admins add members to their org
CREATE POLICY "owners/admins add members" ON public.org_members
  FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));
-- Owners/admins change member roles in their org
CREATE POLICY "owners/admins update members" ON public.org_members
  FOR UPDATE TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]))
  WITH CHECK (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));
-- Owners/admins remove members; users may remove themselves
CREATE POLICY "owners/admins or self remove members" ON public.org_members
  FOR DELETE TO authenticated
  USING (
    public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[])
    OR user_id = auth.uid()
  );

-- fairs: managers see all of their org's fairs (draft + published)
CREATE POLICY "managers read own-org fairs" ON public.fairs
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));
-- Visitors see only published fairs
CREATE POLICY "public reads published fairs" ON public.fairs
  FOR SELECT TO anon
  USING (status = 'published');
-- Managers create fairs inside their own org
CREATE POLICY "managers insert fairs in own org" ON public.fairs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, auth.uid()));
-- Managers update fairs of their own org
CREATE POLICY "managers update own-org fairs" ON public.fairs
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, auth.uid()))
  WITH CHECK (public.is_org_member(org_id, auth.uid()));
-- Owners/admins delete fairs of their own org
CREATE POLICY "owners/admins delete own-org fairs" ON public.fairs
  FOR DELETE TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

-- exhibitors: managers see all of their org's exhibitors
CREATE POLICY "managers read own-org exhibitors" ON public.exhibitors
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));
-- Visitors see exhibitors only if the parent fair is published
CREATE POLICY "public reads exhibitors of published fairs" ON public.exhibitors
  FOR SELECT TO anon
  USING (public.fair_is_published(fair_id));
-- Managers write exhibitors in their own org
CREATE POLICY "managers insert exhibitors in own org" ON public.exhibitors
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "managers update own-org exhibitors" ON public.exhibitors
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, auth.uid()))
  WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "managers delete own-org exhibitors" ON public.exhibitors
  FOR DELETE TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));

-- exhibitor_sales_contacts: manager-only; NEVER visible to visitors (no anon grant + no anon policy)
CREATE POLICY "managers read own-org sales contacts" ON public.exhibitor_sales_contacts
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "managers insert own-org sales contacts" ON public.exhibitor_sales_contacts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "managers update own-org sales contacts" ON public.exhibitor_sales_contacts
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, auth.uid()))
  WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "managers delete own-org sales contacts" ON public.exhibitor_sales_contacts
  FOR DELETE TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));

-- map_assets: managers see all of their org's assets
CREATE POLICY "managers read own-org map assets" ON public.map_assets
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));
-- Visitors see map assets only if parent fair is published
CREATE POLICY "public reads map assets of published fairs" ON public.map_assets
  FOR SELECT TO anon
  USING (public.fair_is_published(fair_id));
CREATE POLICY "managers insert own-org map assets" ON public.map_assets
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "managers update own-org map assets" ON public.map_assets
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, auth.uid()))
  WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "managers delete own-org map assets" ON public.map_assets
  FOR DELETE TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));

-- map_hotspots: managers see all of their org's hotspots
CREATE POLICY "managers read own-org hotspots" ON public.map_hotspots
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));
-- Visitors see hotspots only if the parent asset belongs to a published fair
CREATE POLICY "public reads hotspots of published fairs" ON public.map_hotspots
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.map_assets ma
    WHERE ma.id = map_hotspots.map_asset_id
      AND public.fair_is_published(ma.fair_id)
  ));
CREATE POLICY "managers insert own-org hotspots" ON public.map_hotspots
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "managers update own-org hotspots" ON public.map_hotspots
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, auth.uid()))
  WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "managers delete own-org hotspots" ON public.map_hotspots
  FOR DELETE TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));

-- schedule_items: managers see own-org schedule
CREATE POLICY "managers read own-org schedule" ON public.schedule_items
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));
-- Visitors see schedule only for published fairs
CREATE POLICY "public reads schedule of published fairs" ON public.schedule_items
  FOR SELECT TO anon
  USING (public.fair_is_published(fair_id));
CREATE POLICY "managers insert own-org schedule" ON public.schedule_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "managers update own-org schedule" ON public.schedule_items
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, auth.uid()))
  WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "managers delete own-org schedule" ON public.schedule_items
  FOR DELETE TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));

-- ai_queries: managers read their org's query log. No client writes — server code uses service_role.
CREATE POLICY "managers read own-org ai queries" ON public.ai_queries
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));

-- credit_ledger: managers read their org's ledger. No client writes — only server code (service_role) inserts.
CREATE POLICY "managers read own-org credit ledger" ON public.credit_ledger
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));

-- Auto-provision: on new user signup, create an org and add the user as owner
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_org_id UUID;
  org_name TEXT;
BEGIN
  org_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'organization_name', ''),
    split_part(COALESCE(NEW.email, 'My Organization'), '@', 1) || '''s Organization'
  );

  INSERT INTO public.organizations (name, owner_user_id, credit_balance)
  VALUES (org_name, NEW.id, 0)
  RETURNING id INTO new_org_id;

  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
