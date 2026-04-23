import { NextResponse } from "next/server";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { auth } from "@/auth";
import connectDB from "@/lib/db/mongoose";
import { User } from "@/models";

// PATCH /api/user/password
// Body: { newPassword: string, currentPassword?: string }
// - If the account has no password yet, currentPassword is not required.
// - If the account already has a password, currentPassword must be provided and correct.
export async function PATCH(req: Request) {
  const session = await auth();
  const userId  = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { newPassword?: string; currentPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { newPassword, currentPassword } = body;

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findById(userId).select("+password");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // If a password is already set, require the current one to change it
  if (user.password) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Current password is required to set a new one" }, { status: 400 });
    }
    const [salt, storedHash] = (user.password as string).split(":");
    const candidate = scryptSync(currentPassword, salt, 64);
    const valid = timingSafeEqual(Buffer.from(storedHash, "hex"), candidate);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }
  }

  // Hash and store the new password
  const salt    = randomBytes(16).toString("hex");
  const hash    = scryptSync(newPassword, salt, 64).toString("hex");
  user.password = `${salt}:${hash}`;
  await user.save();

  return NextResponse.json({ success: true });
}
