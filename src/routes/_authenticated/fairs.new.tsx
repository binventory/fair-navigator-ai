import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { getMyOrganizations } from "@/lib/org.functions";
import { createFair } from "@/lib/fairs.functions";
import { FairForm, toIsoOrNull } from "@/components/FairForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/fairs/new")({
  head: () => ({ meta: [{ title: "New fair · ExpoAI" }] }),
  component: NewFair,
});

function NewFair() {
  const orgsFn = useServerFn(getMyOrganizations);
  const orgsQ = useQuery({ queryKey: ["orgs"], queryFn: () => orgsFn({}) });
  const createFn = useServerFn(createFair);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [orgId, setOrgId] = useState<string | null>(null);

  const orgs = orgsQ.data ?? [];
  const effectiveOrgId = orgId ?? orgs[0]?.org.id ?? null;

  const mut = useMutation({
    mutationFn: (payload: Parameters<typeof createFn>[0]["data"]) =>
      createFn({ data: payload }),
    onSuccess: (row) => {
      toast.success("Fair created");
      qc.invalidateQueries({ queryKey: ["fairs"] });
      navigate({ to: "/fairs/$fairId", params: { fairId: row.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to dashboard
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>New fair</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {orgsQ.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : orgs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You need an organization first.
            </p>
          ) : orgs.length > 1 ? (
            <div className="space-y-2">
              <Label>Organization</Label>
              <Select value={effectiveOrgId ?? undefined} onValueChange={setOrgId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {orgs.map(({ org }) => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <FairForm
            submitLabel="Create fair"
            busy={mut.isPending}
            onSubmit={(v) => {
              if (!effectiveOrgId) {
                toast.error("Select an organization");
                return;
              }
              mut.mutate({
                org_id: effectiveOrgId,
                name: v.name,
                location: v.location || null,
                starts_at: toIsoOrNull(v.starts_at),
                ends_at: toIsoOrNull(v.ends_at),
                public_slug: v.public_slug || null,
              });
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
