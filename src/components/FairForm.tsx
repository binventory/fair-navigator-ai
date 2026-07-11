import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type FairFormValues = {
  name: string;
  location: string;
  starts_at: string;
  ends_at: string;
  public_slug: string;
};

export function FairForm({
  initial,
  submitLabel,
  onSubmit,
  busy,
}: {
  initial?: Partial<FairFormValues>;
  submitLabel: string;
  onSubmit: (v: FairFormValues) => void | Promise<void>;
  busy?: boolean;
}) {
  const [v, setV] = useState<FairFormValues>({
    name: initial?.name ?? "",
    location: initial?.location ?? "",
    starts_at: initial?.starts_at ?? "",
    ends_at: initial?.ends_at ?? "",
    public_slug: initial?.public_slug ?? "",
  });

  function set<K extends keyof FairFormValues>(k: K, val: FairFormValues[K]) {
    setV((prev) => ({ ...prev, [k]: val }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit(v);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="f-name">Name *</Label>
        <Input id="f-name" required maxLength={120}
          value={v.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="f-loc">Location</Label>
        <Input id="f-loc" maxLength={200}
          value={v.location} onChange={(e) => set("location", e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="f-start">Starts</Label>
          <Input id="f-start" type="datetime-local"
            value={v.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="f-end">Ends</Label>
          <Input id="f-end" type="datetime-local"
            value={v.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="f-slug">Public slug</Label>
        <Input id="f-slug" placeholder="messe-2026" maxLength={60}
          value={v.public_slug}
          onChange={(e) => set("public_slug", e.target.value.toLowerCase())} />
        <p className="text-xs text-muted-foreground">
          Lowercase letters, digits, hyphens. Required to publish.
        </p>
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}

export function toIsoOrNull(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function fromIsoToLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}
