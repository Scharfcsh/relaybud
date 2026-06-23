import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUser extends Document {
  email: string;
  firstName?: string;
  onboardedAt: Date;
  metadata: Record<string, unknown>;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  firstName: { type: String },
  onboardedAt: { type: Date, default: () => new Date() },
  metadata: { type: Schema.Types.Mixed, default: {} },
});

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
