GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, uuid, public.org_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fair_is_published(uuid) TO anon, authenticated;