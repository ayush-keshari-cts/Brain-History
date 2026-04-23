/**
 * NextAuth v5 (beta) configuration — single source of truth.
 *
 * Import `auth` anywhere server-side to get the session.
 * Import `handlers` only in the [...nextauth] route file.
 *
 * Required env:
 *   NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 *   GITHUB_ID, GITHUB_SECRET
 */

import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import connectDB from "@/lib/db/mongoose";
import { User } from "@/models";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID     ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    GitHubProvider({
      clientId:     process.env.GITHUB_ID     ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, user, account }) {
      if (user && account) {
        await connectDB();

        const dbUser = await User.findOneAndUpdate(
          { email: user.email! },
          {
            $setOnInsert: {
              email: user.email,
              name:  user.name  ?? "",
              image: user.image ?? undefined,
            },
            $addToSet: {
              accounts: {
                provider:          account.provider,
                providerAccountId: account.providerAccountId,
                access_token:      account.access_token,
                refresh_token:     account.refresh_token,
                expires_at:        account.expires_at,
              },
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        ).select("_id");

        token.userId = (dbUser as { _id: { toString(): string } })._id.toString();
      }
      return token;
    },

    async session({ session, token }) {
      if (token.userId) {
        (session.user as { id?: string }).id = token.userId as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/signin",
    error:  "/auth/error",
  },
});
