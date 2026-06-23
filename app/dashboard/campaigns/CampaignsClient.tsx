"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Send } from "lucide-react";

interface TemplateSummary {
  _id: string;
  name: string;
  event: string;
}

interface Campaign {
  _id: string;
  name: string;
  description?: string;
  templateId: TemplateSummary | string;
  status: "draft" | "scheduled" | "sent";
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  scheduledAt?: string;
  createdAt: string;
}

const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  draft: "secondary",
  scheduled: "outline",
  sent: "default",
};

export default function CampaignsClient({
  initialCampaigns,
  templates,
}: {
  initialCampaigns: Campaign[];
  templates: TemplateSummary[];
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    templateId: "",
    scheduledAt: "",
  });

  async function handleCreate() {
    setSaving(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({
          ...form,
          scheduledAt: form.scheduledAt || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const newCampaign = await res.json();
      setCampaigns((prev) => [newCampaign, ...prev]);
      setDialogOpen(false);
      setForm({ name: "", description: "", templateId: "", scheduledAt: "" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error creating campaign");
    } finally {
      setSaving(false);
    }
  }

  async function handleSend(id: string) {
    if (!confirm("Send this campaign to all users now?")) return;
    setSending(id);
    try {
      const res = await fetch(`/api/campaigns/${id}/send`, {
        method: "POST",
        headers: { "x-api-key": API_KEY },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`Queued ${data.queued} emails successfully.`);
      setCampaigns((prev) =>
        prev.map((c) =>
          c._id === id
            ? { ...c, status: "sent", recipientCount: data.queued }
            : c
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Bulk email campaigns to all users
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm">
          <Plus className="size-4 mr-1.5" />
          New Campaign
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-10"
                >
                  No campaigns yet.
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((c) => {
                const tmpl =
                  typeof c.templateId === "object" ? c.templateId : null;
                return (
                  <TableRow key={c._id}>
                    <TableCell className="font-medium">
                      <div>{c.name}</div>
                      {c.description && (
                        <div className="text-xs text-muted-foreground">
                          {c.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {tmpl ? (
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {tmpl.event}
                        </code>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[c.status] ?? "secondary"}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{c.recipientCount.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.status !== "sent" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={sending === c._id}
                          onClick={() => handleSend(c._id)}
                        >
                          <Send className="size-3.5 mr-1.5" />
                          {sending === c._id ? "Sending…" : "Send Now"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Campaign</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Campaign name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Summer Sale 2025"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Send offers to all users"
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Template</Label>
              <Select
                value={form.templateId}
                onValueChange={(v) => setForm({ ...form, templateId: v ?? "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      {t.name}{" "}
                      <span className="text-muted-foreground">({t.event})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Schedule for (optional)</Label>
              <Input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) =>
                  setForm({ ...form, scheduledAt: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving || !form.templateId}>
              {saving ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
