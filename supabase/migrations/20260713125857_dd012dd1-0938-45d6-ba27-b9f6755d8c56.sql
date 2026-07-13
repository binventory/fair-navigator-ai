-- Task 0b: prevent client-side credit_balance tampering.
-- Task 0a is already committed in migration 20260713123657 (three GRANTs).
CREATE OR REPLACE FUNCTION public.protect_credit_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.credit_balance IS DISTINCT FROM OLD.credit_balance
     AND current_setting('role', true) IS DISTINCT FROM 'service_role'
     AND (SELECT current_user) <> 'service_role' THEN
    RAISE EXCEPTION 'credit_balance can only be modified by server-side ledger logic';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_organizations_credit_balance ON public.organizations;
CREATE TRIGGER protect_organizations_credit_balance
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_credit_balance();