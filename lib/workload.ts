import { CAPABILITIES, type Capability, type Model, type OutputFormat, type Team } from "./types";
import { detectCapabilities, detectFormats } from "./keywords";

// ---- Keyword-driven workload model ----
// LLM cost is dominated by OUTPUT tokens, so each kind of detected work carries
// an estimate of how much a model GENERATES for it. The prompt's keywords
// (build / research / create / document / website …) therefore drive the cost.

// Output tokens generated per occurrence of each capability keyword.
export const CAP_OUTPUT_TOKENS: Record<Capability, number> = {
  coding: 1800, // writing code/components is verbose
  research: 1400, // reports, summaries, comparisons
  reasoning: 900, // step-by-step working
  tools: 500, // tool calls / orchestration glue
  vision: 600, // describing/interpreting an image
};

// Output tokens to produce each requested deliverable / container.
export const FORMAT_OUTPUT_TOKENS: Record<OutputFormat, number> = {
  website: 2500,
  slides: 1600,
  pdf: 1400,
  word: 1100,
  excel: 900,
  markdown: 700,
  json: 600,
  csv: 450,
  image: 1000,
};

// Generic answer size when a prompt has no specific detected work.
const BASELINE_OUTPUT = 800;

export interface Workload {
  inputTokens: number;
  counts: Record<Capability, number>;
  detected: Capability[];
  formats: OutputFormat[];
  capOutput: Record<Capability, number>; // generated tokens per detected capability
  formatTokens: number; // generated tokens for deliverables
  outputTokens: number;
  totalTokens: number;
}

export function estimateWorkload(text: string): Workload {
  const counts = detectCapabilities(text);
  const detected = CAPABILITIES.filter((c) => counts[c] > 0);
  const formats = detectFormats(text);
  const inputTokens = Math.max(1, Math.round(text.trim().length / 4));

  const capOutput: Record<Capability, number> = {
    reasoning: 0, coding: 0, vision: 0, tools: 0, research: 0,
  };
  for (const c of detected) capOutput[c] = CAP_OUTPUT_TOKENS[c] * counts[c];

  const formatTokens = formats.reduce((a, f) => a + (FORMAT_OUTPUT_TOKENS[f] ?? 0), 0);
  const work = Object.values(capOutput).reduce((a, b) => a + b, 0) + formatTokens;
  const outputTokens = work > 0 ? work : BASELINE_OUTPUT;

  return {
    inputTokens, counts, detected, formats, capOutput, formatTokens,
    outputTokens, totalTokens: inputTokens + outputTokens,
  };
}

function memberFor(team: Team, cap: Capability): Model | null {
  return team.members.find((m) => m.capability === cap)?.model ?? null;
}

export interface GroupCost {
  total: number; // $ for the whole job
  inputCost: number;
  outputCost: number;
  totalTokens: number;
  effectivePerM: number; // $ per 1M tokens for this prompt's work-mix
}

const ZERO_COST: GroupCost = {
  total: 0, inputCost: 0, outputCost: 0, totalTokens: 0, effectivePerM: 0,
};

// Cost of running this workload through a group: each detected capability is
// routed to that group's model for the axis and priced on its real input/output
// rates; deliverables are produced by the group's coding (else research) model.
export function estimateGroupCost(team: Team | undefined, job: Workload): GroupCost {
  if (!team || !team.members.length) return { ...ZERO_COST, totalTokens: job.totalTokens };

  let inputCost = 0;
  let outputCost = 0;

  const active = job.detected.length ? job.detected : [team.members[0].capability];
  for (const cap of active) {
    const m = memberFor(team, cap) ?? team.members[0].model;
    // each model handling a sub-task is fed the prompt as input
    inputCost += (job.inputTokens / 1_000_000) * m.pricePromptPerM;
    const out = job.detected.length
      ? job.capOutput[cap]
      : job.outputTokens - job.formatTokens; // baseline answer when nothing detected
    outputCost += (out / 1_000_000) * m.priceCompletionPerM;
  }

  if (job.formatTokens > 0) {
    const handler = memberFor(team, "coding") ?? memberFor(team, "research") ?? team.members[0].model;
    outputCost += (job.formatTokens / 1_000_000) * handler.priceCompletionPerM;
  }

  const total = inputCost + outputCost;
  const effectivePerM = job.totalTokens ? (total / job.totalTokens) * 1_000_000 : 0;
  return { total, inputCost, outputCost, totalTokens: job.totalTokens, effectivePerM };
}
