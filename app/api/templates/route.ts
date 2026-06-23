import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Template } from "@/models/Template";

export async function GET() {
  try {
    await connectDB();
    const templates = await Template.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(templates);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const {
      name,
      event,
      subject,
      body: templateBody,
      variables = [],
      isActive = true,
    } = body;

    if (!name || !event || !subject || !templateBody) {
      return NextResponse.json(
        { error: "name, event, subject, body are required" },
        { status: 400 }
      );
    }

    const template = await Template.create({
      name,
      event,
      subject,
      body: templateBody,
      variables,
      isActive,
    });
    return NextResponse.json(template, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
