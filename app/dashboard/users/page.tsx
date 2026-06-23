import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import UsersClient from "./UsersClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Users" };

export default async function UsersPage() {
  await connectDB();
  const [users, total] = await Promise.all([
    User.find().sort({ onboardedAt: -1 }).limit(20).lean(),
    User.countDocuments(),
  ]);
  return (
    <UsersClient
      initialUsers={JSON.parse(JSON.stringify(users))}
      total={total}
    />
  );
}
