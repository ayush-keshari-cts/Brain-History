/**
 * SearchGraph  (LangGraph v1)
 *
 * Flow: embedQuery → vectorSearch → generateAnswer → END
 *
 * vectorSearch already merges Pinecone + MongoDB data, so there is
 * no separate "fetchContentMeta" node — the results come back fully hydrated.
 */

import { Annotation, StateGraph, END }  from "@langchain/langgraph";
import { HumanMessage, SystemMessage }  from "@langchain/core/messages";
import { getEmbeddingService }          from "@/lib/embeddings";
import { vectorSearch, VectorSearchResult } from "./vectorSearch";
import { getLLM }                       from "./llm";
import { SearchQuery, SearchResponse, SearchResultItem, ContentType } from "@/types";

// ─── State ────────────────────────────────────────────────────────────────────

const SearchAnnotation = Annotation.Root({
  query:       Annotation<SearchQuery>({ reducer: (_a, b) => b }),
  queryVector: Annotation<number[]>({ reducer: (_a, b) => b }),
  rawResults:  Annotation<VectorSearchResult[]>({ reducer: (_a, b) => b }),
  results:     Annotation<SearchResultItem[]>({ reducer: (_a, b) => b }),
  aiAnswer:    Annotation<string>({ reducer: (_a, b) => b }),
  latestAiCtx: Annotation<string>({ reducer: (_a, b) => b }),
});

type SearchState = typeof SearchAnnotation.State;

// ─── Nodes ────────────────────────────────────────────────────────────────────

async function embedQueryNode(state: SearchState): Promise<Partial<SearchState>> {
  const vec = await getEmbeddingService().embedQuery(state.query.query);
  return { queryVector: vec };
}

async function vectorSearchNode(state: SearchState): Promise<Partial<SearchState>> {
  // Returns fully hydrated results (Pinecone ANN + MongoDB metadata merged)
  const rawResults = await vectorSearch({
    userId:       state.query.userId,
    queryVector:  state.queryVector,
    limit:        (state.query.limit ?? 10) * 2, // over-fetch for de-dup
    contentTypes: state.query.contentTypes,
  });

  // De-duplicate: best chunk per content item
  const seen = new Map<string, VectorSearchResult>();
  for (const r of rawResults) {
    const existing = seen.get(r.contentId);
    if (!existing || r.score > existing.score) seen.set(r.contentId, r);
  }

  const deduped = [...seen.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, state.query.limit ?? 10);

  // Map to SearchResultItem for the API response
  const results: SearchResultItem[] = deduped.map((r) => ({
    contentId:       r.contentId,
    url:             r.url,
    contentType:     r.contentType as ContentType,
    title:           r.title,
    description:     r.description,
    thumbnail:       r.thumbnail,
    savedAt:         r.savedAt,
    similarityScore: r.score,
    isLarge:         r.isLarge,
    snippet:         r.chunkText.slice(0, 400),
  }));

  return { rawResults, results };
}

async function generateAnswerNode(state: SearchState): Promise<Partial<SearchState>> {
  const llm = getLLM();

  // Use top-5 chunks as context (Pinecone already ranked them by relevance)
  const contextBlocks = state.rawResults
    .slice(0, 5)
    .map((r, i) => `[${i + 1}] Source: ${r.title}\n${r.chunkText}`)
    .join("\n\n---\n\n");

  const [savedRes, latestRes] = await Promise.all([
    // Answer from saved content
    llm.invoke([
      new SystemMessage(
        `You are a helpful assistant with access to the user's personal saved content library.
Answer the query using ONLY the provided context snippets. Be concise.
Cite sources with [1], [2], etc. If the context doesn't answer, say so clearly.`
      ),
      new HumanMessage(`Query: ${state.query.query}\n\nContext:\n${contextBlocks}`),
    ]),

    // Latest AI knowledge beyond what was saved
    llm.invoke([
      new SystemMessage(
        `You are a knowledgeable AI assistant.
The user asked about: "${state.query.query}".
They have saved content about this topic. Briefly describe any LATEST developments,
new research, or important changes on this topic in 2-3 sentences.
If nothing significant to add, say "No major updates since your saved content."`
      ),
      new HumanMessage(state.query.query),
    ]),
  ]);

  return {
    aiAnswer:    String(savedRes.content),
    latestAiCtx: String(latestRes.content),
  };
}

// ─── Graph ────────────────────────────────────────────────────────────────────

const graph = new StateGraph(SearchAnnotation)
  .addNode("embedQuery",   embedQueryNode)
  .addNode("vectorSearch", vectorSearchNode)
  .addNode("generateAnswer", generateAnswerNode)
  .addEdge("__start__",    "embedQuery")
  .addEdge("embedQuery",   "vectorSearch")
  .addEdge("vectorSearch", "generateAnswer")
  .addEdge("generateAnswer", END);

const compiledSearchGraph = graph.compile();

// ─── Public API ───────────────────────────────────────────────────────────────

export async function runSearch(query: SearchQuery): Promise<SearchResponse> {
  const state = await compiledSearchGraph.invoke({
    query,
    queryVector: [],
    rawResults:  [],
    results:     [],
    aiAnswer:    "",
    latestAiCtx: "",
  });

  return {
    results:         state.results,
    total:           state.results.length,
    aiAnswer:        state.aiAnswer,
    latestAiContext: state.latestAiCtx,
  };
}
