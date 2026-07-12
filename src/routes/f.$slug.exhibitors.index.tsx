import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { listPublicExhibitors } from "@/lib/public.functions";
import { t } from "@/lib/i18n/strings";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/f/$slug/exhibitors/")({
  head: () => ({ meta: [{ title: `${t.visitor.exhibitors.title} — ${t.brand.name}` }] }),
  component: ExhibitorsList,
});

const PAGE_SIZE = 24;

function ExhibitorsList() {
  const { slug } = Route.useParams();
  const [q, setQ] = useState("");
  const [committedQ, setCommittedQ] = useState("");
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["public-exhibitors", slug, committedQ, page],
    queryFn: () =>
      listPublicExhibitors({
        data: { slug, page, pageSize: PAGE_SIZE, q: committedQ || undefined },
      }),
    placeholderData: keepPreviousData,
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    setCommittedQ(q.trim());
  }

  const totalPages = query.data ? Math.max(1, Math.ceil(query.data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{t.visitor.exhibitors.title}</h2>
        <p className="text-sm text-muted-foreground">{t.visitor.exhibitors.subtitle}</p>
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.visitor.exhibitors.searchPlaceholder}
          aria-label={t.common.search}
          maxLength={100}
        />
        <Button type="submit" variant="secondary">{t.common.search}</Button>
        {committedQ && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => { setQ(""); setCommittedQ(""); setPage(1); }}
          >
            {t.common.clear}
          </Button>
        )}
      </form>

      {query.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : query.error ? (
        <p className="text-sm text-destructive">{(query.error as Error).message}</p>
      ) : !query.data || query.data.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {committedQ ? t.visitor.exhibitors.empty : t.visitor.exhibitors.emptyAll}
        </p>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2">
            {query.data.items.map((ex) => (
              <li key={ex.id}>
                <Link
                  to="/f/$slug/exhibitors/$exhibitorId"
                  params={{ slug, exhibitorId: ex.id }}
                  className="block h-full"
                >
                  <Card className="h-full transition-colors hover:border-primary">
                    <CardContent className="flex gap-3 p-4">
                      {ex.logo_url ? (
                        <img
                          src={ex.logo_url}
                          alt=""
                          loading="lazy"
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded object-contain"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                          {ex.company_name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{ex.company_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.visitor.exhibitors.booth} {ex.booth_code}
                          {ex.category ? ` · ${ex.category}` : ""}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <nav className="flex items-center justify-between gap-2 pt-2" aria-label="Pagination">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || query.isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t.common.previous}
              </Button>
              <span className="text-xs text-muted-foreground">
                {t.common.page} {page} {t.common.of} {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || query.isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                {t.common.next}
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
