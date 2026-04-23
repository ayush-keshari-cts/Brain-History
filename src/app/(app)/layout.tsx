import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AppShell from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const user = {
    name:  session.user.name  ?? "User",
    email: session.user.email ?? "",
    image: session.user.image ?? undefined,
  };

  return <AppShell user={user}>{children}</AppShell>;
}
