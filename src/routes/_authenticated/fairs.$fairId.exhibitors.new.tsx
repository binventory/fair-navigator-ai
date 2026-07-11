import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { createExhibitor } from "@/lib/exhibitors.functions";
import type { CreateExhibitorInput } from "@/lib/exhibitors.functions";
import { ExhibitorForm } from "@/components/ExhibitorForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/fairs/$fairId/exhibitors/new")({
  head: () => ({ meta: [{ title: "New exhibitor · ExpoAI" }] }),
  component: NewExhibitor,
});

function NewExhibitor() {
  const { fairId } = Route.useParams();
  const createFn = useServerFn(createExhibitor);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const mut = useMutation({
    mutationFn: (data: CreateExhibitorInput) =>
      createFn({ data }),
    onSuccess: () => {
      toast.success("Exhibitor added");
      qc.invalidateQueries({ queryKey: ["exhibitors", fairId] });
      navigate({ to: "/fairs/$fairId", params: { fairId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
        <CardHeader><CardTitle>New exhibitor</CardTitle></CardHeader>
        <CardContent>
          <ExhibitorForm
            submitLabel="Add exhibitor"
            busy={mut.isPending}
            onSubmit={(v) =>
              mut.mutate({
                fair_id: fairId,
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
