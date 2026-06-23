import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { NotificationLog } from "@/models/NotificationLog";
import { Template } from "@/models/Template";
import { Campaign } from "@/models/Campaign";
import { User } from "@/models/User";

export async function GET() {
  try {
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

    return NextResponse.json({
      totalSent,
      totalFailed,
      totalPending,
      sentToday,
      successRate,
      totalTemplates,
      totalCampaigns,
      totalUsers,
      recent,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
