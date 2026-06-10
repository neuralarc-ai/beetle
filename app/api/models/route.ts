import { readFile } from "node:fs/promises";
import path from "node:path";
import { scoreAll } from "@/lib/scoring";
import type { RawModel, RawSnapshot } from "@/lib/types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/models";

interface OpenRouterModel {
  id: string;
  canonical_slug?: string;
  name: string;
  context_length?: number;
  created?: number;
  architecture?: { input_modalities?: string[]; output_modalities?: string[] };
  pricing?: { prompt?: string; completion?: string };
  supported_parameters?: string[];
}

function toRaw(m: OpenRouterModel): RawModel {
  return {
    id: m.id,
    slug: m.canonical_slug ?? m.id,
    name: m.name,
    context_length: m.context_length ?? 0,
    created: m.created ?? 0,
    input_modalities: m.architecture?.input_modalities ?? [],
    output_modalities: m.architecture?.output_modalities ?? ["text"],
    pricing: { prompt: m.pricing?.prompt ?? "0", completion: m.pricing?.completion ?? "0" },
    supported_parameters: m.supported_parameters ?? [],
  };
}

async function loadSnapshot(): Promise<RawSnapshot> {
  const p = path.join(process.cwd(), "data", "snapshot.json");
  const txt = await readFile(p, "utf8");
  return JSON.parse(txt) as RawSnapshot;
}

export async function GET() {
  let raws: RawModel[] = [];
  let source: "live" | "snapshot" = "live";
  let fetchedAt = new Date().toISOString();

  try {
    const res = await fetch(OPENROUTER_URL, {
      headers: { Accept: "application/json" },
      // cache the live feed for an hour; OpenRouter rarely changes faster
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
    const json = (await res.json()) as { data: OpenRouterModel[] };
    if (!json.data?.length) throw new Error("empty payload");
    raws = json.data.map(toRaw);
  } catch {
    // fall back to the committed snapshot so the app always works
    const snap = await loadSnapshot();
    raws = snap.data;
    source = "snapshot";
    fetchedAt = snap.fetched_at;
  }

  const models = scoreAll(raws);
  return Response.json({ source, fetchedAt, count: models.length, models });
}
