import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import connectDB from "@/lib/db/mongoose";
import { Content } from "@/models";
import mongoose from "mongoose";
import ChatView from "@/components/chat/ChatView";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return { title: "Chat — BrainHistory" };
  await connectDB();
  const doc = await Content.findById(id).select("title").lean() as { title?: string } | null;
  return { title: doc ? `Chat: ${doc.title} — BrainHistory` : "Chat — BrainHistory" };
}

export default async function ChatPage({ params }: Params) {
  const session = await auth();
  const userId  = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/auth/signin");

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();

  await connectDB();

  const doc = await Content.findOne({
    _id:    new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
  })
    .select("_id title contentSize processingStatus url contentType")
    .lean() as {
      _id: mongoose.Types.ObjectId;
      title: string;
      contentSize: string;
      processingStatus: string;
      url: string;
      contentType: string;
    } | null;

  if (!doc) notFound();

  return (
    <ChatView
      contentId={doc._id.toString()}
      title={doc.title}
      url={doc.url}
      contentType={doc.contentType}
      processingStatus={doc.processingStatus}
      isLarge={doc.contentSize === "large"}
    />
  );
}
