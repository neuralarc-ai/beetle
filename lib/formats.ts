import type { Capability, Model, OutputFormat, Team } from "./types";

export interface FormatSupport {
  fmt: OutputFormat;
  supported: boolean; // can the selected group produce it?
  model: Model | null; // which model would handle it
  inGroup: boolean; // is that model part of the selected group?
  note?: string;
}

function memberFor(team: Team, cap: Capability): Model | null {
  return team.members.find((m) => m.capability === cap)?.model ?? null;
}

// Resolve who handles a requested output format for the selected group.
// Text containers (word/excel/csv/pdf/json/markdown/slides/website) can be
// produced by any capable text model -> use the group's coding (or research) model.
// Image output genuinely requires an image-capable model.
export function resolveFormat(
  fmt: OutputFormat,
  team: Team,
  allModels: Model[],
  budget: number
): FormatSupport {
  if (fmt === "image") {
    const inTeam = team.members.find((m) => m.model.canImage)?.model ?? null;
    if (inTeam) {
      return { fmt, supported: true, model: inTeam, inGroup: true };
    }
    // nearest in-budget image model outside the group
    const candidate = allModels
      .filter((m) => m.canImage && m.blendedPerM <= budget)
      .sort((a, b) => a.blendedPerM - b.blendedPerM)[0];
    return {
      fmt,
      supported: false,
      model: candidate ?? null,
      inGroup: false,
      note: candidate
        ? "NO IMAGE-OUTPUT MODEL IN GROUP — NEAREST IN-BUDGET SHOWN"
        : "NO IMAGE-OUTPUT MODEL WITHIN BUDGET",
    };
  }
  // text-based container
  const handler =
    memberFor(team, "coding") ??
    memberFor(team, "research") ??
    team.members[0]?.model ??
    null;
  return { fmt, supported: !!handler, model: handler, inGroup: true };
}
