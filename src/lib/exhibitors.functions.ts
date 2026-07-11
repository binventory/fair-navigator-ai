import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listExhibitors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ fair_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("exhibitors")
      .select("id, company_name, booth_code, category, website, updated_at")
      .eq("fair_id", data.fair_id)
      .order("booth_code", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getExhibitor = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("exhibitors")
      .select("*, exhibitor_sales_contacts(contact_name, contact_email, contact_phone, notes)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Exhibitor not found");
    return row;
  });

export const exhibitorInputSchema = z.object({
  company_name: z.string().trim().min(1).max(200),
  booth_code: z.string().trim().min(1).max(50),
  category: z.string().trim().max(100).optional().nullable(),
  description: z.string().trim().max(4000).optional().nullable(),
  website: z.string().trim().url().max(500).optional().nullable().or(z.literal("").transform(() => null)),
  logo_url: z.string().trim().url().max(500).optional().nullable().or(z.literal("").transform(() => null)),
  contact_name: z.string().trim().max(200).optional().nullable(),
  contact_email: z.string().trim().email().max(255).optional().nullable().or(z.literal("").transform(() => null)),
  contact_phone: z.string().trim().max(50).optional().nullable(),
  notes: z.string().trim().max(4000).optional().nullable(),
});

export const createExhibitor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    exhibitorInputSchema.extend({ fair_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: fair, error: fairErr } = await context.supabase
      .from("fairs")
      .select("org_id")
      .eq("id", data.fair_id)
      .maybeSingle();
    if (fairErr) throw new Error(fairErr.message);
    if (!fair) throw new Error("Fair not found");

    const { data: row, error } = await context.supabase
      .from("exhibitors")
      .insert({
        fair_id: data.fair_id,
        org_id: fair.org_id,
        company_name: data.company_name,
        booth_code: data.booth_code,
        category: data.category ?? null,
        description: data.description ?? null,
        website: data.website ?? null,
        logo_url: data.logo_url ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (data.contact_name || data.contact_email || data.contact_phone || data.notes) {
      const { error: contactErr } = await context.supabase
        .from("exhibitor_sales_contacts")
        .upsert({
          exhibitor_id: row.id,
          org_id: fair.org_id,
          contact_name: data.contact_name ?? null,
          contact_email: data.contact_email ?? null,
          contact_phone: data.contact_phone ?? null,
          notes: data.notes ?? null,
        });
      if (contactErr) throw new Error(contactErr.message);
    }

    return row;
  });

export const updateExhibitor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    exhibitorInputSchema.extend({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, contact_name, contact_email, contact_phone, notes, ...patch } = data;

    const { data: row, error } = await context.supabase
      .from("exhibitors")
      .update({
        company_name: patch.company_name,
        booth_code: patch.booth_code,
        category: patch.category ?? null,
        description: patch.description ?? null,
        website: patch.website ?? null,
        logo_url: patch.logo_url ?? null,
      })
      .eq("id", id)
      .select("id, org_id")
      .single();
    if (error) throw new Error(error.message);

    const { error: contactErr } = await context.supabase
      .from("exhibitor_sales_contacts")
      .upsert({
        exhibitor_id: row.id,
        org_id: row.org_id,
        contact_name: contact_name ?? null,
        contact_email: contact_email ?? null,
        contact_phone: contact_phone ?? null,
        notes: notes ?? null,
      });
    if (contactErr) throw new Error(contactErr.message);

    return { ok: true };
  });

export const deleteExhibitor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("exhibitors").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type CreateExhibitorInput = z.infer<typeof exhibitorInputSchema> & { fair_id: string };
export type UpdateExhibitorInput = z.infer<typeof exhibitorInputSchema> & { id: string };
