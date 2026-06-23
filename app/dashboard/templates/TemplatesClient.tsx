"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Eye, Code2, MonitorPlay } from "lucide-react";
import { useRouter } from "next/navigation";

interface Template {
  _id: string;
  name: string;
  event: string;
  subject: string;
  body: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
}

interface FormData {
  name: string;
  event: string;
  subject: string;
  body: string;
  variables: string;
  isActive: boolean;
}

const EMPTY_FORM: FormData = {
  name: "",
  event: "",
  subject: "",
  body: "",
  variables: "",
  isActive: true,
};

const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";

function EditModal({
  editing,
  form,
  setForm,
  saving,
  onSave,
  onClose,
}: {
  editing: Template | null;
  form: FormData;
  setForm: (f: FormData) => void;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<string>("code");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const previewSrc = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0}body{padding:36px 48px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.65;color:#111827;background:#fff}*{box-sizing:border-box}a{color:#6366f1}h1,h2,h3{line-height:1.3;margin-top:0}img{max-width:100%;height:auto}</style></head><body>${form.body || "<p style='color:#9ca3af;font-style:italic'>Nothing to preview yet.</p>"}</body></html>`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-[92vw] h-[90vh] bg-background rounded-xl shadow-2xl border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b shrink-0">
          <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Pencil className="size-4 text-primary" />
          </div>
          <p className="flex-1 text-base font-semibold">
            {editing ? `Edit — ${editing.name}` : "New Template"}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={onSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create"}
            </Button>
          </div>
          <button
            onClick={onClose}
            className="ml-1 shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path
                d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        {/* Split body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: metadata fields */}
          <div className="w-72 shrink-0 border-r bg-muted/30 overflow-y-auto p-5 space-y-5">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Name
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Welcome email"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Event type
              </Label>
              <Input
                value={form.event}
                onChange={(e) => setForm({ ...form, event: e.target.value })}
                placeholder="user.onboarded"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Subject
              </Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Welcome {{firstName}}!"
              />
              <p className="text-[11px] text-muted-foreground">
                Supports <code className="font-mono bg-muted px-1 rounded">{"{{variables}}"}</code>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Variables
              </Label>
              <Input
                value={form.variables}
                onChange={(e) => setForm({ ...form, variables: e.target.value })}
                placeholder="firstName, email, companyName"
              />
              <p className="text-[11px] text-muted-foreground">Comma-separated</p>
            </div>
          </div>

          {/* Right: code editor + preview */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Tabs
              value={tab}
              onValueChange={setTab}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="shrink-0 border-b px-4 py-2 flex items-center gap-3">
                <TabsList>
                  <TabsTrigger value="code" className="gap-1.5">
                    <Code2 className="size-3.5" />
                    Code
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="gap-1.5">
                    <MonitorPlay className="size-3.5" />
                    Preview
                  </TabsTrigger>
                </TabsList>
                <p className="text-xs text-muted-foreground">HTML body</p>
              </div>

              <TabsContent value="code" className="flex-1 overflow-hidden m-0 p-0">
                <textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder={"<h1>Hello {{firstName}}</h1>"}
                  className="w-full h-full resize-none font-mono text-sm p-4 bg-background outline-none border-0"
                  spellCheck={false}
                />
              </TabsContent>

              <TabsContent value="preview" className="flex-1 overflow-hidden m-0 p-0 bg-zinc-100 dark:bg-zinc-900">
                <div className="h-full overflow-auto p-8">
                  <div className="mx-auto max-w-2xl bg-white rounded-xl shadow-md border overflow-hidden">
                    <iframe
                      srcDoc={previewSrc}
                      className="w-full border-0 block"
                      style={{ minHeight: "480px" }}
                      sandbox="allow-same-origin"
                      title="Template body preview"
                      onLoad={(e) => {
                        const el = e.currentTarget;
                        const h = el.contentDocument?.body?.scrollHeight;
                        if (h) el.style.height = h + 64 + "px";
                      }}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewModal({
  template,
  onClose,
}: {
  template: Template;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal — 90vw, no max-w restriction */}
      <div className="relative z-10 w-[90vw] h-[85vh] bg-background rounded-xl shadow-2xl border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b shrink-0">
          <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Eye className="size-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold leading-tight truncate">{template.name}</p>
            <code className="text-xs text-muted-foreground font-mono">{template.event}</code>
          </div>
          <Badge variant={template.isActive ? "default" : "secondary"} className="shrink-0">
            {template.isActive ? "Active" : "Inactive"}
          </Badge>
          <button
            onClick={onClose}
            className="ml-2 shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path
                d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        {/* Split body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: metadata */}
          <div className="w-72 shrink-0 border-r bg-muted/30 overflow-y-auto">
            <div className="p-5 space-y-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                  Subject
                </p>
                <p className="text-sm leading-snug">
                  {template.subject || (
                    <span className="text-muted-foreground italic">No subject</span>
                  )}
                </p>
              </div>

              <div className="border-t pt-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  Variables
                </p>
                {template.variables?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {template.variables.map((v) => (
                      <code
                        key={v}
                        className="text-xs bg-background border rounded px-1.5 py-0.5 font-mono"
                      >
                        {`{{${v}}}`}
                      </code>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">None</p>
                )}
              </div>

              <div className="border-t pt-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                  Created
                </p>
                <p className="text-sm text-muted-foreground">
                  {new Date(template.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              <div className="border-t pt-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  HTML Source
                </p>
                <pre className="text-[10px] font-mono bg-background border rounded p-2 overflow-x-auto whitespace-pre-wrap break-all text-muted-foreground leading-relaxed max-h-52">
                  {template.body || "—"}
                </pre>
              </div>
            </div>
          </div>

          {/* Right: rendered email */}
          <div className="flex-1 flex flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-900">
            <div className="shrink-0 bg-background border-b px-5 py-2.5 flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground shrink-0">Subject:</span>
              <span className="text-sm truncate">{template.subject}</span>
            </div>
            <div className="flex-1 overflow-auto p-8">
              <div className="mx-auto max-w-2xl bg-white rounded-xl shadow-md border overflow-hidden">
                <iframe
                  key={template._id}
                  srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0}body{padding:36px 48px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.65;color:#111827;background:#fff}*{box-sizing:border-box}a{color:#6366f1}h1,h2,h3{line-height:1.3;margin-top:0}img{max-width:100%;height:auto}</style></head><body>${template.body || "<p style='color:#9ca3af;font-style:italic'>No HTML body.</p>"}</body></html>`}
                  className="w-full border-0 block"
                  style={{ minHeight: "480px" }}
                  sandbox="allow-same-origin"
                  title="Email body preview"
                  onLoad={(e) => {
                    const el = e.currentTarget;
                    const h = el.contentDocument?.body?.scrollHeight;
                    if (h) el.style.height = h + 64 + "px";
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TemplatesClient({
  initialTemplates,
}: {
  initialTemplates: Template[];
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(t: Template) {
    setEditing(t);
    setForm({
      name: t.name,
      event: t.event,
      subject: t.subject,
      body: t.body,
      variables: t.variables.join(", "),
      isActive: t.isActive,
    });
    setDialogOpen(true);
  }

  function openPreview(t: Template) {
    setPreviewTemplate(t);
    setPreviewOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        variables: form.variables
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      };

      const res = editing
        ? await fetch(`/api/templates/${editing._id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": API_KEY,
            },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/templates", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": API_KEY,
            },
            body: JSON.stringify(payload),
          });

      if (!res.ok) throw new Error(await res.text());
      setDialogOpen(false);
      router.refresh();
      const data = await fetch("/api/templates", {
        headers: { "x-api-key": API_KEY },
      }).then((r) => r.json());
      setTemplates(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error saving template");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template?")) return;
    try {
      await fetch(`/api/templates/${id}`, {
        method: "DELETE",
        headers: { "x-api-key": API_KEY },
      });
      setTemplates((prev) => prev.filter((t) => t._id !== id));
    } catch {
      alert("Failed to delete template");
    }
  }

  async function handleToggleActive(t: Template) {
    try {
      await fetch(`/api/templates/${t._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({ isActive: !t.isActive }),
      });
      setTemplates((prev) =>
        prev.map((tmpl) =>
          tmpl._id === t._id ? { ...tmpl, isActive: !t.isActive } : tmpl
        )
      );
    } catch {
      alert("Failed to toggle template");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage email templates for notification events
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="size-4 mr-1.5" />
          New Template
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Variables</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-10"
                >
                  No templates yet. Create your first one.
                </TableCell>
              </TableRow>
            ) : (
              templates.map((t) => (
                <TableRow key={t._id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {t.event}
                    </code>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {t.variables.join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    <button onClick={() => handleToggleActive(t)}>
                      <Badge variant={t.isActive ? "default" : "secondary"}>
                        {t.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openPreview(t)}
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(t)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(t._id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit — custom full-width overlay */}
      {dialogOpen && (
        <EditModal
          editing={editing}
          form={form}
          setForm={setForm}
          saving={saving}
          onSave={handleSave}
          onClose={() => setDialogOpen(false)}
        />
      )}

      {/* Preview — custom full-width overlay, no DialogContent constraints */}
      {previewOpen && previewTemplate && (
        <PreviewModal
          template={previewTemplate}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}
