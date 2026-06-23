"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Plus, Search } from "lucide-react";

interface RelayUser {
  _id: string;
  email: string;
  firstName?: string;
  onboardedAt: string;
  metadata: Record<string, unknown>;
}

const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";

export default function UsersClient({
  initialUsers,
  total,
}: {
  initialUsers: RelayUser[];
  total: number;
}) {
  const [users, setUsers] = useState<RelayUser[]>(initialUsers);
  const [totalCount, setTotalCount] = useState(total);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    metadata: "",
  });

  async function handleSearch() {
    setSearching(true);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/users?${params}`, {
        headers: { "x-api-key": API_KEY },
      });
      const data = await res.json();
      setUsers(data.users);
      setTotalCount(data.pagination.total);
    } finally {
      setSearching(false);
    }
  }

  async function handleCreate() {
    setSaving(true);
    try {
      let parsedMeta: Record<string, unknown> = {};
      if (form.metadata.trim()) {
        parsedMeta = JSON.parse(form.metadata);
      }

      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({
          email: form.email,
          firstName: form.firstName || undefined,
          metadata: parsedMeta,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const newUser = await res.json();
      setUsers((prev) => [newUser, ...prev]);
      setTotalCount((prev) => prev + 1);
      setDialogOpen(false);
      setForm({ email: "", firstName: "", metadata: "" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error creating user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {totalCount.toLocaleString()} tracked users
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm">
          <Plus className="size-4 mr-1.5" />
          Add User
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search by email…"
          className="max-w-xs"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleSearch}
          disabled={searching}
        >
          <Search className="size-3.5 mr-1.5" />
          {searching ? "Searching…" : "Search"}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>First Name</TableHead>
              <TableHead>Onboarded</TableHead>
              <TableHead>Metadata</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground py-10"
                >
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u._id}>
                  <TableCell className="font-mono text-sm">{u.email}</TableCell>
                  <TableCell>{u.firstName ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(u.onboardedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-64 truncate font-mono">
                    {Object.keys(u.metadata).length > 0
                      ? JSON.stringify(u.metadata)
                      : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@example.com"
                type="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label>First name</Label>
              <Input
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
                placeholder="Aman"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Metadata (JSON)</Label>
              <Textarea
                value={form.metadata}
                onChange={(e) => setForm({ ...form, metadata: e.target.value })}
                placeholder='{"plan": "free"}'
                rows={3}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving || !form.email}>
              {saving ? "Saving…" : "Add User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
