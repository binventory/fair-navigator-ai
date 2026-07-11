import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { getFair, updateFair, setFairStatus, deleteFair } from "@/lib/fairs.functions";
import type { UpdateFairInput } from "@/lib/fairs.functions";
import { listExhibitors, deleteExhibitor } from "@/lib/exhibitors.functions";
import { FairForm, toIsoOrNull, fromIsoToLocal } from "@/components/FairForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/fairs/$fairId")({
  head: () => ({ meta: [{ title: "Fair · ExpoAI" }] }),
  component: FairDetail,
});

function FairDetail() {
  const { fairId } = Route.useParams();
  const getFn = useServerFn(getFair);
  const updateFn = useServerFn(updateFair);
  const statusFn = useServerFn(setFairStatus);
  const deleteFn = useServerFn(deleteFair);
  const listExFn = useServerFn(listExhibitors);
  const deleteExFn = useServerFn(deleteExhibitor);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const fairQ = useQuery({
    queryKey: ["fair", fairId],
    queryFn: () => getFn({ data: { id: fairId } }),
  });
  const exQ = useQuery({
    queryKey: ["exhibitors", fairId],
    queryFn: () => listExFn({ data: { fair_id: fairId } }),
  });

  const updateMut = useMutation({
    mutationFn: (data: UpdateFairInput) =>
      updateFn({ data }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["fair", fairId] });
      qc.invalidateQueries({ queryKey: ["fairs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMut = useMutation({
    mutationFn: (status: "draft" | "published") =>
      statusFn({ data: { id: fairId, status } }),
    onSuccess: (_r, status) => {
      toast.success(status === "published" ? "Published" : "Unpublished");
      qc.invalidateQueries({ queryKey: ["fair", fairId] });
      qc.invalidateQueries({ queryKey: ["fairs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteFn({ data: { id: fairId } }),
    onSuccess: () => {
      toast.success("Fair deleted");
      qc.invalidateQueries({ queryKey: ["fairs"] });
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteExMut = useMutation({
    mutationFn: (id: string) => deleteExFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Exhibitor removed");
      qc.invalidateQueries({ queryKey: ["exhibitors", fairId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [editing, setEditing] = useState(false);

  if (fairQ.isLoading) return <Skeleton className="h-64 w-full" />;
  if (fairQ.error) return <p className="text-sm text-destructive">{(fairQ.error as Error).message}</p>;
  const fair = fairQ.data!;
  const published = fair.status === "published";

  return (
    <div className="space-y-6">
      <div>
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to dashboard
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{fair.name}</h1>
            <Badge variant={published ? "default" : "secondary"}>{fair.status}</Badge>
          </div>
          {fair.location && (
            <p className="text-sm text-muted-foreground">{fair.location}</p>
          )}
          {fair.public_slug && (
            <p className="font-mono text-xs text-muted-foreground">/{fair.public_slug}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={published ? "outline" : "default"}
            onClick={() => statusMut.mutate(published ? "draft" : "published")}
            disabled={statusMut.isPending}
          >
            {published ? "Unpublish" : "Publish"}
          </Button>
          <Button variant="outline" onClick={() => setEditing((v) => !v)}>
            {editing ? "Close" : "Edit"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this fair?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove all exhibitors, map data and schedule items.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMut.mutate()}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {editing && (
        <Card>
          <CardHeader><CardTitle>Edit fair</CardTitle></CardHeader>
          <CardContent>
            <FairForm
              submitLabel="Save changes"
              busy={updateMut.isPending}
              initial={{
                name: fair.name,
                location: fair.location ?? "",
                starts_at: fromIsoToLocal(fair.starts_at),
                ends_at: fromIsoToLocal(fair.ends_at),
                public_slug: fair.public_slug ?? "",
              }}
              onSubmit={(v) =>
                updateMut.mutate({
                  id: fair.id,
                  name: v.name,
                  location: v.location || null,
                  starts_at: toIsoOrNull(v.starts_at),
                  ends_at: toIsoOrNull(v.ends_at),
                  public_slug: v.public_slug || null,
                })
              }
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Exhibitors</CardTitle>
          <Link to="/fairs/$fairId/exhibitors/new" params={{ fairId }}>
            <Button size="sm">Add exhibitor</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {exQ.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (exQ.data ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No exhibitors yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booth</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exQ.data!.map((ex) => (
                  <TableRow key={ex.id}>
                    <TableCell className="font-mono text-xs">{ex.booth_code}</TableCell>
                    <TableCell className="font-medium">{ex.company_name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {ex.category ?? "—"}
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Link
                        to="/fairs/$fairId/exhibitors/$exhibitorId"
                        params={{ fairId, exhibitorId: ex.id }}
                      >
                        <Button size="sm" variant="outline">Edit</Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost">Delete</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove {ex.company_name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This also deletes sales contact data for this exhibitor.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteExMut.mutate(ex.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
