import { connectDB } from "@/lib/mongodb";
import { NotificationLog } from "@/models/NotificationLog";
import { Template } from "@/models/Template";
import { Campaign } from "@/models/Campaign";
import { User } from "@/models/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Send,
  AlertCircle,
  Clock,
  FileText,
  Megaphone,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "sent"
      ? "default"
      : status === "failed"
        ? "destructive"
        : "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}

export default async function DashboardPage() {
  await connectDB();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalSent,
    totalFailed,
    totalPending,
    sentToday,
    totalTemplates,
    totalCampaigns,
    totalUsers,
    recent,
  ] = await Promise.all([
    NotificationLog.countDocuments({ status: "sent" }),
    NotificationLog.countDocuments({ status: "failed" }),
    NotificationLog.countDocuments({ status: "pending" }),
    NotificationLog.countDocuments({ status: "sent", createdAt: { $gte: today } }),
    Template.countDocuments({ isActive: true }),
    Campaign.countDocuments(),
    User.countDocuments(),
    NotificationLog.find().sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  const totalAttempted = totalSent + totalFailed;
  const successRate =
    totalAttempted > 0
      ? Math.round((totalSent / totalAttempted) * 1000) / 10
      : 100;

  const stats = [
    {
      label: "Total Sent",
      value: totalSent.toLocaleString(),
      icon: Send,
      description: `${sentToday} today`,
    },
    {
      label: "Failed",
      value: totalFailed.toLocaleString(),
      icon: AlertCircle,
      description: `${successRate}% success rate`,
    },
    {
      label: "Pending",
      value: totalPending.toLocaleString(),
      icon: Clock,
      description: "In queue",
    },
    {
      label: "Templates",
      value: totalTemplates.toLocaleString(),
      icon: FileText,
      description: "Active",
    },
    {
      label: "Campaigns",
      value: totalCampaigns.toLocaleString(),
      icon: Megaphone,
      description: "Total",
    },
    {
      label: "Users",
      value: totalUsers.toLocaleString(),
      icon: Users,
      description: "Tracked",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Notification delivery overview
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Icon className="size-3.5" />
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground py-8"
                  >
                    No notifications yet
                  </TableCell>
                </TableRow>
              ) : (
                recent.map((log) => (
                  <TableRow key={String(log._id)}>
                    <TableCell className="font-mono text-sm">
                      {log.email}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {log.event}
                      </code>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={log.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
