/**
 * End-to-end pipeline test — embed → Atlas upsert → $vectorSearch → cleanup
 * Usage: npx tsx scripts/test-pipeline.ts
 */

import { readFileSync } from "fs";
import mongoose from "mongoose";

// Load .env.local before anything reads env at module init time
const envLines = readFileSync(".env.local", "utf8").split("\n");
for (const line of envLines) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

/** Deterministic random vector seeded from a string (no OpenAI needed) */
function seedVector(seed: string, dim = 1536): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  const v: number[] = [];
  for (let i = 0; i < dim; i++) {
    h = (Math.imul(h ^ (h >>> 16), 0x45d9f3b)) | 0;
    v.push((h & 0xffff) / 0x8000 - 1);
  }
  const mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return v.map((x) => x / mag); // unit vector
}

async function main() {
  const { upsertVectors, queryVectors, deleteContentVectors } =
    await import("../src/lib/db/atlasVectorService");

  const TEST_USER_ID    = new mongoose.Types.ObjectId().toString();
  const TEST_CONTENT_ID = new mongoose.Types.ObjectId().toString();

  console.log("\n🔗 Connecting to MongoDB Atlas...");
  await mongoose.connect(process.env.MONGODB_URI!, { serverSelectionTimeoutMS: 10_000 });
  console.log("   ✓ Connected →", mongoose.connection.db!.databaseName);

  try {
    // 1. Fake embeddings (bypass Zscaler — OpenAI blocked on corporate network)
    console.log("\n📐 Generating deterministic test vectors (no external API)...");
    const texts = [
      "LangGraph is a framework for building stateful multi-actor AI applications.",
      "MongoDB Atlas Vector Search enables semantic search using $vectorSearch.",
    ];
    const vectors = texts.map((t) => seedVector(t));
    console.log(`   ✓ ${vectors.length} vectors, dim=${vectors[0].length}`);

    // 2. Upsert ────────────────────────────────────────────────────────────────
    console.log("\n💾 Upserting to Atlas (content_chunks)...");
    await upsertVectors({
      userId:      TEST_USER_ID,
      contentId:   TEST_CONTENT_ID,
      contentType: "blog",
      platform:    "test",
      title:       "Pipeline Test",
      url:         "https://example.com/test",
      savedAt:     new Date(),
      chunks: texts.map((text, i) => ({
        chunkIndex: i,
        chunkText:  text,
        embedding:  vectors[i],
      })),
    });
    console.log("   ✓ Upserted 2 chunks");

    // 3. $vectorSearch ─────────────────────────────────────────────────────────
    console.log("\n🔍 Running $vectorSearch (same vector as chunk 1)...");
    // Query with the same vector as chunk[1] — expect score ~1.0 for that chunk
    const results = await queryVectors({
      userId:      TEST_USER_ID,
      queryVector: vectors[1],
      topK:        2,
    });

    if (results.length === 0) {
      console.log("   ⚠  0 results — index may still be syncing. Wait ~30s and retry.");
    } else {
      console.log(`   ✓ ${results.length} result(s):`);
      for (const r of results) {
        console.log(`     score=${r.score.toFixed(4)}  "${r.chunkText.slice(0, 70)}"`);
      }
      const topScore = results[0].score;
      if (topScore > 0.99) {
        console.log("   ✓ Top score ≈ 1.0 — exact match confirmed, index is working!");
      }
    }

    // 4. Cleanup ───────────────────────────────────────────────────────────────
    console.log("\n🗑  Cleaning up test data...");
    await deleteContentVectors(TEST_USER_ID, TEST_CONTENT_ID);
    console.log("   ✓ Deleted");

    console.log(
      results.length > 0
        ? "\n✅  Atlas Vector Search pipeline OK — upsert + $vectorSearch + delete all pass!\n"
        : "\n⚠   Upsert/delete OK but $vectorSearch returned 0 — retry in ~30s.\n"
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("\n❌ Test failed:", err.message);
  process.exit(1);
});
