/**
 * ChatGraph  (LangGraph v1)
 *
 * Chat with a single large saved content item (PDF, long article).
 *
 * Flow: embedMessage → vectorSearchInDoc → buildContext → generateReply → END
 *
 * Pinecone: per-document vector search via contentId filter
 * MongoDB:  load/save ChatSession, fetch content title
 */

import { Annotation, StateGraph, END }       from "@langchain/langgraph";
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { getEmbeddingService }               from "@/lib/embeddings";
import { vectorSearch, VectorSearchResult }  from "./vectorSearch";
import { getLLM }                            from "./llm";
import connectDB                             from "@/lib/db/mongoose";
import { ChatSession, Content }              from "@/models";
import { ChatRequest, ChatResponse }         from "@/types";
import mongoose                              from "mongoose";

// ─── State ────────────────────────────────────────────────────────────────────

const ChatAnnotation = Annotation.Root({
  request:        Annotation<ChatRequest>({ reducer: (_a, b) => b }),
  sessionId:      Annotation<string>({ reducer: (_a, b) => b }),
  messageVec:     Annotation<number[]>({ reducer: (_a, b) => b }),
  chunks:         Annotation<VectorSearchResult[]>({ reducer: (_a, b) => b }),
  context:        Annotation<string>({ reducer: (_a, b) => b }),
  reply:          Annotation<string>({ reducer: (_a, b) => b }),
  sourceChunkIds: Annotation<string[]>({ reducer: (_a, b) => b }),
});

type ChatState = typeof ChatAnnotation.State;

const SUMMARY_EVERY_N_TURNS = 10;

// ─── Nodes ────────────────────────────────────────────────────────────────────

async function embedMessageNode(state: ChatState): Promise<Partial<ChatState>> {
  const vec = await getEmbeddingService().embedQuery(state.request.message);
  return { messageVec: vec };
}

async function vectorSearchInDocNode(state: ChatState): Promise<Partial<ChatState>> {
  // Pinecone filters by both userId (namespace) and contentId (metadata filter)
  const chunks = await vectorSearch({
    userId:      state.request.userId,
    queryVector: state.messageVec,
    limit:       6,
    contentId:   state.request.contentId,
  });
  return { chunks };
}

function buildContextNode(state: ChatState): Partial<ChatState> {
  const context        = state.chunks.map((c, i) => `[${i + 1}] ${c.chunkText}`).join("\n\n---\n\n");
  const sourceChunkIds = state.chunks.map((c) => c.vectorId);
  return { context, sourceChunkIds };
}

async function generateReplyNode(state: ChatState): Promise<Partial<ChatState>> {
  await connectDB();

  const llm = getLLM();

  // Load or create session
  let chatSession = state.request.sessionId
    ? await ChatSession.findById(state.request.sessionId)
    : null;

  if (!chatSession) {
    chatSession = new ChatSession({
      userId:    new mongoose.Types.ObjectId(state.request.userId),
      contentId: new mongoose.Types.ObjectId(state.request.contentId),
      messages:  [],
    });
  }

  // History (last 10 turns)
  const history: BaseMessage[] = chatSession.messages.slice(-10).map(
    (m: { role: string; content: string }) =>
      m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
  );

  const contentDoc = await Content.findById(state.request.contentId)
    .select("title contentType")
    .lean() as { title?: string; contentType?: string } | null;

  const response = await llm.invoke([
    new SystemMessage(
      `You are an AI assistant helping the user understand a saved ${contentDoc?.contentType ?? "document"} titled "${contentDoc?.title ?? "unknown"}".
Answer using ONLY the context excerpts. Cite [1], [2], etc.
If the context doesn't contain the answer, say "I couldn't find that in this document."
${chatSession.summary ? `\nConversation so far:\n${chatSession.summary}` : ""}`
    ),
    ...history,
    new HumanMessage(`Context:\n${state.context}\n\nQuestion: ${state.request.message}`),
  ]);

  const reply = String(response.content);

  // Persist messages
  chatSession.messages.push({ role: "user",      content: state.request.message, createdAt: new Date() });
  chatSession.messages.push({ role: "assistant", content: reply,                 createdAt: new Date() });

  // Periodic summarization
  if (chatSession.messages.length % SUMMARY_EVERY_N_TURNS === 0) {
    const summaryRes = await getLLM().invoke([
      new SystemMessage("Summarise this conversation in 3-5 sentences."),
      ...chatSession.messages.map((m: { role: string; content: string }) =>
        m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
      ),
    ]);
    chatSession.summary = String(summaryRes.content);
  }

  await chatSession.save();

  return {
    reply,
    sessionId: (chatSession._id as mongoose.Types.ObjectId).toString(),
  };
}

// ─── Graph ────────────────────────────────────────────────────────────────────

const graph = new StateGraph(ChatAnnotation)
  .addNode("embedMessage",      embedMessageNode)
  .addNode("vectorSearchInDoc", vectorSearchInDocNode)
  .addNode("buildContext",      buildContextNode)
  .addNode("generateReply",     generateReplyNode)
  .addEdge("__start__",         "embedMessage")
  .addEdge("embedMessage",      "vectorSearchInDoc")
  .addEdge("vectorSearchInDoc", "buildContext")
  .addEdge("buildContext",      "generateReply")
  .addEdge("generateReply",     END);

const compiledChatGraph = graph.compile();

// ─── Public API ───────────────────────────────────────────────────────────────

export async function runChat(request: ChatRequest): Promise<ChatResponse> {
  const state = await compiledChatGraph.invoke({
    request,
    sessionId:      request.sessionId ?? "",
    messageVec:     [],
    chunks:         [],
    context:        "",
    reply:          "",
    sourceChunkIds: [],
  });

  return {
    sessionId:    state.sessionId,
    answer:       state.reply,
    sourceChunks: (state.chunks as VectorSearchResult[]).map((c) => c.chunkText),
  };
}
