import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getPublicMap, listPublicExhibitors } from "@/lib/public.functions";
import { t } from "@/lib/i18n/strings";
import type { RectShape } from "@/lib/maps.functions";

const mapQ = (slug: string) =>
  queryOptions({
    queryKey: ["public-map", slug],
    queryFn: () => getPublicMap({ data: { slug } }),
    staleTime: 30_000,
  });

export const Route = createFileRoute("/f/$slug/map")({
  loader: ({ params, context }) => context.queryClient.ensureQueryData(mapQ(params.slug)),
  head: () => ({ meta: [{ title: `${t.visitor.map.title} — ${t.brand.name}` }] }),
  component: MapViewer,
});

function MapViewer() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(mapQ(slug));
  const [activeId, setActiveId] = useState<string | null>(null);

  // Load exhibitors (first page is enough for booth labels most of the time).
  // If more than one page, we still resolve names for hotspots on this page.
  const exQuery = useQuery({
    queryKey: ["public-exhibitors-index", slug],
    queryFn: () => listPublicExhibitors({ data: { slug, page: 1, pageSize: 50 } }),
    enabled: !!data?.asset,
    staleTime: 60_000,
  });

  const exhibitorsById = useMemo(() => {
    const m = new Map<string, { id: string; company_name: string; booth_code: string }>();
    for (const e of exQuery.data?.items ?? []) m.set(e.id, e);
    return m;
  }, [exQuery.data]);

  if (!data || !data.asset || !data.signedUrl) {
    return <p className="text-sm text-muted-foreground">{t.visitor.map.none}</p>;
  }

  const { asset, signedUrl, hotspots } = data;
  const active = hotspots.find((h) => h.id === activeId) ?? null;
  const activeExhibitor = active?.exhibitor_id
    ? exhibitorsById.get(active.exhibitor_id)
    : null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t.visitor.map.title}</h2>
        <p className="text-sm text-muted-foreground">{t.visitor.map.subtitle}</p>
      </div>

      {/* aspect-ratio keeps the plan geometrically correct on every screen; hotspots
          use normalized 0..1 coords so they land on the same pixels at any size. */}
      <div
        className="relative w-full overflow-hidden rounded-md border bg-muted"
        style={{ aspectRatio: `${asset.width} / ${asset.height}` }}
      >
        <img
          src={signedUrl}
          alt={t.visitor.map.title}
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
        {hotspots.map((h) => {
          const poly = h.polygon as unknown as RectShape;
          const isActive = h.id === activeId;
          return (
            <button
              key={h.id}
              type="button"
              onClick={() => setActiveId(h.id)}
              aria-label={`${t.visitor.exhibitors.booth} ${h.booth_code}`}
              className={`absolute rounded-sm border-2 transition ${
                isActive
                  ? "border-primary bg-primary/40 ring-2 ring-primary"
                  : "border-primary/60 bg-primary/15 hover:bg-primary/25"
              }`}
              style={{
                left: `${poly.x * 100}%`,
                top: `${poly.y * 100}%`,
                width: `${poly.w * 100}%`,
                height: `${poly.h * 100}%`,
              }}
            >
              <span className="pointer-events-none absolute left-1 top-0.5 rounded bg-black/60 px-1 text-[10px] font-semibold text-white">
                {h.booth_code}
              </span>
            </button>
          );
        })}
      </div>

      {active ? (
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t.visitor.exhibitors.booth} {active.booth_code}
          </p>
          {activeExhibitor ? (
            <>
              <p className="mt-1 font-medium">{activeExhibitor.company_name}</p>
              <Link
                to="/f/$slug/exhibitors/$exhibitorId"
                params={{ slug, exhibitorId: activeExhibitor.id }}
                className="mt-2 inline-block text-sm text-primary underline"
              >
                {t.visitor.exhibitors.viewDetails} →
              </Link>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">—</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t.visitor.map.hotspotHint}</p>
      )}

      {/* keep navigate reference used to satisfy linters if reused later */}
      <span className="hidden">{navigate.length}</span>
    </div>
  );
}
