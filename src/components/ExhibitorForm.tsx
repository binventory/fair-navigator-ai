import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

export type ExhibitorFormValues = {
  company_name: string;
  booth_code: string;
  category: string;
  description: string;
  website: string;
  logo_url: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  notes: string;
};

const empty: ExhibitorFormValues = {
  company_name: "", booth_code: "", category: "", description: "",
  website: "", logo_url: "",
  contact_name: "", contact_email: "", contact_phone: "", notes: "",
};

export function ExhibitorForm({
  initial, submitLabel, busy, onSubmit,
}: {
  initial?: Partial<ExhibitorFormValues>;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (v: ExhibitorFormValues) => void | Promise<void>;
}) {
  const [v, setV] = useState<ExhibitorFormValues>({ ...empty, ...initial });

  function set<K extends keyof ExhibitorFormValues>(k: K, val: ExhibitorFormValues[K]) {
    setV((prev) => ({ ...prev, [k]: val }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit(v);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="e-name">Company name *</Label>
          <Input id="e-name" required maxLength={200}
            value={v.company_name} onChange={(e) => set("company_name", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="e-booth">Booth code *</Label>
          <Input id="e-booth" required maxLength={50}
            value={v.booth_code} onChange={(e) => set("booth_code", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="e-cat">Category</Label>
          <Input id="e-cat" maxLength={100}
            value={v.category} onChange={(e) => set("category", e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="e-desc">Description</Label>
          <Textarea id="e-desc" rows={3} maxLength={4000}
            value={v.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="e-web">Website</Label>
          <Input id="e-web" type="url" placeholder="https://…"
            value={v.website} onChange={(e) => set("website", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="e-logo">Logo URL</Label>
          <Input id="e-logo" type="url" placeholder="https://…"
            value={v.logo_url} onChange={(e) => set("logo_url", e.target.value)} />
        </div>
      </div>

      <div>
        <Separator className="mb-4" />
        <h3 className="text-sm font-medium">Sales contact (manager-only)</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Not shown on the public visitor site.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="e-cn">Contact name</Label>
            <Input id="e-cn" maxLength={200}
              value={v.contact_name} onChange={(e) => set("contact_name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-ce">Contact email</Label>
            <Input id="e-ce" type="email" maxLength={255}
              value={v.contact_email} onChange={(e) => set("contact_email", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-cp">Contact phone</Label>
            <Input id="e-cp" maxLength={50}
              value={v.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="e-notes">Notes</Label>
            <Textarea id="e-notes" rows={3} maxLength={4000}
              value={v.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
