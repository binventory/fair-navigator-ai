import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listPublicSchedule } from "@/lib/public.functions";
import { t } from "@/lib/i18n/strings";

const schedQ = (slug: string) =>
  queryOptions({
    queryKey: ["public-schedule", slug],
    queryFn: () => listPublicSchedule({ data: { slug } }),
    staleTime: 30_000,
  });

export const Route = createFileRoute("/f/$slug/schedule")({
  loader: ({ params, context }) => context.queryClient.ensureQueryData(schedQ(params.slug)),
  head: () => ({ meta: [{ title: `${t.visitor.schedule.title} — ${t.brand.name}` }] }),
  component: SchedulePage,
});

function dayKey(iso: string) {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}
function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function SchedulePage() {
  const { slug } = Route.useParams();
  const { data: items } = useSuspenseQuery(schedQ(slug));

  if (items.length === 0) {
    return (
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{t.visitor.schedule.title}</h2>
        <p className="text-sm text-muted-foreground">{t.visitor.schedule.empty}</p>
      </div>
    );
  }

  const groups = new Map<string, typeof items>();
  for (const it of items) {
    const key = dayKey(it.starts_at);
    const arr = groups.get(key) ?? [];
    arr.push(it);
    groups.set(key, arr);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t.visitor.schedule.title}</h2>
        <p className="text-sm text-muted-foreground">{t.visitor.schedule.subtitle}</p>
      </div>

      {[...groups.entries()].map(([day, entries]) => (
        <section key={day} className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {fmtDay(entries[0].starts_at)}
          </h3>
          <ol className="space-y-3">
            {entries.map((it) => (
              <li key={it.id} className="rounded-md border bg-card p-4">
                <p className="text-xs text-muted-foreground">
                  {fmtTime(it.starts_at)}
                  {it.ends_at ? ` – ${fmtTime(it.ends_at)}` : ""}
                  {it.location ? ` · ${it.location}` : ""}
                </p>
                <p className="mt-1 font-medium">{it.title}</p>
                {it.description && (
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">
                    {it.description}
                  </p>
                )}
                {it.exhibitor_id && (
                  <Link
                    to="/f/$slug/exhibitors/$exhibitorId"
                    params={{ slug, exhibitorId: it.exhibitor_id }}
                    className="mt-2 inline-block text-xs text-primary underline"
                  >
                    {t.visitor.exhibitors.viewDetails} →
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
