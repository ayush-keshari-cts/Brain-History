/**
 * OpenAPI 3.0 specification for BrainHistory API
 * Served at GET /api/swagger-spec
 * Rendered at /api-docs (Swagger UI)
 */

export const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "BrainHistory API",
    version: "1.0.0",
    description:
      "Personal content memory app — save any URL, search semantically, chat with large documents (PDFs). Powered by MongoDB + Pinecone + LangGraph.",
    contact: { name: "BrainHistory", email: "ayush.keshari@cognizant.com" },
  },
  servers: [
    { url: "http://localhost:3000", description: "Local development" },
    { url: "https://brainhistory.app", description: "Production" },
  ],
  tags: [
    { name: "Content", description: "Save and manage URLs" },
    { name: "Search",  description: "Semantic RAG search over saved content" },
    { name: "Chat",    description: "Chat with large saved content (PDF mode)" },
    { name: "Auth",    description: "NextAuth authentication" },
  ],

  // ─── Reusable schemas ───────────────────────────────────────────────────────
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in:   "cookie",
        name: "next-auth.session-token",
        description:
          "Session cookie set by NextAuth after sign-in. Use /auth/signin to authenticate.",
      },
    },
    schemas: {

      // ── Enums ────────────────────────────────────────────────────────────────
      ContentType: {
        type: "string",
        enum: [
          "tweet", "youtube_video", "youtube_music", "instagram",
          "blog", "pdf", "image", "screenshot", "website",
          "github", "reddit", "linkedin", "tiktok", "spotify", "unknown",
        ],
        example: "blog",
      },
      ContentSize: {
        type: "string",
        enum: ["small", "large"],
        description: "small = return full content; large = activate chat mode",
      },
      ProcessingStatus: {
        type: "string",
        enum: ["pending", "processing", "completed", "failed"],
      },

      // ── Content ───────────────────────────────────────────────────────────────
      ContentSummary: {
        type: "object",
        properties: {
          _id:             { type: "string", example: "664f1a2b3c4d5e6f7a8b9c0d" },
          url:             { type: "string", format: "uri", example: "https://x.com/user/status/123" },
          contentType:     { $ref: "#/components/schemas/ContentType" },
          platform:        { type: "string", example: "twitter" },
          title:           { type: "string", example: "Great thread on LLMs" },
          description:     { type: "string" },
          thumbnail:       { type: "string", format: "uri" },
          author:          { type: "string", example: "@username" },
          publishedAt:     { type: "string", format: "date-time" },
          contentSize:     { $ref: "#/components/schemas/ContentSize" },
          tags:            { type: "array", items: { type: "string" } },
          processingStatus:{ $ref: "#/components/schemas/ProcessingStatus" },
          embeddingsCount: { type: "integer", example: 12 },
          savedAt:         { type: "string", format: "date-time" },
        },
      },
      ContentFull: {
        allOf: [
          { $ref: "#/components/schemas/ContentSummary" },
          {
            type: "object",
            properties: {
              rawText:  { type: "string", description: "Full extracted text" },
              metadata: {
                type: "object",
                description: "Platform-specific metadata (TweetMetadata, YouTubeMetadata, etc.)",
                additionalProperties: true,
              },
              notes: { type: "string" },
            },
          },
        ],
      },

      // ── Requests ──────────────────────────────────────────────────────────────
      AddContentRequest: {
        type: "object",
        required: ["url"],
        properties: {
          url:   { type: "string", format: "uri", example: "https://x.com/sama/status/1234567890" },
          tags:  { type: "array", items: { type: "string" }, example: ["ai", "llm"] },
          notes: { type: "string", example: "Good intro to transformers" },
        },
      },
      SearchRequest: {
        type: "object",
        required: ["query"],
        properties: {
          query:        { type: "string", example: "RAG pipeline architecture" },
          contentTypes: {
            type: "array",
            items: { $ref: "#/components/schemas/ContentType" },
            example: ["blog", "pdf"],
          },
          limit:  { type: "integer", default: 10, minimum: 1, maximum: 50 },
          offset: { type: "integer", default: 0, minimum: 0 },
        },
      },
      ChatRequest: {
        type: "object",
        required: ["contentId", "message"],
        properties: {
          contentId: { type: "string", example: "664f1a2b3c4d5e6f7a8b9c0d" },
          message:   { type: "string", example: "What is the main argument of this PDF?" },
          sessionId: { type: "string", description: "Omit to start a new session" },
        },
      },

      // ── Responses ─────────────────────────────────────────────────────────────
      AddContentResponse: {
        type: "object",
        properties: {
          success:     { type: "boolean" },
          contentId:   { type: "string" },
          contentType: { $ref: "#/components/schemas/ContentType" },
          title:       { type: "string" },
          isLarge:     { type: "boolean", description: "true = chat mode activated" },
          message:     { type: "string", example: "Saved and indexing started" },
        },
      },
      SearchResultItem: {
        type: "object",
        properties: {
          contentId:       { type: "string" },
          url:             { type: "string", format: "uri" },
          contentType:     { $ref: "#/components/schemas/ContentType" },
          title:           { type: "string" },
          description:     { type: "string" },
          thumbnail:       { type: "string", format: "uri" },
          savedAt:         { type: "string", format: "date-time" },
          similarityScore: { type: "number", example: 0.87, minimum: 0, maximum: 1 },
          isLarge:         { type: "boolean" },
          snippet:         { type: "string", description: "Relevant excerpt from Pinecone" },
        },
      },
      SearchResponse: {
        type: "object",
        properties: {
          results:         { type: "array", items: { $ref: "#/components/schemas/SearchResultItem" } },
          total:           { type: "integer" },
          aiAnswer:        { type: "string", description: "Answer synthesised from saved content" },
          latestAiContext: { type: "string", description: "Latest AI knowledge beyond saved content" },
        },
      },
      ChatResponse: {
        type: "object",
        properties: {
          sessionId:    { type: "string" },
          answer:       { type: "string" },
          sourceChunks: { type: "array", items: { type: "string" }, description: "Context excerpts used" },
        },
      },
      ChatHistoryResponse: {
        type: "object",
        properties: {
          sessionId: { type: "string" },
          messages: {
            type: "array",
            items: {
              type: "object",
              properties: {
                role:      { type: "string", enum: ["user", "assistant"] },
                content:   { type: "string" },
                createdAt: { type: "string", format: "date-time" },
              },
            },
          },
          summary: { type: "string", description: "Auto-generated conversation summary" },
        },
      },

      // ── Errors ────────────────────────────────────────────────────────────────
      ErrorResponse: {
        type: "object",
        properties: {
          error:   { type: "string", example: "Unauthorized" },
          details: { type: "object", additionalProperties: true },
        },
      },
    },
  },

  // ─── Security (apply to all protected routes) ───────────────────────────────
  security: [{ cookieAuth: [] }],

  // ─── Paths ──────────────────────────────────────────────────────────────────
  paths: {

    // ── POST /api/content ──────────────────────────────────────────────────────
    "/api/content": {
      post: {
        tags: ["Content"],
        summary: "Save a URL to BrainHistory",
        description:
          "Detects URL type → extracts metadata → saves to MongoDB → triggers async Pinecone embedding.",
        operationId: "addContent",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/AddContentRequest" } } },
        },
        responses: {
          "201": {
            description: "Content saved successfully, embedding started",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AddContentResponse" } } },
          },
          "200": {
            description: "URL already saved (duplicate)",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AddContentResponse" } } },
          },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "422": { description: "URL extraction failed", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
      get: {
        tags: ["Content"],
        summary: "List saved content (paginated)",
        operationId: "listContent",
        parameters: [
          { name: "page",  in: "query", schema: { type: "integer", default: 1 },  description: "Page number" },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 }, description: "Items per page (max 50)" },
          { name: "type",  in: "query", schema: { $ref: "#/components/schemas/ContentType" }, description: "Filter by content type" },
        ],
        responses: {
          "200": {
            description: "Paginated content list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: { type: "array", items: { $ref: "#/components/schemas/ContentSummary" } },
                    total: { type: "integer" },
                    page:  { type: "integer" },
                    limit: { type: "integer" },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
    },

    // ── GET/DELETE /api/content/{id} ──────────────────────────────────────────
    "/api/content/{id}": {
      get: {
        tags: ["Content"],
        summary: "Get full content item (with rawText + metadata)",
        operationId: "getContent",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, description: "MongoDB ObjectId" }],
        responses: {
          "200": {
            description: "Full content document",
            content: { "application/json": { schema: { type: "object", properties: { content: { $ref: "#/components/schemas/ContentFull" } } } } },
          },
          "400": { description: "Invalid id format" },
          "401": { description: "Unauthorized" },
          "404": { description: "Not found" },
        },
      },
      delete: {
        tags: ["Content"],
        summary: "Delete content (MongoDB + Pinecone vectors + chat sessions)",
        operationId: "deleteContent",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Deleted successfully",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } },
          },
          "401": { description: "Unauthorized" },
          "404": { description: "Not found" },
        },
      },
    },

    // ── POST /api/search ───────────────────────────────────────────────────────
    "/api/search": {
      post: {
        tags: ["Search"],
        summary: "Semantic search over saved content",
        description:
          "Embeds the query → Pinecone ANN search → fetches MongoDB metadata → LangGraph generates AI answer + latest context.",
        operationId: "search",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/SearchRequest" } } },
        },
        responses: {
          "200": {
            description: "Search results with AI answer",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SearchResponse" } } },
          },
          "400": { description: "Validation error" },
          "401": { description: "Unauthorized" },
        },
      },
    },

    // ── POST /api/chat ─────────────────────────────────────────────────────────
    "/api/chat": {
      post: {
        tags: ["Chat"],
        summary: "Chat with a large saved content item",
        description:
          "PDF chat mode — embeds message → Pinecone search scoped to contentId → LangGraph generates grounded answer → persists session in MongoDB.",
        operationId: "chat",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ChatRequest" } } },
        },
        responses: {
          "200": {
            description: "AI reply with source chunks",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ChatResponse" } } },
          },
          "400": { description: "Validation error" },
          "401": { description: "Unauthorized" },
          "404": { description: "Content not found" },
          "409": { description: "Content still being indexed" },
        },
      },
      get: {
        tags: ["Chat"],
        summary: "Load chat session history",
        operationId: "getChatSession",
        parameters: [
          { name: "sessionId", in: "query", required: true, schema: { type: "string" }, description: "Session ID returned from POST /api/chat" },
        ],
        responses: {
          "200": {
            description: "Chat session with messages",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ChatHistoryResponse" } } },
          },
          "400": { description: "sessionId required" },
          "401": { description: "Unauthorized" },
          "404": { description: "Session not found" },
        },
      },
    },
  },
};
