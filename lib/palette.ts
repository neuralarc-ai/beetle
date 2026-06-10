import type { Capability, OutputFormat, Team } from "./types";

// Vibrant capability / highlight colours (used for bars + keyword highlights).
export const CAPABILITY_COLOR: Record<Capability, string> = {
  reasoning: "#9d7bff",
  coding: "#3b9eff",
  vision: "#ff4d9d",
  tools: "#f0a93b",
  research: "#2fd98f",
};

export const FORMAT_COLOR = "#7c83ff";

// Per-group accent colours.
export const GROUP_ACCENT: Record<Team["rank"], string> = {
  BUDGET: "#2fd98f",
  BALANCED: "#3b9eff",
  "MAX-PERFORMANCE": "#9d7bff",
  CUSTOM: "#22d3ee",
};

export function formatColor(_fmt: OutputFormat): string {
  return FORMAT_COLOR;
}

// soft highlighter background (low-alpha tint on dark)
export function tint(hex: string, alpha = "33"): string {
  return hex + alpha;
}

export const C = {
  fg: "#ededed",
  muted: "#7e848f",
  line: "rgba(255,255,255,0.08)",
  lineBright: "rgba(255,255,255,0.16)",
  track: "rgba(255,255,255,0.07)",
} as const;
