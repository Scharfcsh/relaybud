"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Template" : "New Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Welcome email"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Event type</Label>
                <Input
                  value={form.event}
                  onChange={(e) => setForm({ ...form, event: e.target.value })}
                  placeholder="user.onboarded"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Subject (supports {"{{variables}}"})</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Welcome {{firstName}}!"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Body (HTML, supports {"{{variables}}"})</Label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="<h1>Hello {{firstName}}</h1>"
                rows={8}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Variables (comma-separated)</Label>
              <Input
                value={form.variables}
                onChange={(e) =>
                  setForm({ ...form, variables: e.target.value })
                }
                placeholder="firstName, email, registeredAt"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview — {previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Subject</p>
              <p className="text-sm font-medium border rounded px-3 py-2 bg-muted">
                {previewTemplate?.subject}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Body (HTML)</p>
              <div
                className="border rounded p-3 min-h-32 text-sm overflow-auto max-h-96"
                dangerouslySetInnerHTML={{
                  __html: previewTemplate?.body ?? "",
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
