import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getRedis } from "@/lib/redis";
import { User } from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, metadata = {} } = body as {
      type: string;
      metadata?: Record<string, unknown>;
    };

    const email =
      typeof metadata.email === "string" ? metadata.email : body.email;

    if (!email || !type) {
      return NextResponse.json(
        { error: "type and metadata.email are required" },
        { status: 400 }
      );
    }

    await connectDB();
    await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        $setOnInsert: {
          email: email.toLowerCase(),
          onboardedAt: new Date(),
        },
        $set: {
          metadata,
          ...(metadata.firstName
            ? { firstName: metadata.firstName as string }
            : {}),
        },
      },
      { upsert: true, returnDocument: 'after' }  // Changed from `new: true`
    );

    const redis = getRedis();
    const payload = JSON.stringify({
      email: email.toLowerCase(),
      type,
      metadata,
      queuedAt: new Date().toISOString(),
    });
    await redis.rpush("notifications", payload);

    return NextResponse.json({ success: true, queued: true }, { status: 202 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[POST /api/events]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}