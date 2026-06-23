import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getRedis } from "@/lib/redis";
import { Campaign } from "@/models/Campaign";
import { Template } from "@/models/Template";
import { User } from "@/models/User";

const CHUNK_SIZE = 100;

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<"/api/campaigns/[id]/send">
) {
  const { id } = await ctx.params;

  try {
    await connectDB();

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const template = await Template.findById(campaign.templateId);
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const redis = getRedis();
    let totalQueued = 0;
    let skip = 0;

    while (true) {
      const users = await User.find(
        {},
        { email: 1, firstName: 1, metadata: 1 }
      )
        .skip(skip)
        .limit(CHUNK_SIZE)
        .lean();

      if (users.length === 0) break;

      const pipeline = redis.pipeline();
      for (const user of users) {
        const payload = JSON.stringify({
          email: user.email,
          type: template.event,
          metadata: {
            firstName: user.firstName,
            ...(user.metadata as object),
          },
          campaignId: id,
          queuedAt: new Date().toISOString(),
        });
        pipeline.rpush("notifications", payload);
      }
      await pipeline.exec();

      totalQueued += users.length;
      skip += CHUNK_SIZE;
    }

    campaign.status = "sent";
    campaign.recipientCount = totalQueued;
    await campaign.save();

    return NextResponse.json({ success: true, queued: totalQueued });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[POST /api/campaigns/[id]/send]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
