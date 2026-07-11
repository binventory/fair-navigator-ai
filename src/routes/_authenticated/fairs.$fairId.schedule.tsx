import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  listSchedule, createScheduleItem, updateScheduleItem, deleteScheduleItem,
} from "@/lib/schedule.functions";
import { listExhibitors } from "@/lib/exhibitors.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/fairs/$fairId/schedule")({
  head: () => ({ meta: [{ title: "Schedule · ExpoAI" }] }),
  component: SchedulePage,
});

const NONE = "__none__";

type FormValues = {
  id?: string;
  title: string;
  description: string;
  location: string;
  starts_at: string; // datetime-local
  ends_at: string;
  exhibitor_id: string;
};

const empty: FormValues = {
  title: "", description: "", location: "", starts_at: "", ends_at: "", exhibitor_id: NONE,
};

function toIso(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
function fromIso(v: string | null | undefined): string {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}
function fmt(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

function SchedulePage() {
  const { fairId } = Route.useParams();
  const qc = useQueryClient();

  const listFn = useServerFn(listSchedule);
  const listExFn = useServerFn(listExhibitors);
  const createFn = useServerFn(createScheduleItem);
  const updateFn = useServerFn(updateScheduleItem);
  const deleteFn = useServerFn(deleteScheduleItem);

  const q = useQuery({ queryKey: ["schedule", fairId], queryFn: () => listFn({ data: { fair_id: fairId } }) });
  const exQ = useQuery({ queryKey: ["exhibitors", fairId], queryFn: () => listExFn({ data: { fair_id: fairId } }) });

  const [form, setForm] = useState<FormValues>(empty);
  const [showForm, setShowForm] = useState(false);

  function set<K extends keyof FormValues>(k: K, v: FormValues[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  const saveMut = useMutation({
    mutationFn: async (v: FormValues) => {
      const starts = toIso(v.starts_at);
      if (!starts) throw new Error("Start time is required");
      const payload = {
        title: v.title.trim(),
        description: v.description.trim() || null,
        location: v.location.trim() || null,
        starts_at: starts,
        ends_at: toIso(v.ends_at),
        exhibitor_id: v.exhibitor_id === NONE ? null : v.exhibitor_id,
      };
      if (v.id) return updateFn({ data: { id: v.id, ...payload } });
      return createFn({ data: { fair_id: fairId, ...payload } });
    },
    onSuccess: () => {
      toast.success("Saved");
      setForm(empty);
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["schedule", fairId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["schedule", fairId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    saveMut.mutate(form);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/fairs/$fairId" params={{ fairId }} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to fair
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground">Talks, sessions and events for this fair.</p>
        </div>
        <Button onClick={() => { setForm(empty); setShowForm(true); }}>Add item</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{form.id ? "Edit item" : "New item"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="s-title">Title *</Label>
                <Input id="s-title" required maxLength={200}
                  value={form.title} onChange={(e) => set("title", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-start">Starts *</Label>
                <Input id="s-start" type="datetime-local" required
                  value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-end">Ends</Label>
                <Input id="s-end" type="datetime-local"
                  value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-loc">Location</Label>
                <Input id="s-loc" maxLength={200}
                  value={form.location} onChange={(e) => set("location", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Exhibitor</Label>
                <Select value={form.exhibitor_id} onValueChange={(v) => set("exhibitor_id", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {(exQ.data ?? []).map((ex) => (
                      <SelectItem key={ex.id} value={ex.id}>
                        {ex.booth_code} · {ex.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="s-desc">Description</Label>
                <Textarea id="s-desc" rows={3} maxLength={4000}
                  value={form.description} onChange={(e) => set("description", e.target.value)} />
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={saveMut.isPending}>
                  {saveMut.isPending ? "Saving…" : form.id ? "Save changes" : "Add item"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setForm(empty); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {q.isLoading ? (
            <div className="p-6"><Skeleton className="h-24 w-full" /></div>
          ) : (q.data ?? []).length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No items yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Starts</TableHead>
                  <TableHead>Ends</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Exhibitor</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.data!.map((it) => {
                  const ex = (exQ.data ?? []).find((e) => e.id === it.exhibitor_id);
                  return (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium">{it.title}</TableCell>
                      <TableCell className="text-xs">{fmt(it.starts_at)}</TableCell>
                      <TableCell className="text-xs">{fmt(it.ends_at)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{it.location ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {ex ? `${ex.booth_code} · ${ex.company_name}` : "—"}
                      </TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setForm({
                              id: it.id,
                              title: it.title,
                              description: it.description ?? "",
                              location: it.location ?? "",
                              starts_at: fromIso(it.starts_at),
                              ends_at: fromIso(it.ends_at),
                              exhibitor_id: it.exhibitor_id ?? NONE,
                            });
                            setShowForm(true);
                          }}
                        >Edit</Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost">Delete</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete "{it.title}"?</AlertDialogTitle>
                              <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMut.mutate(it.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
