"use client";

import { SessionProvider as NextAuthProvider } from "next-auth/react";
import type { Session } from "next-auth";

export default function SessionProvider({
  session,
  children,
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  return <NextAuthProvider session={session}>{children}</NextAuthProvider>;
}
