import { redirect } from "next/navigation";
import { auth } from "@/auth";
import connectDB from "@/lib/db/mongoose";
import { User } from "@/models";
import ProfileContent from "./ProfileContent";

export const metadata = { title: "Profile — BrainHistory" };

export default async function ProfilePage() {
  const session = await auth();
  const userId  = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/auth/signin");

  await connectDB();
  const user = await User.findById(userId).select("+password").lean();
  if (!user) redirect("/auth/signin");

  const providers = (user.accounts ?? []).map((a) => a.provider);
  const hasPassword = Boolean(user.password);

  return (
    <ProfileContent
      name={user.name}
      email={user.email}
      image={user.image}
      providers={providers}
      hasPassword={hasPassword}
      joinedAt={(user.createdAt as Date).toISOString()}
    />
  );
}
