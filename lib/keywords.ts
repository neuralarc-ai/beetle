import type { Capability, OutputFormat } from "./types";

// Capability lexicon -> which model axis a word points at.
const CAP_LEXICON: Record<Capability, string[]> = {
  coding: [
    "code", "coding", "html", "css", "javascript", "typescript", "python",
    "react", "next.js", "api", "function", "website", "web app", "web page",
    "landing page", "app", "build", "program", "script", "debug", "sql",
    "backend", "frontend", "component", "deploy", "refactor", "algorithm",
    "bug", "compile", "create", "develop", "implement", "prototype",
  ],
  research: [
    "research", "find", "search", "analyze", "analyse", "summarize",
    "summarise", "compare", "investigate", "sources", "paper", "study",
    "explain", "gather", "market", "competitor", "report", "review",
    "literature", "fact-check", "overview", "write", "draft", "generate",
  ],
  reasoning: [
    "reason", "reasoning", "think", "solve", "math", "logic", "prove",
    "plan", "strategy", "step-by-step", "calculate", "deduce", "derive",
    "optimize", "optimise", "architect", "decide", "evaluate", "trade-off",
  ],
  vision: [
    "photo", "picture", "screenshot", "diagram", "chart", "visual", "ocr",
    "scan", "figure", "mockup", "look at this", "graph", "infographic",
  ],
  tools: [
    "tool", "api call", "function call", "browse", "fetch", "database",
    "query", "execute", "automate", "agent", "workflow", "integrate",
    "webhook", "schedule", "crawl", "scrape",
  ],
};

// Output-format lexicon -> what container the user wants the result in.
// (website/html stay in the coding axis above; detected as a format separately.)
const FMT_LEXICON: Partial<Record<OutputFormat, string[]>> = {
  word: ["word document", "word doc", "docx", "word file", "document", "documentation"],
  excel: ["excel", "spreadsheet", "xlsx", "google sheet", "google sheets"],
  csv: ["csv", "comma separated", "comma-separated"],
  pdf: ["pdf", "pdf file"],
  json: ["json", "json file"],
  markdown: ["markdown", "readme"],
  slides: ["powerpoint", "pptx", "slide deck", "presentation", "slides"],
  image: [
    "image generation", "generate an image", "create an image", "an image of",
    "png", "jpeg", "illustration", "logo", "poster",
  ],
};

export interface Segment {
  text: string;
  cap: Capability | null;
  fmt: OutputFormat | null;
}

type Tag = { cap?: Capability; fmt?: OutputFormat };

const TERMS: { term: string; tag: Tag }[] = [
  ...Object.entries(CAP_LEXICON).flatMap(([cap, terms]) =>
    terms.map((term) => ({ term, tag: { cap: cap as Capability } }))
  ),
  ...Object.entries(FMT_LEXICON).flatMap(([fmt, terms]) =>
    (terms ?? []).map((term) => ({ term, tag: { fmt: fmt as OutputFormat } }))
  ),
].sort((a, b) => b.term.length - a.term.length);

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const PATTERN = new RegExp(
  "(?<![\\w-])(" + TERMS.map((t) => escapeRe(t.term)).join("|") + ")(?![\\w-])",
  "gi"
);

const LOOKUP = new Map(TERMS.map((t) => [t.term.toLowerCase(), t.tag]));

export function segment(text: string): Segment[] {
  if (!text) return [];
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(PATTERN)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ text: text.slice(last, idx), cap: null, fmt: null });
    const tag = LOOKUP.get(m[0].toLowerCase()) ?? {};
    out.push({ text: m[0], cap: tag.cap ?? null, fmt: tag.fmt ?? null });
    last = idx + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), cap: null, fmt: null });
  return out;
}

export function detectCapabilities(text: string): Record<Capability, number> {
  const counts: Record<Capability, number> = {
    reasoning: 0, coding: 0, vision: 0, tools: 0, research: 0,
  };
  for (const m of text.matchAll(PATTERN)) {
    const tag = LOOKUP.get(m[0].toLowerCase());
    if (tag?.cap) counts[tag.cap]++;
  }
  return counts;
}

const WEBSITE_RE = /\b(website|web app|web page|web site|html|landing page)\b/i;

export function detectFormats(text: string): OutputFormat[] {
  const set = new Set<OutputFormat>();
  for (const m of text.matchAll(PATTERN)) {
    const tag = LOOKUP.get(m[0].toLowerCase());
    if (tag?.fmt) set.add(tag.fmt);
  }
  if (WEBSITE_RE.test(text)) set.add("website");
  return [...set];
}
