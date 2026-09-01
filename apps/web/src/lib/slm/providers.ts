/**
 * LLM Provider registry for the Reanzly SLM.
 *
 * Each provider is a remote LLM service (Anthropic Claude, OpenAI
 * ChatGPT, Google Gemini) plus a local rules engine that needs no
 * external API. The admin panel connects/disconnects providers and
 * stores API keys in the vault. Agents pick a "brain" which references
 * one of these providers + a model.
 */

export type ProviderKind = "local-rules" | "anthropic" | "openai" | "google" | "azure-openai";

export interface LLMProvider {
  id: string;
  name: string;
  kind: ProviderKind;
  /** Marketing tagline shown in the integrations marketplace. */
  tagline: string;
  /** Available models for this provider. */
  models: LLMModel[];
  /** Whether the provider is connected (has a valid API key). */
  connected: boolean;
  /** The API key vault entry id. */
  apiKeyRef?: string;
  /** Base URL override (for Azure OpenAI or self-hosted). */
  baseUrl?: string;
  /** Last health check. */
  lastCheckedAt?: string;
  /** 7-day rolling usage stats. */
  usage?: {
    tokens7d: number;
    cost7dInr: number;
    calls7d: number;
  };
  /** Capabilities supported by this provider. */
  capabilities: {
    toolUse: boolean;
    vision: boolean;
    streaming: boolean;
    jsonMode: boolean;
    longContext: boolean;
  };
  /** Docs URL for the provider. */
  docsUrl?: string;
  /** Where to get an API key. */
  apiKeyUrl?: string;
}

export interface LLMModel {
  id: string;
  name: string;
  /** Context window in tokens. */
  contextWindow: number;
  /** Max output tokens. */
  maxOutput: number;
  /** Cost per 1M input tokens in INR. */
  costInPer1mInr: number;
  /** Cost per 1M output tokens in INR. */
  costOutPer1mInr: number;
  /** Whether this model supports tool/function calling. */
  toolUse: boolean;
  /** Whether this model supports vision. */
  vision: boolean;
  /** Whether this is a reasoning/thinking model. */
  reasoning: boolean;
}

// ── Seed providers ──────────────────────────────────────────

export const SEED_LLM_PROVIDERS: LLMProvider[] = [
  {
    id: "local-rules",
    name: "Reanzly Local Rules Engine",
    kind: "local-rules",
    tagline: "Deterministic, zero-cost, on-device. No API key needed.",
    models: [
      {
        id: "rules-v1",
        name: "Rules Engine v1",
        contextWindow: 0,
        maxOutput: 0,
        costInPer1mInr: 0,
        costOutPer1mInr: 0,
        toolUse: true,
        vision: false,
        reasoning: false,
      },
    ],
    connected: true,
    capabilities: { toolUse: true, vision: false, streaming: false, jsonMode: true, longContext: false },
    docsUrl: "/docs/slm/local-rules",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    kind: "anthropic",
    tagline: "Claude 3.5 Sonnet, Opus, and Haiku. Best-in-class reasoning & tool use.",
    models: [
      {
        id: "claude-3-5-sonnet",
        name: "Claude 3.5 Sonnet",
        contextWindow: 200000,
        maxOutput: 8192,
        costInPer1mInr: 220,
        costOutPer1mInr: 1100,
        toolUse: true,
        vision: true,
        reasoning: true,
      },
      {
        id: "claude-3-opus",
        name: "Claude 3 Opus",
        contextWindow: 200000,
        maxOutput: 4096,
        costInPer1mInr: 1100,
        costOutPer1mInr: 5500,
        toolUse: true,
        vision: true,
        reasoning: true,
      },
      {
        id: "claude-3-haiku",
        name: "Claude 3 Haiku",
        contextWindow: 200000,
        maxOutput: 4096,
        costInPer1mInr: 22,
        costOutPer1mInr: 110,
        toolUse: true,
        vision: true,
        reasoning: false,
      },
    ],
    connected: false,
    capabilities: { toolUse: true, vision: true, streaming: true, jsonMode: true, longContext: true },
    docsUrl: "https://docs.anthropic.com",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "openai",
    name: "OpenAI ChatGPT",
    kind: "openai",
    tagline: "GPT-4o, GPT-4o mini, o1, o3-mini. Broad tool & vision support.",
    models: [
      {
        id: "gpt-4o",
        name: "GPT-4o",
        contextWindow: 128000,
        maxOutput: 16384,
        costInPer1mInr: 220,
        costOutPer1mInr: 880,
        toolUse: true,
        vision: true,
        reasoning: false,
      },
      {
        id: "gpt-4o-mini",
        name: "GPT-4o mini",
        contextWindow: 128000,
        maxOutput: 16384,
        costInPer1mInr: 13,
        costOutPer1mInr: 52,
        toolUse: true,
        vision: true,
        reasoning: false,
      },
      {
        id: "o3-mini",
        name: "o3-mini",
        contextWindow: 200000,
        maxOutput: 100000,
        costInPer1mInr: 88,
        costOutPer1mInr: 352,
        toolUse: true,
        vision: false,
        reasoning: true,
      },
    ],
    connected: false,
    capabilities: { toolUse: true, vision: true, streaming: true, jsonMode: true, longContext: true },
    docsUrl: "https://platform.openai.com/docs",
    apiKeyUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "google",
    name: "Google Gemini",
    kind: "google",
    tagline: "Gemini 2.0 Flash, 1.5 Pro. Long context, multimodal.",
    models: [
      {
        id: "gemini-2-0-flash",
        name: "Gemini 2.0 Flash",
        contextWindow: 1048576,
        maxOutput: 8192,
        costInPer1mInr: 13,
        costOutPer1mInr: 52,
        toolUse: true,
        vision: true,
        reasoning: false,
      },
      {
        id: "gemini-1-5-pro",
        name: "Gemini 1.5 Pro",
        contextWindow: 2097152,
        maxOutput: 8192,
        costInPer1mInr: 110,
        costOutPer1mInr: 440,
        toolUse: true,
        vision: true,
        reasoning: false,
      },
    ],
    connected: false,
    capabilities: { toolUse: true, vision: true, streaming: true, jsonMode: true, longContext: true },
    docsUrl: "https://ai.google.dev/docs",
    apiKeyUrl: "https://aistudio.google.com/app/apikey",
  },
  {
    id: "azure-openai",
    name: "Azure OpenAI",
    kind: "azure-openai",
    tagline: "Enterprise OpenAI with regional data residency. Bring your own deployment.",
    models: [
      {
        id: "gpt-4o-azure",
        name: "GPT-4o (Azure)",
        contextWindow: 128000,
        maxOutput: 16384,
        costInPer1mInr: 242,
        costOutPer1mInr: 968,
        toolUse: true,
        vision: true,
        reasoning: false,
      },
    ],
    connected: false,
    capabilities: { toolUse: true, vision: true, streaming: true, jsonMode: true, longContext: true },
    docsUrl: "https://learn.microsoft.com/azure/ai-services/openai",
    apiKeyUrl: "https://portal.azure.com",
  },
];

// ── Helper ──────────────────────────────────────────────────

export function providerById(id: string): LLMProvider | undefined {
  return SEED_LLM_PROVIDERS.find((p) => p.id === id);
}

export function modelById(providerId: string, modelId: string): LLMModel | undefined {
  const p = providerById(providerId);
  return p?.models.find((m) => m.id === modelId);
}
