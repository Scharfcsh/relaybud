"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

interface NotificationLog {
  _id: string;
  email: string;
  event: string;
  status: "sent" | "failed" | "pending";
  errorMessage?: string;
  sentAt?: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";

export default function HistoryPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    email: "",
    status: "all",
    from: "",
    to: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const fetchLogs = useCallback(
    async (page: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: "20" });
        if (appliedFilters.email) params.set("email", appliedFilters.email);
        if (appliedFilters.status && appliedFilters.status !== "all")
          params.set("status", appliedFilters.status);
        if (appliedFilters.from) params.set("from", appliedFilters.from);
        if (appliedFilters.to) params.set("to", appliedFilters.to);

        const res = await fetch(`/api/history?${params}`, {
          headers: { "x-api-key": API_KEY },
        });
        const data = await res.json();
        setLogs(data.logs);
        setPagination(data.pagination);
      } finally {
        setLoading(false);
      }
    },
    [appliedFilters]
  );

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  function applyFilters() {
    setAppliedFilters(filters);
  }

  const statusVariant = (
    s: string
  ): "default" | "destructive" | "secondary" => {
    if (s === "sent") return "default";
    if (s === "failed") return "destructive";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">History</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Full notification log
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1.5">
          <Label className="text-xs">Email</Label>
          <Input
            value={filters.email}
            onChange={(e) => setFilters({ ...filters, email: e.target.value })}
            placeholder="Search email…"
            className="w-52"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Status</Label>
          <Select
            value={filters.status}
            onValueChange={(v) => setFilters({ ...filters, status: v ?? "all" })}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            className="w-40"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">To</Label>
          <Input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            className="w-40"
          />
        </div>
        <Button onClick={applyFilters} size="sm">
          <Search className="size-3.5 mr-1.5" />
          Apply
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const reset = { email: "", status: "all", from: "", to: "" };
            setFilters(reset);
            setAppliedFilters(reset);
          }}
        >
          Reset
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        {pagination?.total} results
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Error</TableHead>
              <TableHead>Sent at</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : logs?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-10"
                >
                  No results
                </TableCell>
              </TableRow>
            ) : (
              logs?.map((log) => (
                <TableRow key={log._id}>
                  <TableCell className="font-mono text-sm">
                    {log.email}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {log.event}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(log.status)}>
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-destructive max-w-48 truncate">
                    {log.errorMessage ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {log.sentAt ? new Date(log.sentAt).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination?.pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.pages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchLogs(pagination.page - 1)}
            >
              <ChevronLeft className="size-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchLogs(pagination.page + 1)}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
