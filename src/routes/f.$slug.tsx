import { createFileRoute, Outlet, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getPublicFair } from "@/lib/public.functions";
import { t } from "@/lib/i18n/strings";

const fairQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["public-fair", slug],
    queryFn: () => getPublicFair({ data: { slug } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/f/$slug")({
  loader: async ({ params, context }) => {
    const fair = await context.queryClient.ensureQueryData(fairQueryOptions(params.slug));
    if (!fair) throw notFound();
    return fair;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: `${t.common.notFound} — ${t.brand.name}` }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.name} — ${t.brand.name}`;
    const description = loaderData.location
      ? `${loaderData.name} · ${loaderData.location}`
      : loaderData.name;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: loaderData.name },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: FairLayout,
  notFoundComponent: FairNotFound,
  errorComponent: FairError,
});

function FairError({ error }: { error: Error }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{t.common.error}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <Link to="/" className="mt-6 inline-block text-sm underline">{t.common.home}</Link>
    </div>
  );
}

function FairNotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{t.visitor.fair.notPublished}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t.visitor.fair.notPublishedDetail}
      </p>
      <Link to="/" className="mt-6 inline-block text-sm underline">{t.common.home}</Link>
    </div>
  );
}

function FairLayout() {
  const { slug } = Route.useParams();
  const { data: fair } = useSuspenseQuery(fairQueryOptions(slug));
  if (!fair) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-3xl px-4 py-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t.brand.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {fair.name}
          </h1>
          {fair.location && (
            <p className="mt-1 text-sm text-muted-foreground">{fair.location}</p>
          )}
        </div>
        <nav className="mx-auto max-w-3xl overflow-x-auto px-4">
          <div className="flex gap-1 border-b-0 text-sm">
            <TabLink to="/f/$slug" params={{ slug }} label={t.visitor.fair.about} />
            <TabLink
              to="/f/$slug/exhibitors"
              params={{ slug }}
              label={t.visitor.fair.exhibitors}
            />
            <TabLink to="/f/$slug/map" params={{ slug }} label={t.visitor.fair.floorPlan} />
            <TabLink to="/f/$slug/schedule" params={{ slug }} label={t.visitor.fair.schedule} />
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-3xl px-4 py-8 text-center text-xs text-muted-foreground">
        {t.privacy.essentialOnly}
      </footer>
    </div>
  );
}

type TabTo =
  | "/f/$slug"
  | "/f/$slug/exhibitors"
  | "/f/$slug/map"
  | "/f/$slug/schedule";

function TabLink({
  to,
  params,
  label,
}: {
  to: TabTo;
  params: { slug: string };
  label: string;
}) {
  return (
    <Link
      to={to}
      params={params}
      activeOptions={{ exact: to === "/f/$slug" }}
      className="border-b-2 border-transparent px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
      activeProps={{
        className: "border-b-2 border-primary px-3 py-2 text-foreground font-medium",
      }}
    >
      {label}
    </Link>
  );
}
