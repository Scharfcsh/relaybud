import mongoose, { Document, Model, Schema } from "mongoose";

export interface ITemplate extends Document {
  name: string;
  event: string;
  subject: string;
  body: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateSchema = new Schema<ITemplate>(
  {
    name: { type: String, required: true },
    event: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    variables: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

TemplateSchema.index({ event: 1, isActive: 1 });

export const Template: Model<ITemplate> =
  mongoose.models.Template ??
  mongoose.model<ITemplate>("Template", TemplateSchema);
