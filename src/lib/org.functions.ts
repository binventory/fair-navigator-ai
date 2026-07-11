import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyOrganizations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("org_members")
      .select("role, organizations(id, name, credit_balance, created_at)")
      .order("created_at", { referencedTable: "organizations", ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? [])
      .filter((r) => r.organizations)
      .map((r) => ({
        role: r.role,
        org: r.organizations as {
          id: string;
          name: string;
          credit_balance: number;
          created_at: string;
        },
      }));
  });
