import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listSchedule = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ fair_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("schedule_items")
      .select("id, fair_id, org_id, title, description, location, starts_at, ends_at, exhibitor_id, updated_at")
      .eq("fair_id", data.fair_id)
      .order("starts_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const scheduleInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional().nullable(),
  location: z.string().trim().max(200).optional().nullable(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime().optional().nullable(),
  exhibitor_id: z.string().uuid().nullable().optional(),
});

export const createScheduleItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    scheduleInputSchema.extend({ fair_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: fair, error: fe } = await context.supabase
      .from("fairs").select("org_id").eq("id", data.fair_id).maybeSingle();
    if (fe) throw new Error(fe.message);
    if (!fair) throw new Error("Fair not found");

    const { data: row, error } = await context.supabase
      .from("schedule_items")
      .insert({
        fair_id: data.fair_id,
        org_id: fair.org_id,
        title: data.title,
        description: data.description ?? null,
        location: data.location ?? null,
        starts_at: data.starts_at,
        ends_at: data.ends_at ?? null,
        exhibitor_id: data.exhibitor_id ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateScheduleItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    scheduleInputSchema.extend({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase
      .from("schedule_items")
      .update({
        title: patch.title,
        description: patch.description ?? null,
        location: patch.location ?? null,
        starts_at: patch.starts_at,
        ends_at: patch.ends_at ?? null,
        exhibitor_id: patch.exhibitor_id ?? null,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteScheduleItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("schedule_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
