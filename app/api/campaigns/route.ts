import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Campaign } from "@/models/Campaign";

export async function GET() {
  try {
    await connectDB();
    const campaigns = await Campaign.find()
      .populate("templateId", "name event")
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json(campaigns);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, description, templateId, scheduledAt } = body;

    if (!name || !templateId) {
      return NextResponse.json(
        { error: "name and templateId are required" },
        { status: 400 }
      );
    }

    const campaign = await Campaign.create({
      name,
      description,
      templateId,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      status: scheduledAt ? "scheduled" : "draft",
    });
    return NextResponse.json(campaign, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
