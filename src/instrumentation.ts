/**
 * Next.js instrumentation hook — runs once when the server process starts.
 *
 * Problem: Zscaler (corporate HTTPS proxy) intercepts TLS connections and
 * re-signs certificates with its own CA. Node.js rejects these because its
 * built-in CA bundle doesn't include the Zscaler root CA.
 *
 * Fix: disable strict TLS verification for outbound HTTPS connections.
 * This covers OpenAI embeddings, Anthropic/OpenAI chat LLM calls, and any
 * other HTTPS API the server makes. MongoDB Atlas is unaffected (it uses the
 * mongodb+srv protocol, not HTTPS).
 *
 * IMPORTANT: Only do this in development. In production, TLS verification
 * must be enabled.
 */
export async function register() {
  if (process.env.NODE_ENV !== "production") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    // Replace the default warning listener with one that silently swallows
    // the TLS verification warning — it's expected noise in this dev setup.
    process.removeAllListeners("warning");
    process.on("warning", (warning) => {
      if (
        warning.name === "Warning" &&
        warning.message.includes("NODE_TLS_REJECT_UNAUTHORIZED")
      ) {
        return;
      }
      process.stderr.write(`${warning.stack ?? warning.message}\n`);
    });
  }
}
