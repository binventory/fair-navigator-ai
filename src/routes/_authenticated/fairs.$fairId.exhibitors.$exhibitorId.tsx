import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getExhibitor, updateExhibitor } from "@/lib/exhibitors.functions";
import { ExhibitorForm } from "@/components/ExhibitorForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute(
  "/_authenticated/fairs/$fairId/exhibitors/$exhibitorId",
)({
  head: () => ({ meta: [{ title: "Edit exhibitor · ExpoAI" }] }),
  component: EditExhibitor,
});

function EditExhibitor() {
  const { fairId, exhibitorId } = Route.useParams();
  const getFn = useServerFn(getExhibitor);
  const updateFn = useServerFn(updateExhibitor);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const q = useQuery({
    queryKey: ["exhibitor", exhibitorId],
    queryFn: () => getFn({ data: { id: exhibitorId } }),
  });

  const mut = useMutation({
    mutationFn: (data: Parameters<typeof updateFn>[0]["data"]) =>
      updateFn({ data }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["exhibitor", exhibitorId] });
      qc.invalidateQueries({ queryKey: ["exhibitors", fairId] });
      navigate({ to: "/fairs/$fairId", params: { fairId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <Skeleton className="h-96 w-full" />;
  if (q.error) return <p className="text-sm text-destructive">{(q.error as Error).message}</p>;
  const ex = q.data!;
  const contact = Array.isArray(ex.exhibitor_sales_contacts)
    ? ex.exhibitor_sales_contacts[0]
    : (ex.exhibitor_sales_contacts as { contact_name?: string | null; contact_email?: string | null; contact_phone?: string | null; notes?: string | null } | null);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        to="/fairs/$fairId"
        params={{ fairId }}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to fair
      </Link>
      <Card>
        <CardHeader><CardTitle>Edit exhibitor</CardTitle></CardHeader>
        <CardContent>
          <ExhibitorForm
            submitLabel="Save changes"
            busy={mut.isPending}
            initial={{
              company_name: ex.company_name,
              booth_code: ex.booth_code,
              category: ex.category ?? "",
              description: ex.description ?? "",
              website: ex.website ?? "",
              logo_url: ex.logo_url ?? "",
              contact_name: contact?.contact_name ?? "",
              contact_email: contact?.contact_email ?? "",
              contact_phone: contact?.contact_phone ?? "",
              notes: contact?.notes ?? "",
            }}
            onSubmit={(v) =>
              mut.mutate({
                id: exhibitorId,
                company_name: v.company_name,
                booth_code: v.booth_code,
                category: v.category || null,
                description: v.description || null,
                website: v.website || null,
                logo_url: v.logo_url || null,
                contact_name: v.contact_name || null,
                contact_email: v.contact_email || null,
                contact_phone: v.contact_phone || null,
                notes: v.notes || null,
              })
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
