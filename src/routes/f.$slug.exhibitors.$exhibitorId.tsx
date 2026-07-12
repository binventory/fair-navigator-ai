import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getPublicExhibitor } from "@/lib/public.functions";
import { t } from "@/lib/i18n/strings";

const exQ = (slug: string, exhibitorId: string) =>
  queryOptions({
    queryKey: ["public-exhibitor", slug, exhibitorId],
    queryFn: () => getPublicExhibitor({ data: { slug, exhibitorId } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/f/$slug/exhibitors/$exhibitorId")({
  loader: async ({ params, context }) => {
    const ex = await context.queryClient.ensureQueryData(
      exQ(params.slug, params.exhibitorId),
    );
    if (!ex) throw notFound();
    return ex;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: `${t.common.notFound} — ${t.brand.name}` }, { name: "robots", content: "noindex" }] };
    }
    return {
      meta: [
        { title: `${loaderData.company_name} — ${t.brand.name}` },
        {
          name: "description",
          content: loaderData.description ?? loaderData.company_name,
        },
        { property: "og:title", content: loaderData.company_name },
        {
          property: "og:description",
          content: loaderData.description ?? loaderData.company_name,
        },
        ...(loaderData.logo_url
          ? [{ property: "og:image", content: loaderData.logo_url }]
          : []),
      ],
    };
  },
  component: ExhibitorDetail,
  notFoundComponent: ExhibitorNotFound,
});

function ExhibitorNotFound() {
  const { slug } = Route.useParams();
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t.common.notFound}</p>
      <Link
        to="/f/$slug/exhibitors"
        params={{ slug }}
        className="text-sm underline"
      >
        {t.visitor.exhibitors.backToList}
      </Link>
    </div>
  );
}

type Social = { label: string; href: string };

function normalizeSocials(raw: unknown): Social[] {
  if (!raw || typeof raw !== "object") return [];
  const out: Social[] = [];
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string" && /^https?:\/\//i.test(v)) {
      out.push({ label: k, href: v });
    }
  }
  return out;
}

function ExhibitorDetail() {
  const { slug, exhibitorId } = Route.useParams();
  const { data: ex } = useSuspenseQuery(exQ(slug, exhibitorId));
  if (!ex) return null;
  const socials = normalizeSocials(ex.socials);

  return (
    <article className="space-y-6">
      <Link
        to="/f/$slug/exhibitors"
        params={{ slug }}
        className="inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        ← {t.visitor.exhibitors.backToList}
      </Link>

      <header className="flex items-start gap-4">
        {ex.logo_url ? (
          <img
            src={ex.logo_url}
            alt=""
            width={64}
            height={64}
            className="h-16 w-16 rounded object-contain"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded bg-muted text-lg">
            {ex.company_name.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-semibold tracking-tight">{ex.company_name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.visitor.exhibitors.booth} {ex.booth_code}
            {ex.category ? ` · ${ex.category}` : ""}
          </p>
        </div>
      </header>

      {ex.description && (
        <p className="whitespace-pre-line text-sm leading-relaxed">{ex.description}</p>
      )}

      {(ex.website || socials.length > 0) && (
        <div className="space-y-2">
          {ex.website && (
            <a
              href={ex.website}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="block text-sm text-primary underline break-all"
            >
              {ex.website}
            </a>
          )}
          {socials.map((s) => (
            <a
              key={s.href}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="block text-sm text-primary underline break-all"
            >
              {s.label}: {s.href}
            </a>
          ))}
        </div>
      )}
    </article>
  );
}
