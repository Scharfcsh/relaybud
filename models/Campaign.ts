import mongoose, { Document, Model, Schema } from "mongoose";

export type CampaignStatus = "draft" | "scheduled" | "sent";

export interface ICampaign extends Document {
  name: string;
  description?: string;
  templateId: mongoose.Types.ObjectId;
  status: CampaignStatus;
  scheduledAt?: Date;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    name: { type: String, required: true },
    description: { type: String },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: "Template",
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "sent"],
      default: "draft",
    },
    scheduledAt: { type: Date },
    recipientCount: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Campaign: Model<ICampaign> =
  mongoose.models.Campaign ??
  mongoose.model<ICampaign>("Campaign", CampaignSchema);
