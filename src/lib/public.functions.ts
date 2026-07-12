/**
 * Public (anonymous) server functions for the visitor PWA.
 *
 * Security posture:
 * - Uses a server-local Supabase client with the publishable (anon) key.
 *   No user session, no localStorage, no admin bypass.
 * - Every query filters by `status = 'published' AND public_slug IS NOT NULL`,
 *   enforced BOTH by the DB (RLS + `fair_is_published` helper) AND by
 *   explicit WHERE clauses here. Belt and suspenders.
 * - Every SELECT projects an explicit column list. Never `select("*")`.
 *   Sales/lead contacts live in a separate `exhibitor_sales_contacts`
 *   table with no anon grants and no anon policies — they cannot be
 *   returned from this file at all.
 * - Pagination is required. Server hard-caps page size at MAX_PAGE_SIZE
 *   so an anonymous client cannot pull the whole exhibitor table in one
 *   call.
 * - Signed URLs for private floor-plan images are minted server-side via
 *   the admin client (imported inside the handler), but ONLY after we have
 *   confirmed the fair is public via `fair_is_published`. The admin client
 *   is never returned to the browser.
 *
 * NOTE ON RATE LIMITING: the platform does not currently expose a
 * backend-level rate limiter. Pagination + max page size mitigate mass
 * scraping through the API; add a proper edge/WAF-level limiter as a
 * separate task if abuse is observed.
 */

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 24;
const SIGNED_URL_TTL_SEC = 60 * 10; // 10 minutes; short so managers' edits propagate

function serverAnonClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Server Supabase env not configured");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9-]+$/i, "Invalid slug");

/** Fair overview by public slug. Returns null if not found/not published. */
export const getPublicFair = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: slugSchema }).parse(d))
  .handler(async ({ data }) => {
    const supabase = serverAnonClient();
    const { data: row, error } = await supabase
      .from("fairs")
      .select("id, name, logo_url, location, starts_at, ends_at, public_slug")
      .eq("public_slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

/** Paginated exhibitor list for a published fair. */
export const listPublicExhibitors = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        slug: slugSchema,
        page: z.number().int().min(1).max(1000).default(1),
        pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
        q: z.string().trim().max(100).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const supabase = serverAnonClient();

    const { data: fair, error: fErr } = await supabase
      .from("fairs")
      .select("id")
      .eq("public_slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (fErr) throw new Error(fErr.message);
    if (!fair) return { items: [], total: 0, page: data.page, pageSize: data.pageSize };

    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    let query = supabase
      .from("exhibitors")
      .select("id, company_name, booth_code, category, logo_url, website", { count: "exact" })
      .eq("fair_id", fair.id)
      .order("booth_code", { ascending: true })
      .range(from, to);

    if (data.q) {
      // Escape %/, in ilike patterns to avoid injection into the pattern.
      const safe = data.q.replace(/[%,]/g, " ");
      query = query.or(
        `company_name.ilike.%${safe}%,booth_code.ilike.%${safe}%,category.ilike.%${safe}%`,
      );
    }

    const { data: rows, error, count } = await query;
    if (error) throw new Error(error.message);
    return {
      items: rows ?? [],
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
    };
  });

/** Single exhibitor detail (public fields only). */
export const getPublicExhibitor = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ slug: slugSchema, exhibitorId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const supabase = serverAnonClient();

    const { data: fair, error: fErr } = await supabase
      .from("fairs")
      .select("id")
      .eq("public_slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (fErr) throw new Error(fErr.message);
    if (!fair) return null;

    const { data: row, error } = await supabase
      .from("exhibitors")
      .select("id, company_name, booth_code, category, logo_url, website, socials, description")
      .eq("id", data.exhibitorId)
      .eq("fair_id", fair.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

/** Floor plan (signed short-lived URL) + normalized hotspots. */
export const getPublicMap = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: slugSchema }).parse(d))
  .handler(async ({ data }) => {
    const supabase = serverAnonClient();

    const { data: fair, error: fErr } = await supabase
      .from("fairs")
      .select("id")
      .eq("public_slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (fErr) throw new Error(fErr.message);
    if (!fair) return { asset: null, signedUrl: null, hotspots: [] };

    const { data: asset, error: aErr } = await supabase
      .from("map_assets")
      .select("id, image_url, width, height")
      .eq("fair_id", fair.id)
      .maybeSingle();
    if (aErr) throw new Error(aErr.message);
    if (!asset) return { asset: null, signedUrl: null, hotspots: [] };

    const { data: hotspots, error: hErr } = await supabase
      .from("map_hotspots")
      .select("id, booth_code, exhibitor_id, polygon")
      .eq("map_asset_id", asset.id);
    if (hErr) throw new Error(hErr.message);

    // Mint a signed URL for the private object. Use admin only for this step,
    // AFTER we've confirmed the fair + asset are public. The admin client
    // never leaves the handler.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("fair-maps")
      .createSignedUrl(asset.image_url, SIGNED_URL_TTL_SEC);
    if (sErr) throw new Error(sErr.message);

    return {
      asset: { id: asset.id, width: asset.width, height: asset.height },
      signedUrl: signed.signedUrl,
      hotspots: hotspots ?? [],
    };
  });

/** Schedule items for a published fair, ordered by start. */
export const listPublicSchedule = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: slugSchema }).parse(d))
  .handler(async ({ data }) => {
    const supabase = serverAnonClient();

    const { data: fair, error: fErr } = await supabase
      .from("fairs")
      .select("id")
      .eq("public_slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (fErr) throw new Error(fErr.message);
    if (!fair) return [];

    const { data: rows, error } = await supabase
      .from("schedule_items")
      .select("id, title, description, location, starts_at, ends_at, exhibitor_id")
      .eq("fair_id", fair.id)
      .order("starts_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
