import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { getFair } from "@/lib/fairs.functions";
import { listExhibitors } from "@/lib/exhibitors.functions";
import {
  getFairMap, upsertMapAsset, deleteMapAsset,
  listHotspots, createHotspot, updateHotspot, deleteHotspot,
  type RectShape,
} from "@/lib/maps.functions";
import { supabase } from "@/integrations/supabase/client";
import { RectHotspotEditor, type EditorHotspot } from "@/components/RectHotspotEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/fairs/$fairId/map")({
  head: () => ({ meta: [{ title: "Floor plan · ExpoAI" }] }),
  component: MapEditorPage,
});

const NONE = "__none__";

function readImageDims(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

function MapEditorPage() {
  const { fairId } = Route.useParams();
  const qc = useQueryClient();

  const getFairFn = useServerFn(getFair);
  const getMapFn = useServerFn(getFairMap);
  const listExFn = useServerFn(listExhibitors);
  const upsertMapFn = useServerFn(upsertMapAsset);
  const deleteMapFn = useServerFn(deleteMapAsset);
  const listHotspotsFn = useServerFn(listHotspots);
  const createHotspotFn = useServerFn(createHotspot);
  const updateHotspotFn = useServerFn(updateHotspot);
  const deleteHotspotFn = useServerFn(deleteHotspot);

  const fairQ = useQuery({ queryKey: ["fair", fairId], queryFn: () => getFairFn({ data: { id: fairId } }) });
  const mapQ = useQuery({ queryKey: ["map", fairId], queryFn: () => getMapFn({ data: { fair_id: fairId } }) });
  const exQ = useQuery({ queryKey: ["exhibitors", fairId], queryFn: () => listExFn({ data: { fair_id: fairId } }) });

  const asset = mapQ.data?.asset ?? null;
  const signedUrl = mapQ.data?.signedUrl ?? null;

  const hotspotsQ = useQuery({
    queryKey: ["hotspots", asset?.id],
    queryFn: () => listHotspotsFn({ data: { map_asset_id: asset!.id } }),
    enabled: !!asset?.id,
  });

  const [uploading, setUploading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingRect, setPendingRect] = useState<RectShape | null>(null);
  const [newBooth, setNewBooth] = useState("");
  const [newExhibitor, setNewExhibitor] = useState<string>(NONE);

  const hotspots: EditorHotspot[] = useMemo(() => {
    return (hotspotsQ.data ?? []).map((h) => ({
      id: h.id,
      booth_code: h.booth_code,
      exhibitor_id: h.exhibitor_id,
      polygon: h.polygon as unknown as RectShape,
    }));
  }, [hotspotsQ.data]);

  const selected = hotspots.find((h) => h.id === selectedId) ?? null;

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !fairQ.data) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Image must be under 15 MB");
      return;
    }
    setUploading(true);
    try {
      const dims = await readImageDims(file);
      const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${fairQ.data.org_id}/${fairId}/map.${ext || "png"}`;

      const { error: upErr } = await supabase.storage
        .from("fair-maps")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      await upsertMapFn({ data: { fair_id: fairId, image_url: path, ...dims } });
      toast.success("Floor plan uploaded");
      qc.invalidateQueries({ queryKey: ["map", fairId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const deleteMapMut = useMutation({
    mutationFn: () => deleteMapFn({ data: { fair_id: fairId } }),
    onSuccess: () => {
      toast.success("Floor plan removed");
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["map", fairId] });
      qc.invalidateQueries({ queryKey: ["hotspots"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createHotspotMut = useMutation({
    mutationFn: (input: { booth_code: string; exhibitor_id: string | null; polygon: RectShape }) =>
      createHotspotFn({ data: { map_asset_id: asset!.id, ...input } }),
    onSuccess: () => {
      toast.success("Hotspot added");
      setPendingRect(null);
      setNewBooth("");
      setNewExhibitor(NONE);
      qc.invalidateQueries({ queryKey: ["hotspots", asset?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateHotspotMut = useMutation({
    mutationFn: (input: { id: string; booth_code: string; exhibitor_id: string | null }) =>
      updateHotspotFn({ data: input }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["hotspots", asset?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteHotspotMut = useMutation({
    mutationFn: (id: string) => deleteHotspotFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Hotspot removed");
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["hotspots", asset?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (fairQ.isLoading || mapQ.isLoading) return <Skeleton className="h-96 w-full" />;
  if (fairQ.error) return <p className="text-sm text-destructive">{(fairQ.error as Error).message}</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/fairs/$fairId" params={{ fairId }} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to fair
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Floor plan</h1>
          <p className="text-sm text-muted-foreground">
            Upload a map image, then click-and-drag to draw booth hotspots.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex">
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            <Button asChild variant={asset ? "outline" : "default"} disabled={uploading}>
              <span>{uploading ? "Uploading…" : asset ? "Replace image" : "Upload floor plan"}</span>
            </Button>
          </label>
          {asset && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Remove map</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove floor plan?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The image and all hotspots for this fair will be deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteMapMut.mutate()}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {!asset || !signedUrl ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No floor plan yet. Upload an image to start placing hotspots.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card>
            <CardContent className="p-3">
              <RectHotspotEditor
                imageUrl={signedUrl}
                hotspots={hotspots}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onCreate={(r) => setPendingRect(r)}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {asset.width}×{asset.height}px · click a booth to edit, drag on empty space to draw a new one.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {pendingRect && (
              <Card>
                <CardHeader><CardTitle>New hotspot</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="nb">Booth code</Label>
                    <Input id="nb" value={newBooth} onChange={(e) => setNewBooth(e.target.value)} maxLength={50} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Exhibitor (optional)</Label>
                    <Select value={newExhibitor} onValueChange={setNewExhibitor}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
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
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        if (!newBooth.trim()) { toast.error("Booth code required"); return; }
                        createHotspotMut.mutate({
                          booth_code: newBooth.trim(),
                          exhibitor_id: newExhibitor === NONE ? null : newExhibitor,
                          polygon: pendingRect,
                        });
                      }}
                      disabled={createHotspotMut.isPending}
                    >
                      Add hotspot
                    </Button>
                    <Button variant="ghost" onClick={() => { setPendingRect(null); setNewBooth(""); }}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {selected && (
              <Card>
                <CardHeader><CardTitle>Edit hotspot</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="eb">Booth code</Label>
                    <Input
                      id="eb"
                      value={selected.booth_code}
                      onChange={(e) =>
                        updateHotspotMut.mutate({
                          id: selected.id,
                          booth_code: e.target.value,
                          exhibitor_id: selected.exhibitor_id,
                        })
                      }
                      maxLength={50}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Exhibitor</Label>
                    <Select
                      value={selected.exhibitor_id ?? NONE}
                      onValueChange={(v) =>
                        updateHotspotMut.mutate({
                          id: selected.id,
                          booth_code: selected.booth_code,
                          exhibitor_id: v === NONE ? null : v,
                        })
                      }
                    >
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
                  <Button
                    variant="destructive"
                    onClick={() => deleteHotspotMut.mutate(selected.id)}
                    disabled={deleteHotspotMut.isPending}
                  >
                    Delete hotspot
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle>Hotspots ({hotspots.length})</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {hotspots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None yet.</p>
                ) : hotspots.map((h) => {
                  const ex = (exQ.data ?? []).find((e) => e.id === h.exhibitor_id);
                  return (
                    <button
                      key={h.id}
                      onClick={() => setSelectedId(h.id)}
                      className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm hover:bg-accent ${
                        h.id === selectedId ? "bg-accent" : ""
                      }`}
                    >
                      <span className="font-mono text-xs">{h.booth_code}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {ex ? ex.company_name : "—"}
                      </span>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
