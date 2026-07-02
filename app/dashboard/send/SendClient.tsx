"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  Send,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";
const NONE = "__none__";

interface Template {
  _id: string;
  name: string;
  event: string;
  subject: string;
  body: string;
  variables: string[];
  isActive: boolean;
}

type Row = Record<string, unknown>;

interface SendResult {
  email: string;
  status: "sent" | "failed";
  error?: string;
}

const IFRAME_SHELL = (inner: string) =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0}body{padding:36px 48px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.65;color:#111827;background:#fff}*{box-sizing:border-box}a{color:#6366f1}h1,h2,h3{line-height:1.3;margin-top:0}img{max-width:100%;height:auto}</style></head><body>${inner}</body></html>`;

// Lightweight {{ token }} substitution for the live preview only.
// Actual sending renders full Handlebars server-side.
function previewRender(tpl: string, data: Row): string {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
    const v = data[key];
    return v === undefined || v === null ? "" : String(v);
  });
}

export default function SendClient({
  initialTemplates,
}: {
  initialTemplates: Template[];
}) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [parseError, setParseError] = useState("");

  const [templateId, setTemplateId] = useState("");
  const [emailColumn, setEmailColumn] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    event: "",
    subject: "",
    body: "",
    variables: "",
  });
  const [savingTemplate, setSavingTemplate] = useState(false);

  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<{
    sent: number;
    failed: number;
    results: SendResult[];
  } | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t._id === templateId) ?? null,
    [templates, templateId]
  );

  // Auto-map template variables + email column to sheet columns by name.
  function autoMap(template: Template | null, cols: string[]) {
    if (!template) return;
    const findCol = (name: string) =>
      cols.find((c) => c.toLowerCase() === name.toLowerCase()) ?? NONE;
    const next: Record<string, string> = {};
    for (const v of template.variables) next[v] = findCol(v);
    setMapping(next);
    const emailGuess =
      cols.find((c) => c.toLowerCase() === "email") ??
      cols.find((c) => c.toLowerCase().includes("email")) ??
      "";
    setEmailColumn(emailGuess);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError("");
    setResults(null);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      if (!sheet) throw new Error("The file has no sheets.");
      const aoa = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        blankrows: false,
      }) as unknown[][];
      const headerRow = (aoa[0] ?? []).map((h) => String(h).trim());
      const cols = headerRow.filter(Boolean);
      if (cols.length === 0) throw new Error("No column headers found in the first row.");
      const objs = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Row[];

      setFileName(file.name);
      setColumns(cols);
      setRows(objs);
      autoMap(selectedTemplate, cols);
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : "Could not read that file."
      );
      setFileName("");
      setColumns([]);
      setRows([]);
    }
  }

  function handleSelectTemplate(id: string) {
    setTemplateId(id);
    setResults(null);
    const t = templates.find((tpl) => tpl._id === id) ?? null;
    autoMap(t, columns);
  }

  // Build the per-row metadata object sent to the API.
  function buildRecipient(row: Row): Row {
    const meta: Row = { ...row };
    if (selectedTemplate) {
      for (const v of selectedTemplate.variables) {
        const col = mapping[v];
        if (col && col !== NONE) meta[v] = row[col];
      }
    }
    const emailVal = emailColumn ? row[emailColumn] : "";
    meta.email =
      typeof emailVal === "string" ? emailVal.trim() : String(emailVal ?? "");
    return meta;
  }

  const recipients = useMemo(
    () => rows.map(buildRecipient),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, mapping, emailColumn, selectedTemplate]
  );

  const missingEmailCount = useMemo(
    () =>
      recipients.filter(
        (r) => !r.email || typeof r.email !== "string" || !r.email
      ).length,
    [recipients]
  );

  const canSend =
    !!selectedTemplate &&
    rows.length > 0 &&
    !!emailColumn &&
    recipients.length - missingEmailCount > 0 &&
    !sending;

  async function handleCreateTemplate() {
    setSavingTemplate(true);
    try {
      const payload = {
        ...createForm,
        variables: createForm.variables
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      };
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const created: Template = await res.json();
      setTemplates((prev) => [created, ...prev]);
      setCreating(false);
      setCreateForm({ name: "", event: "", subject: "", body: "", variables: "" });
      handleSelectTemplate(created._id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create template");
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleSend() {
    if (!selectedTemplate) return;
    const valid = recipients.filter(
      (r) => typeof r.email === "string" && r.email
    );
    if (valid.length === 0) {
      alert("No recipients with a valid email address.");
      return;
    }
    if (
      !confirm(
        `Send "${selectedTemplate.name}" to ${valid.length} recipient(s)?` +
          (missingEmailCount
            ? `\n\n${missingEmailCount} row(s) without an email will be skipped.`
            : "")
      )
    )
      return;

    setSending(true);
    setResults(null);
    try {
      const res = await fetch("/api/send-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
        body: JSON.stringify({
          templateId: selectedTemplate._id,
          recipients,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setResults(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  const previewData = recipients[0] ?? {};
  const previewSubject = selectedTemplate
    ? previewRender(selectedTemplate.subject, previewData)
    : "";
  const previewBody = selectedTemplate
    ? previewRender(selectedTemplate.body, previewData)
    : "";

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bulk Send</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a spreadsheet of recipients, pick a template, map the columns,
          and send.
        </p>
      </div>

      {/* Step 1 — Upload */}
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            1
          </span>
          <h2 className="font-semibold">Upload recipients</h2>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-center transition-colors hover:bg-accent/40"
        >
          <Upload className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">
            {fileName || "Click to choose an Excel or CSV file"}
          </p>
          <p className="text-xs text-muted-foreground">
            .xlsx, .xls or .csv — the first row must be column headers
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFile}
          />
        </div>

        {parseError && (
          <p className="flex items-center gap-1.5 text-sm text-destructive">
            <AlertTriangle className="size-4" /> {parseError}
          </p>
        )}

        {rows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="size-4 text-muted-foreground" />
              <span className="font-medium">{rows.length}</span> row(s),{" "}
              <span className="font-medium">{columns.length}</span> column(s)
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((c) => (
                      <TableHead key={c} className="whitespace-nowrap">
                        {c}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 5).map((r, i) => (
                    <TableRow key={i}>
                      {columns.map((c) => (
                        <TableCell key={c} className="whitespace-nowrap">
                          {String(r[c] ?? "")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {rows.length > 5 && (
              <p className="text-xs text-muted-foreground">
                Showing first 5 of {rows.length} rows.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Step 2 — Template */}
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            2
          </span>
          <h2 className="font-semibold">Choose a template</h2>
        </div>

        {!creating ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-64 space-y-1.5">
              <Label>Template</Label>
              <Select
                value={templateId}
                onValueChange={(v) => handleSelectTemplate(v ?? "")}
              >
                <SelectTrigger className="w-full">
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
            <Button variant="outline" onClick={() => setCreating(true)}>
              <Plus className="size-4" /> New template
            </Button>
          </div>
        ) : (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">New template</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCreating(false)}
              >
                <X className="size-4" /> Cancel
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  placeholder="Welcome email"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Event key</Label>
                <Input
                  value={createForm.event}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, event: e.target.value })
                  }
                  placeholder="welcome.email"
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input
                value={createForm.subject}
                onChange={(e) =>
                  setCreateForm({ ...createForm, subject: e.target.value })
                }
                placeholder="Hello {{name}}!"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Variables (comma-separated)</Label>
              <Input
                value={createForm.variables}
                onChange={(e) =>
                  setCreateForm({ ...createForm, variables: e.target.value })
                }
                placeholder="name, email"
              />
            </div>
            <div className="space-y-1.5">
              <Label>HTML body</Label>
              <textarea
                value={createForm.body}
                onChange={(e) =>
                  setCreateForm({ ...createForm, body: e.target.value })
                }
                placeholder={"<h1>Hello {{name}}</h1>"}
                className="h-40 w-full resize-none rounded-lg border bg-background p-3 font-mono text-sm outline-none focus-visible:border-ring"
                spellCheck={false}
              />
            </div>
            <Button
              onClick={handleCreateTemplate}
              disabled={
                savingTemplate ||
                !createForm.name ||
                !createForm.event ||
                !createForm.subject ||
                !createForm.body
              }
            >
              {savingTemplate ? "Saving…" : "Create & use"}
            </Button>
          </div>
        )}
      </section>

      {/* Step 3 — Map columns */}
      {selectedTemplate && rows.length > 0 && (
        <section className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              3
            </span>
            <h2 className="font-semibold">Map columns</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>
                Email column <span className="text-destructive">*</span>
              </Label>
              <Select
                value={emailColumn}
                onValueChange={(v) => setEmailColumn(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Which column holds the email?" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate.variables.map((v) => (
              <div key={v} className="space-y-1.5">
                <Label>
                  <code className="font-mono">{`{{${v}}}`}</code>
                </Label>
                <Select
                  value={mapping[v] || NONE}
                  onValueChange={(val) =>
                    setMapping((m) => ({ ...m, [v]: val ?? NONE }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>
                      <span className="text-muted-foreground">— none —</span>
                    </SelectItem>
                    {columns.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {missingEmailCount > 0 && (
            <p className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-500">
              <AlertTriangle className="size-4" />
              {missingEmailCount} row(s) have no email in the selected column and
              will be skipped.
            </p>
          )}

          {/* Live preview of the first recipient */}
          <div className="space-y-2 border-t pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Preview — first recipient
            </p>
            <div className="rounded-lg border bg-background px-3 py-2 text-sm">
              <span className="text-muted-foreground">Subject: </span>
              {previewSubject || (
                <span className="italic text-muted-foreground">No subject</span>
              )}
            </div>
            <div className="overflow-hidden rounded-xl border bg-white">
              <iframe
                key={previewBody}
                srcDoc={IFRAME_SHELL(
                  previewBody ||
                    "<p style='color:#9ca3af;font-style:italic'>Nothing to preview.</p>"
                )}
                className="block w-full border-0"
                style={{ minHeight: "320px" }}
                sandbox="allow-same-origin"
                title="Email preview"
                onLoad={(e) => {
                  const el = e.currentTarget;
                  const h = el.contentDocument?.body?.scrollHeight;
                  if (h) el.style.height = h + 48 + "px";
                }}
              />
            </div>
          </div>
        </section>
      )}

      {/* Step 4 — Send */}
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              4
            </span>
            <h2 className="font-semibold">Send</h2>
          </div>
          <Button size="lg" onClick={handleSend} disabled={!canSend}>
            <Send className="size-4" />
            {sending
              ? "Sending…"
              : `Send to ${
                  recipients.length - missingEmailCount || 0
                } recipient(s)`}
          </Button>
        </div>

        {results && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-600">
                <CheckCircle2 className="size-3.5" /> {results.sent} sent
              </Badge>
              {results.failed > 0 && (
                <Badge variant="destructive" className="gap-1.5">
                  <AlertTriangle className="size-3.5" /> {results.failed} failed
                </Badge>
              )}
            </div>
            {results.failed > 0 && (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.results
                      .filter((r) => r.status === "failed")
                      .map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="whitespace-nowrap">
                            {r.email}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {r.error}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
