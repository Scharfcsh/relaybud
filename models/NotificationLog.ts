import mongoose, { Document, Model, Schema } from "mongoose";

export type NotificationStatus = "sent" | "failed" | "pending";

export interface INotificationLog extends Document {
  email: string;
  event: string;
  templateId?: mongoose.Types.ObjectId;
  status: NotificationStatus;
  errorMessage?: string;
  sentAt?: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const NotificationLogSchema = new Schema<INotificationLog>(
  {
    email: { type: String, required: true, index: true },
    event: { type: String, required: true },
    templateId: { type: Schema.Types.ObjectId, ref: "Template" },
    status: {
      type: String,
      enum: ["sent", "failed", "pending"],
      default: "pending",
    },
    errorMessage: { type: String },
    sentAt: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false }
);

NotificationLogSchema.index({ status: 1, createdAt: -1 });
NotificationLogSchema.index({ email: 1, createdAt: -1 });

export const NotificationLog: Model<INotificationLog> =
  mongoose.models.NotificationLog ??
  mongoose.model<INotificationLog>("NotificationLog", NotificationLogSchema);
