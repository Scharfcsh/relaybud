import { connectDB } from "@/lib/mongodb";
import { Template } from "@/models/Template";
import SendClient from "./SendClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bulk Send" };

export default async function SendPage() {
  await connectDB();
  const templates = await Template.find({ isActive: true })
    .sort({ createdAt: -1 })
    .lean();
  return <SendClient initialTemplates={JSON.parse(JSON.stringify(templates))} />;
}
