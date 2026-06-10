import type { Capability, Model, RawModel } from "./types";

export const DEFAULT_BLEND = 0.7; // 70% prompt / 30% completion

// ---- Curated quality tiers (hybrid base). Refined per-axis below. ----
interface Tier {
  re: RegExp;
  q: number; // aggregate quality 0-100
  code: number;
  research: number;
}

// First match wins — order matters (specific before generic).
const TIERS: Tier[] = [
  { re: /claude.*opus/i, q: 95, code: 92, research: 95 },
  { re: /claude.*sonnet/i, q: 90, code: 93, research: 90 },
  { re: /claude.*haiku/i, q: 80, code: 80, research: 78 },
  { re: /\bo3\b|\bo4\b/i, q: 93, code: 90, research: 93 },
  { re: /gpt-5/i, q: 93, code: 91, research: 92 },
  { re: /\bo1\b/i, q: 90, code: 86, research: 90 },
  { re: /gpt-4\.1-mini|gpt-4o-mini/i, q: 78, code: 76, research: 74 },
  { re: /gpt-4\.1/i, q: 88, code: 88, research: 86 },
  { re: /gpt-4o/i, q: 87, code: 85, research: 85 },
  { re: /gpt-3\.5/i, q: 64, code: 62, research: 60 },
  { re: /gemini.*2\.5.*pro/i, q: 91, code: 88, research: 90 },
  { re: /gemini.*2\.5.*flash-lite/i, q: 74, code: 72, research: 72 },
  { re: /gemini.*2\.5.*flash/i, q: 82, code: 80, research: 80 },
  { re: /gemini.*1\.5.*pro/i, q: 84, code: 82, research: 84 },
  { re: /gemini.*flash/i, q: 73, code: 70, research: 70 },
  { re: /grok.*4/i, q: 88, code: 85, research: 86 },
  { re: /grok/i, q: 82, code: 80, research: 80 },
  { re: /deepseek.*coder/i, q: 80, code: 90, research: 70 },
  { re: /deepseek.*(r1|reason)/i, q: 86, code: 88, research: 86 },
  { re: /deepseek.*(v3|chat|v2)/i, q: 82, code: 86, research: 80 },
  { re: /deepseek/i, q: 80, code: 84, research: 78 },
  { re: /qwen.*coder/i, q: 80, code: 90, research: 72 },
  { re: /qwen.*max|qwen3.*235|qwen.*2\.5.*72/i, q: 82, code: 86, research: 78 },
  { re: /qwen/i, q: 72, code: 74, research: 68 },
  { re: /codestral|devstral/i, q: 78, code: 88, research: 66 },
  { re: /llama.*3\.1.*405|llama.*3\.3.*70/i, q: 83, code: 80, research: 82 },
  { re: /llama.*70/i, q: 78, code: 76, research: 76 },
  { re: /llama.*(8|7)b/i, q: 64, code: 62, research: 62 },
  { re: /mistral.*large|mixtral.*8x22|magistral/i, q: 80, code: 80, research: 78 },
  { re: /mistral|mixtral|ministral/i, q: 70, code: 70, research: 66 },
  { re: /nemotron|command-(r|a)/i, q: 76, code: 72, research: 76 },
  { re: /phi-/i, q: 66, code: 66, research: 62 },
  { re: /gemma/i, q: 66, code: 64, research: 64 },
  { re: /kimi|glm|minimax|yi-/i, q: 76, code: 78, research: 74 },
];

const DEFAULT_TIER: Tier = { re: /.*/, q: 58, code: 56, research: 56 };

const FLAGSHIP_PROVIDERS = new Set([
  "anthropic",
  "openai",
  "google",
  "x-ai",
  "deepseek",
  "meta-llama",
  "mistralai",
  "qwen",
]);

// deterministic small offset so the benchmark index isn't identical to quality
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function providerOf(id: string): string {
  const cleaned = id.replace(/^~/, "");
  const p = cleaned.includes("/") ? cleaned.split("/")[0] : "other";
  return p.toLowerCase();
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function scoreModel(raw: RawModel, blend = DEFAULT_BLEND): Model {
  const provider = providerOf(raw.id);
  const tier = TIERS.find((t) => t.re.test(raw.id) || t.re.test(raw.name)) ?? DEFAULT_TIER;

  const promptPerM = parseFloat(raw.pricing.prompt || "0") * 1_000_000;
  const completionPerM = parseFloat(raw.pricing.completion || "0") * 1_000_000;
  const blendedPerM = blend * promptPerM + (1 - blend) * completionPerM;
  const free = promptPerM === 0 && completionPerM === 0;

  const params = new Set(raw.supported_parameters);
  const hasTools = params.has("tools") || params.has("tool_choice");
  const hasReasoning = params.has("reasoning") || params.has("include_reasoning");
  const hasVision =
    raw.input_modalities.includes("image") || raw.input_modalities.includes("file");

  // per-axis 0-100 scores
  const capScores: Record<Capability, number> = {
    reasoning: hasReasoning ? clamp(Math.max(tier.q, 70)) : clamp(tier.q * 0.55),
    coding: clamp(tier.code),
    vision: hasVision ? clamp(Math.max(tier.q - 2, 68)) : 0,
    tools: hasTools ? clamp(Math.max(tier.q, 72)) : 0,
    research: clamp(tier.research),
  };

  // a capability is "offered" by the model if it genuinely supports it
  const caps: Capability[] = [];
  if (hasReasoning && capScores.reasoning >= 65) caps.push("reasoning");
  if (capScores.coding >= 70) caps.push("coding");
  if (hasVision) caps.push("vision");
  if (hasTools) caps.push("tools");
  if (capScores.research >= 70) caps.push("research");

  const quality = clamp(tier.q);
  // benchmark index = quality nudged by a deterministic ±3 so the two graphs differ
  const benchmark = clamp(quality + ((hash(raw.id) % 7) - 3));

  return {
    id: raw.id,
    name: raw.name,
    provider,
    contextLength: raw.context_length,
    pricePromptPerM: round2(promptPerM),
    priceCompletionPerM: round2(completionPerM),
    blendedPerM: round2(blendedPerM),
    free,
    flagship: FLAGSHIP_PROVIDERS.has(provider) && quality >= 80,
    canImage: raw.output_modalities.includes("image"),
    caps,
    capScores,
    quality,
    benchmark,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function scoreAll(raws: RawModel[], blend = DEFAULT_BLEND): Model[] {
  return raws
    // drop redirect aliases ("-latest") and meta-routers (openrouter/auto, etc.)
    .filter((r) => !/-latest$/.test(r.id))
    .filter((r) => !/\bauto router\b/i.test(r.name) && !/(^|\/)(auto|router)$/i.test(r.id))
    .filter((r) => r.id.split("/")[0].replace(/^~/, "") !== "openrouter")
    .map((r) => scoreModel(r, blend));
}
