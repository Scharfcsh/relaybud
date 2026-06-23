import { connectDB } from "@/lib/mongodb";
import { Campaign } from "@/models/Campaign";
import { Template } from "@/models/Template";
import CampaignsClient from "./CampaignsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Campaigns" };

export default async function CampaignsPage() {
  await connectDB();
  const [campaigns, templates] = await Promise.all([
    Campaign.find()
      .populate("templateId", "name event")
      .sort({ createdAt: -1 })
      .lean(),
    Template.find({ isActive: true }, { name: 1, event: 1 })
      .sort({ name: 1 })
      .lean(),
  ]);
  return (
    <CampaignsClient
      initialCampaigns={JSON.parse(JSON.stringify(campaigns))}
      templates={JSON.parse(JSON.stringify(templates))}
    />
  );
}
