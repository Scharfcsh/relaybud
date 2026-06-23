import { connectDB } from "@/lib/mongodb";
import { Template } from "@/models/Template";
import TemplatesClient from "./TemplatesClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Templates" };

export default async function TemplatesPage() {
  await connectDB();
  const templates = await Template.find().sort({ createdAt: -1 }).lean();
  return (
    <TemplatesClient initialTemplates={JSON.parse(JSON.stringify(templates))} />
  );
}
