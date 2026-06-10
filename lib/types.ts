// ---- Beetle core domain types ----

export type Capability =
  | "reasoning"
  | "coding"
  | "vision"
  | "tools"
  | "research";

export const CAPABILITIES: Capability[] = [
  "reasoning",
  "coding",
  "vision",
  "tools",
  "research",
];

export const CAPABILITY_LABEL: Record<Capability, string> = {
  reasoning: "REASONING / THINKING",
  coding: "CODING",
  vision: "VISION",
  tools: "TOOL CALLING",
  research: "RESEARCH / GENERAL",
};

// Output formats a prompt can ask for (drives model-support checks)
export type OutputFormat =
  | "word"
  | "excel"
  | "csv"
  | "pdf"
  | "json"
  | "markdown"
  | "slides"
  | "website"
  | "image";

export const FORMAT_LABEL: Record<OutputFormat, string> = {
  word: "WORD DOC",
  excel: "EXCEL",
  csv: "CSV",
  pdf: "PDF",
  json: "JSON",
  markdown: "MARKDOWN",
  slides: "SLIDES",
  website: "WEBSITE / HTML",
  image: "IMAGE",
};

// Raw shape stored in data/snapshot.json (trimmed OpenRouter payload)
export interface RawModel {
  id: string;
  slug: string;
  name: string;
  context_length: number;
  created: number;
  input_modalities: string[];
  output_modalities: string[];
  pricing: { prompt: string; completion: string };
  supported_parameters: string[];
}

export interface RawSnapshot {
  fetched_at: string;
  count: number;
  data: RawModel[];
}

// Beetle's internal scored model
export interface Model {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  // $ per 1,000,000 tokens
  pricePromptPerM: number;
  priceCompletionPerM: number;
  blendedPerM: number; // 70% prompt / 30% completion by default
  free: boolean;
  flagship: boolean;
  canImage: boolean; // can emit image output
  caps: Capability[];
  capScores: Record<Capability, number>; // 0-100 per axis
  quality: number; // 0-100 aggregate (hybrid)
  benchmark: number; // 0-100 external/blended benchmark estimate
}

export interface Team {
  id: string; // BTL-G1 ...
  rank: "BUDGET" | "BALANCED" | "MAX-PERFORMANCE" | "CUSTOM";
  members: { capability: Capability; model: Model }[];
  // worst-case $ to process 1M tokens = max member blendedPerM
  worstCasePerM: number;
  // even-split estimate across members
  evenSplitPerM: number;
  avgQuality: number;
  coverage: Capability[];
}
