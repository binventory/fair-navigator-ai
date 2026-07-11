import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Rectangle stored as normalized 0..1 coordinates in the map_hotspots.polygon jsonb column.
export const rectSchema = z.object({
  type: z.literal("rect"),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0.001).max(1),
  h: z.number().min(0.001).max(1),
});
export type RectShape = z.infer<typeof rectSchema>;

export const getFairMap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ fair_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: asset, error } = await context.supabase
      .from("map_assets")
      .select("id, fair_id, org_id, image_url, width, height, updated_at")
      .eq("fair_id", data.fair_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!asset) return { asset: null, signedUrl: null };

    const { data: signed, error: sErr } = await context.supabase.storage
      .from("fair-maps")
      .createSignedUrl(asset.image_url, 60 * 60);
    if (sErr) throw new Error(sErr.message);
    return { asset, signedUrl: signed.signedUrl };
  });

export const upsertMapAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      fair_id: z.string().uuid(),
      image_url: z.string().trim().min(1).max(500),
      width: z.number().int().positive().max(20000),
      height: z.number().int().positive().max(20000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: fair, error: fe } = await context.supabase
      .from("fairs").select("org_id").eq("id", data.fair_id).maybeSingle();
    if (fe) throw new Error(fe.message);
    if (!fair) throw new Error("Fair not found");

    const { data: row, error } = await context.supabase
      .from("map_assets")
      .upsert(
        {
          fair_id: data.fair_id,
          org_id: fair.org_id,
          image_url: data.image_url,
          width: data.width,
          height: data.height,
        },
        { onConflict: "fair_id" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteMapAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ fair_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: asset } = await context.supabase
      .from("map_assets").select("image_url").eq("fair_id", data.fair_id).maybeSingle();
    if (asset?.image_url) {
      await context.supabase.storage.from("fair-maps").remove([asset.image_url]);
    }
    const { error } = await context.supabase
      .from("map_assets").delete().eq("fair_id", data.fair_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listHotspots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ map_asset_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("map_hotspots")
      .select("id, map_asset_id, exhibitor_id, org_id, booth_code, polygon, updated_at")
      .eq("map_asset_id", data.map_asset_id)
      .order("booth_code", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const hotspotInput = z.object({
  booth_code: z.string().trim().min(1).max(50),
  exhibitor_id: z.string().uuid().nullable().optional(),
  polygon: rectSchema,
});

export const createHotspot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    hotspotInput.extend({ map_asset_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: asset, error: ae } = await context.supabase
      .from("map_assets").select("org_id").eq("id", data.map_asset_id).maybeSingle();
    if (ae) throw new Error(ae.message);
    if (!asset) throw new Error("Map not found");

    const { data: row, error } = await context.supabase
      .from("map_hotspots")
      .insert({
        map_asset_id: data.map_asset_id,
        org_id: asset.org_id,
        exhibitor_id: data.exhibitor_id ?? null,
        booth_code: data.booth_code,
        polygon: data.polygon,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateHotspot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    hotspotInput.partial({ polygon: true }).extend({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {
      booth_code: data.booth_code,
      exhibitor_id: data.exhibitor_id ?? null,
    };
    if (data.polygon) patch.polygon = data.polygon;
    const { data: row, error } = await context.supabase
      .from("map_hotspots").update(patch).eq("id", data.id).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteHotspot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("map_hotspots").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
