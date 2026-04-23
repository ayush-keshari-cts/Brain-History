/**
 * LLM provider factory
 *
 * Returns the correct LangChain chat model based on AI_PROVIDER env var.
 * Import `getLLM()` wherever you need a chat model — never construct
 * a model directly so the provider can be swapped via env.
 */

import { ChatOpenAI }     from "@langchain/openai";
import { ChatAnthropic }  from "@langchain/anthropic";
import { BaseChatModel }  from "@langchain/core/language_models/chat_models";

export function getLLM(options: { streaming?: boolean } = {}): BaseChatModel {
  const provider = process.env.AI_PROVIDER ?? "openai";

  if (provider === "openai") {
    return new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName:    process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
      temperature:  0.3,
      streaming:    options.streaming ?? false,
    });
  }

  if (provider === "anthropic") {
    return new ChatAnthropic({
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      modelName:       process.env.ANTHROPIC_CHAT_MODEL ?? "claude-sonnet-4-6",
      temperature:     0.3,
      streaming:       options.streaming ?? false,
    });
  }

  throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
}
