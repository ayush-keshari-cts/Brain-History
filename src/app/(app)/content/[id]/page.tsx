import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import connectDB from "@/lib/db/mongoose";
import { Content } from "@/models";
import mongoose from "mongoose";
import ContentDetailView from "@/components/content/ContentDetailView";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return { title: "Not Found" };
  await connectDB();
  const doc = await Content.findById(id).select("title").lean() as { title?: string } | null;
  return { title: doc ? `${doc.title} — BrainHistory` : "Content — BrainHistory" };
}

export default async function ContentDetailPage({ params }: Params) {
  const session = await auth();
  const userId  = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/auth/signin");

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();

  await connectDB();

  const doc = await Content.findOne({
    _id:    new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
  }).lean() as Record<string, unknown> | null;

  if (!doc) notFound();

  // Serialize (dates → strings, ObjectIds → strings)
  const content = JSON.parse(JSON.stringify(doc));

  return <ContentDetailView content={content} />;
}
