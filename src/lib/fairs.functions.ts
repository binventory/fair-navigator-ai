import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const slugRe = /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/;

export const listFairs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("fairs")
      .select("id, name, status, public_slug, location, starts_at, ends_at, org_id, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getFair = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("fairs")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Fair not found");
    return row;
  });

export const fairInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  location: z.string().trim().max(200).optional().nullable(),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
  public_slug: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => slugRe.test(v), "Slug: lowercase letters, digits, hyphens (2-60 chars)")
    .optional()
    .nullable(),
});

export const createFair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    fairInputSchema.extend({ org_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("fairs")
      .insert({
        org_id: data.org_id,
        name: data.name,
        location: data.location ?? null,
        starts_at: data.starts_at ?? null,
        ends_at: data.ends_at ?? null,
        public_slug: data.public_slug ?? null,
        status: "draft",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateFair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    fairInputSchema.extend({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase
      .from("fairs")
      .update({
        name: patch.name,
        location: patch.location ?? null,
        starts_at: patch.starts_at ?? null,
        ends_at: patch.ends_at ?? null,
        public_slug: patch.public_slug ?? null,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const setFairStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["draft", "published"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.status === "published") {
      const { data: fair } = await context.supabase
        .from("fairs")
        .select("public_slug")
        .eq("id", data.id)
        .maybeSingle();
      if (!fair?.public_slug) {
        throw new Error("A public slug is required before publishing.");
      }
    }
    const { data: row, error } = await context.supabase
      .from("fairs")
      .update({ status: data.status })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteFair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("fairs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type CreateFairInput = z.infer<typeof fairInputSchema> & { org_id: string };
export type UpdateFairInput = z.infer<typeof fairInputSchema> & { id: string };
