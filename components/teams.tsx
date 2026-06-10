"use client";

import React from "react";
import { Bar, CapBadge, DotTrack } from "./ui";
import { useModelDetail } from "./model-detail";
import { CAPABILITY_COLOR, GROUP_ACCENT, C } from "@/lib/palette";
import type { Team } from "@/lib/types";

function money(n: number): string {
  if (n === 0) return "$0.00";
  if (n < 0.01) return "<$0.01";
  return "$" + n.toFixed(2);
}

const RANK_TITLE: Record<Team["rank"], string> = {
  BUDGET: "Budget",
  BALANCED: "Balanced",
  "MAX-PERFORMANCE": "Max Performance",
  CUSTOM: "Custom",
};

function shortName(name: string): string {
  return name.replace(/\s*\(free\)\s*$/i, "");
}

export function TeamCard({
  team,
  best,
  onSelect,
}: {
  team: Team;
  best?: boolean;
  onSelect?: (t: Team) => void;
}) {
  const { open } = useModelDetail();
  const accent = GROUP_ACCENT[team.rank];
  return (
    <div
      className="panel flex flex-col"
      style={best ? { borderColor: accent + "88", boxShadow: `0 0 0 1px ${accent}33` } : undefined}
    >
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-extrabold tracking-tight" style={{ color: accent }}>
              {RANK_TITLE[team.rank]}
            </span>
            {best && (
              <span
                className="inline-flex items-center gap-1 lbl px-1.5 py-0.5 rounded-full"
                style={{ background: accent + "22", color: accent }}
              >
                ★ BEST VALUE
              </span>
            )}
          </div>
          <div className="lbl mt-0.5">{team.id}</div>
        </div>
        {onSelect && (
          <button
            onClick={() => onSelect(team)}
            className="text-[11px] tracking-wider uppercase px-3 py-1.5 rounded-full border transition-colors"
            style={{ borderColor: accent + "66", color: accent }}
          >
            Select →
          </button>
        )}
      </div>

      <div className="p-4 space-y-3.5 flex-1">
        {team.members.map((m) => (
          <div key={m.capability} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <CapBadge cap={m.capability} />
              <span className="val text-[12px] num text-muted">{money(m.model.blendedPerM)}/1M</span>
            </div>
            <button
              onClick={() => open(m.model)}
              className="lbl !text-fg truncate text-left hover:opacity-70 block w-full"
              title={`${m.model.name} — view benchmarks`}
            >
              {shortName(m.model.name)} ↗
            </button>
            <Bar value={m.model.capScores[m.capability]} color={CAPABILITY_COLOR[m.capability]} />
          </div>
        ))}
      </div>

      <div className="border-t border-line px-4 py-3.5 grid grid-cols-2 gap-3">
        <div>
          <div className="lbl">Cost / 1M tokens</div>
          <div className="text-xl font-extrabold num mt-0.5">{money(team.worstCasePerM)}</div>
          <div className="lbl">WORST-CASE</div>
        </div>
        <div>
          <div className="lbl">Group quality</div>
          <div className="text-xl font-extrabold num mt-0.5">{team.avgQuality}</div>
          <div className="lbl">OF 100</div>
        </div>
      </div>
    </div>
  );
}

export function TeamCompare({ teams, budget }: { teams: Team[]; budget: number }) {
  const maxCost = Math.max(budget, ...teams.map((t) => t.worstCasePerM), 1);
  return (
    <div className="panel p-5 space-y-3.5">
      <div className="lbl">Group comparison — quality vs cost per 1M tokens</div>
      {teams.map((t) => {
        const accent = GROUP_ACCENT[t.rank];
        return (
          <div
            key={t.id}
            className="grid grid-cols-1 sm:grid-cols-[150px_1fr_1fr] gap-2 sm:gap-5 items-center"
          >
            <div className="val text-[12px]">
              <span style={{ color: accent }} className="font-bold">
                {RANK_TITLE[t.rank]}
              </span>{" "}
              <span className="lbl">{t.id}</span>
            </div>
            <Bar label="QUALITY" value={t.avgQuality} color={accent} labelWidth="w-16" />
            <DotTrack
              label="$/1M"
              value={Math.round(t.worstCasePerM * 100) / 100}
              max={maxCost}
              color={accent}
              valueText={money(t.worstCasePerM)}
              labelWidth="w-12"
            />
          </div>
        );
      })}
    </div>
  );
}
