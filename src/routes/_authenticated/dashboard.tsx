import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyOrganizations } from "@/lib/org.functions";
import { listFairs } from "@/lib/fairs.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · ExpoAI" }] }),
  component: Dashboard,
});

function Dashboard() {
  const orgsFn = useServerFn(getMyOrganizations);
  const fairsFn = useServerFn(listFairs);
  const orgsQ = useQuery({ queryKey: ["orgs"], queryFn: () => orgsFn({}) });
  const fairsQ = useQuery({ queryKey: ["fairs"], queryFn: () => fairsFn({}) });
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage your organizations, fairs and exhibitors.
          </p>
        </div>
        <Button onClick={() => navigate({ to: "/fairs/new" })}>New fair</Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Organizations
        </h2>
        {orgsQ.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : orgsQ.error ? (
          <p className="text-sm text-destructive">{(orgsQ.error as Error).message}</p>
        ) : (orgsQ.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No organizations yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {orgsQ.data!.map(({ org, role }) => (
              <Card key={org.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="truncate">{org.name}</span>
                    <Badge variant="secondary">{role}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {org.credit_balance} credits
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Fairs
        </h2>
        {fairsQ.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : fairsQ.error ? (
          <p className="text-sm text-destructive">{(fairsQ.error as Error).message}</p>
        ) : (fairsQ.data ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No fairs yet. Create your first fair to get started.
              </p>
              <Button className="mt-4" onClick={() => navigate({ to: "/fairs/new" })}>
                New fair
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {fairsQ.data!.map((f) => (
              <Link
                key={f.id}
                to="/fairs/$fairId"
                params={{ fairId: f.id }}
                className="block"
              >
                <Card className="h-full transition-colors hover:border-primary/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="truncate">{f.name}</span>
                      <Badge variant={f.status === "published" ? "default" : "secondary"}>
                        {f.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-muted-foreground">
                    {f.location && <p>{f.location}</p>}
                    {f.public_slug && <p className="font-mono text-xs">/{f.public_slug}</p>}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
