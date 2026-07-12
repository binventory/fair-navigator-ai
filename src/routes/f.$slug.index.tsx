import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getPublicFair } from "@/lib/public.functions";
import { t } from "@/lib/i18n/strings";

const fairQ = (slug: string) =>
  queryOptions({
    queryKey: ["public-fair", slug],
    queryFn: () => getPublicFair({ data: { slug } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/f/$slug/")({
  loader: ({ params, context }) => context.queryClient.ensureQueryData(fairQ(params.slug)),
  component: FairAbout,
});

function fmtRange(startsAt: string | null, endsAt: string | null) {
  if (!startsAt) return null;
  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : null;
  const opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" };
  const sd = start.toLocaleDateString(undefined, opts);
  if (!end) return sd;
  const ed = end.toLocaleDateString(undefined, opts);
  return sd === ed ? sd : `${sd} – ${ed}`;
}

function FairAbout() {
  const { slug } = Route.useParams();
  const { data: fair } = useSuspenseQuery(fairQ(slug));
  if (!fair) return null;
  const dates = fmtRange(fair.starts_at, fair.ends_at);

  return (
    <div className="space-y-6">
      <dl className="grid gap-4 sm:grid-cols-2">
        {dates && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              {t.visitor.fair.dates}
            </dt>
            <dd className="mt-1 text-sm">{dates}</dd>
          </div>
        )}
        {fair.location && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              {t.visitor.fair.location}
            </dt>
            <dd className="mt-1 text-sm">{fair.location}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
