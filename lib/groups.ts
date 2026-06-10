import { CAPABILITIES, type Capability, type Model, type Team } from "./types";

// Models genuinely offering a capability (support flag or score threshold via caps[]).
function candidatesFor(cap: Capability, pool: Model[]): Model[] {
  const strict = pool.filter((m) => m.caps.includes(cap));
  if (strict.length) return strict;
  // fallback: any model with a non-zero score on that axis
  return pool.filter((m) => m.capScores[cap] > 0);
}

type Mode = "BUDGET" | "BALANCED" | "MAX-PERFORMANCE";

function pick(cap: Capability, pool: Model[], mode: Mode, budget: number): Model | null {
  const cands = candidatesFor(cap, pool);
  if (!cands.length) return null;
  const sorted = [...cands].sort((a, b) => {
    if (mode === "MAX-PERFORMANCE") {
      return b.capScores[cap] - a.capScores[cap] || a.blendedPerM - b.blendedPerM;
    }
    if (mode === "BUDGET") {
      return a.blendedPerM - b.blendedPerM || b.capScores[cap] - a.capScores[cap];
    }
    // BALANCED — maximise competence per dollar-fraction of the budget
    const frac = budget > 0 ? 100 / budget : 0;
    const va = a.capScores[cap] - frac * a.blendedPerM;
    const vb = b.capScores[cap] - frac * b.blendedPerM;
    return vb - va;
  });
  return sorted[0];
}

function assemble(id: string, rank: Mode, pool: Model[], budget: number): Team {
  const members = CAPABILITIES.map((capability) => ({
    capability,
    model: pick(capability, pool, rank, budget),
  })).filter((m): m is { capability: Capability; model: Model } => m.model !== null);

  const prices = members.map((m) => m.model.blendedPerM);
  const worstCasePerM = prices.length ? Math.max(...prices) : 0;
  // distinct models only, even split of 1M tokens across the orchestration
  const distinct = new Map<string, Model>();
  members.forEach((m) => distinct.set(m.model.id, m.model));
  const distinctPrices = [...distinct.values()].map((m) => m.blendedPerM);
  const evenSplitPerM =
    distinctPrices.reduce((a, b) => a + b, 0) / Math.max(1, distinctPrices.length);

  const avgQuality =
    members.reduce((a, m) => a + m.model.capScores[m.capability], 0) /
    Math.max(1, members.length);

  return {
    id,
    rank,
    members,
    worstCasePerM: Math.round(worstCasePerM * 100) / 100,
    evenSplitPerM: Math.round(evenSplitPerM * 100) / 100,
    avgQuality: Math.round(avgQuality),
    coverage: members.map((m) => m.capability),
  };
}

// Build the three budget-capped teams.
// Worst-case guarantee: every member's blended $/1M <= budget, so processing
// 1M tokens can never exceed the budget no matter how it's orchestrated.
export function buildTeams(models: Model[], budget: number): Team[] {
  const pool = models.filter((m) => m.blendedPerM <= budget);
  return [
    assemble("BTL-G1", "BUDGET", pool, budget),
    assemble("BTL-G2", "BALANCED", pool, budget),
    assemble("BTL-G3", "MAX-PERFORMANCE", pool, budget),
  ];
}

// Count of in-budget models, for the home-page readout.
export function inBudgetCount(models: Model[], budget: number): number {
  return models.filter((m) => m.blendedPerM <= budget).length;
}

// Build a user-defined group from explicitly chosen models. Each capability axis
// is filled by the strongest selected model that offers it (coverage may be partial).
export function buildCustomTeam(models: Model[], ids: string[]): Team {
  const byId = new Map(models.map((m) => [m.id, m]));
  const selected = ids.map((id) => byId.get(id)).filter((m): m is Model => !!m);

  const members = CAPABILITIES.map((capability) => {
    const offering = selected.filter((m) => m.caps.includes(capability));
    const pool = offering.length
      ? offering
      : selected.filter((m) => m.capScores[capability] > 0);
    if (!pool.length) return null;
    const model = [...pool].sort(
      (a, b) => b.capScores[capability] - a.capScores[capability]
    )[0];
    return { capability, model };
  }).filter((m): m is { capability: Capability; model: Model } => m !== null);

  const prices = selected.map((m) => m.blendedPerM);
  const worstCasePerM = prices.length ? Math.max(...prices) : 0;
  const evenSplitPerM = prices.length
    ? prices.reduce((a, b) => a + b, 0) / prices.length
    : 0;
  const avgQuality =
    members.reduce((a, m) => a + m.model.capScores[m.capability], 0) /
    Math.max(1, members.length);

  return {
    id: "CUSTOM",
    rank: "CUSTOM",
    members,
    worstCasePerM: Math.round(worstCasePerM * 100) / 100,
    evenSplitPerM: Math.round(evenSplitPerM * 100) / 100,
    avgQuality: Math.round(avgQuality),
    coverage: members.map((m) => m.capability),
  };
}
