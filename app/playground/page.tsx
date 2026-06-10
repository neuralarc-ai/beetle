"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bar, CapBadge, Header } from "@/components/ui";
import { Nav } from "@/components/nav";
import { useModelDetail } from "@/components/model-detail";
import { CAPABILITY_COLOR, FORMAT_COLOR, GROUP_ACCENT, C, tint } from "@/lib/palette";
import { segment } from "@/lib/keywords";
import { estimateGroupCost, estimateWorkload } from "@/lib/workload";
import { resolveFormat } from "@/lib/formats";
import { buildCustomTeam, buildTeams } from "@/lib/groups";
import {
  CAPABILITIES,
  CAPABILITY_LABEL,
  FORMAT_LABEL,
  type Capability,
  type Model,
  type Team,
} from "@/lib/types";

function money(n: number): string {
  if (n === 0) return "$0.00";
  if (n < 0.01) return "<$0.01";
  return "$" + n.toFixed(2);
}
function micro(n: number): string {
  if (n === 0) return "$0.0000";
  if (n < 0.000001) return "<$0.000001";
  return "$" + n.toFixed(6).replace(/0+$/, "").replace(/\.$/, ".0");
}

function teamForCaps(team: Team, caps: Capability[]) {
  const picks = team.members.filter((m) => caps.includes(m.capability));
  if (!picks.length) return { cost: team.evenSplitPerM, quality: team.avgQuality, eff: 0 };
  const cost = picks.reduce((a, m) => a + m.model.blendedPerM, 0) / picks.length;
  const quality = picks.reduce((a, m) => a + m.model.capScores[m.capability], 0) / picks.length;
  return { cost, quality, eff: quality / (1 + cost) };
}

const RANK_TITLE: Record<Team["rank"], string> = {
  BUDGET: "Budget",
  BALANCED: "Balanced",
  "MAX-PERFORMANCE": "Max Performance",
  CUSTOM: "Custom",
};

function PlaygroundInner() {
  const params = useSearchParams();
  const { open } = useModelDetail();
  const budget = Number(params.get("budget") ?? "20");
  const initialTeam = params.get("team") ?? "BTL-G2";
  const customIds = (params.get("custom") ?? "").split(",").filter(Boolean);
  const customKey = customIds.join(",");

  const [models, setModels] = useState<Model[]>([]);
  const [teamId, setTeamId] = useState(initialTeam);
  const [text, setText] = useState(
    "Research the latest hypersonic airfoils, then build a website to visualise the data and export the results to an Excel spreadsheet and a CSV."
  );
  const taRef = useRef<HTMLTextAreaElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((d) => setModels(d.models ?? []))
      .catch(() => {});
  }, []);

  const teams = useMemo(() => {
    const base = buildTeams(models, budget);
    const custom = customIds.length ? buildCustomTeam(models, customIds) : null;
    return custom ? [custom, ...base] : base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models, budget, customKey]);
  const team = teams.find((t) => t.id === teamId) ?? teams.find((t) => t.id === "BTL-G2") ?? teams[0];

  const segs = useMemo(() => segment(text), [text]);
  const job = useMemo(() => estimateWorkload(text), [text]);
  const { counts, detected, formats } = job;

  // keyword-driven cost of running this workload through the selected group
  const groupCost = useMemo(() => estimateGroupCost(team, job), [team, job]);
  const promptPrice = groupCost.total;
  const promptCostPerM = groupCost.effectivePerM;

  const verdict = useMemo(() => {
    if ((!detected.length && !formats.length) || !teams.length) return null;
    let best: { team: Team; cost: number; eff: number } | null = null;
    for (const t of teams) {
      const quality = teamForCaps(t, detected).quality;
      const cost = estimateGroupCost(t, job).total;
      const eff = quality / (1 + cost);
      if (!best || eff > best.eff) best = { team: t, cost, eff };
    }
    return best;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams, job]);

  const formatSupports = useMemo(
    () => (team ? formats.map((f) => resolveFormat(f, team, models, budget)) : []),
    [formats, team, models, budget]
  );

  function syncScroll() {
    if (backRef.current && taRef.current) {
      backRef.current.scrollTop = taRef.current.scrollTop;
      backRef.current.scrollLeft = taRef.current.scrollLeft;
    }
  }

  const accent = team ? GROUP_ACCENT[team.rank] : "#2fd98f";

  return (
    <main className="max-w-6xl mx-auto w-full my-4 sm:my-6 rounded-2xl border border-line bg-surface overflow-hidden">
      <Header
        icon
        subtitle={`Playground · ${team ? RANK_TITLE[team.rank] : "—"} group · budget $${budget} / 1M`}
        right={
          <Link
            href="/"
            className="lbl border border-line-bright rounded-full px-3 py-1.5 hover:bg-fg hover:text-black inline-block"
          >
            ◂ Back to groups
          </Link>
        }
      />
      <Nav />

      {/* group selector */}
      <div className="px-5 sm:px-7 pt-5">
        <div className="flex flex-wrap gap-3">
          {teams.map((t) => {
            const a = GROUP_ACCENT[t.rank];
            const active = t.id === team?.id;
            return (
              <button
                key={t.id}
                onClick={() => setTeamId(t.id)}
                className="text-left rounded-xl border px-4 py-3 transition-colors flex-1 min-w-[160px]"
                style={{
                  borderColor: active ? a + "99" : C.line,
                  background: active ? a + "14" : "var(--panel)",
                }}
              >
                <div className="val text-[13px] font-bold" style={{ color: active ? a : C.fg }}>
                  {RANK_TITLE[t.rank]}
                </div>
                <div className="lbl num mt-0.5">
                  {money(t.worstCasePerM)}/1M · Q{t.avgQuality}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 sm:px-7 py-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* prompt editor */}
        <div className="lg:col-span-2 space-y-3">
          <label className="lbl">Prompt — important words highlight by capability as you type</label>
          <div className="relative panel-2 focus-within:border-line-bright">
            <div
              ref={backRef}
              aria-hidden
              className="absolute inset-0 overflow-auto whitespace-pre-wrap break-words p-4 text-[14px] leading-[1.65] pointer-events-none border border-transparent"
            >
              {segs.map((s, i) => {
                if (s.cap)
                  return (
                    <span key={i} className="kw" style={{ background: tint(CAPABILITY_COLOR[s.cap], "33"), color: "#fff" }}>
                      {s.text}
                    </span>
                  );
                if (s.fmt)
                  return (
                    <span key={i} className="kw" style={{ background: tint(FORMAT_COLOR, "33"), color: "#fff" }}>
                      {s.text}
                    </span>
                  );
                return <span key={i}>{s.text}</span>;
              })}
              {"​"}
            </div>
            <textarea
              ref={taRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onScroll={syncScroll}
              spellCheck={false}
              className="relative w-full h-52 resize-y bg-transparent border border-transparent p-4 text-[14px] leading-[1.65] outline-none"
              style={{ color: "transparent", caretColor: "#fff" }}
            />
          </div>

          {/* legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {CAPABILITIES.map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: CAPABILITY_COLOR[c] }} />
                <span className="lbl">{CAPABILITY_LABEL[c]}</span>
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: FORMAT_COLOR }} />
              <span className="lbl">Output format</span>
            </span>
          </div>

          {/* price visual */}
          <div className="panel p-5 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="lbl">This prompt ≈</div>
                <div className="text-2xl font-extrabold num mt-0.5">{micro(promptPrice)}</div>
                <div className="lbl">{job.inputTokens} IN + {job.outputTokens} OUT TOK</div>
              </div>
              <div>
                <div className="lbl">{RANK_TITLE[team?.rank ?? "BALANCED"]} cost / 1M</div>
                <div className="text-2xl font-extrabold num mt-0.5" style={{ color: accent }}>
                  {money(promptCostPerM)}
                </div>
                <div className="lbl">FOR DETECTED WORK</div>
              </div>
              <div>
                <div className="lbl">Group cap / 1M</div>
                <div className="text-2xl font-extrabold num mt-0.5">{money(team?.worstCasePerM ?? 0)}</div>
                <div className="lbl">WORST-CASE</div>
              </div>
            </div>
            <div className="space-y-2 pt-1 border-t border-line">
              <div className="lbl">Projected prompt cost — all groups</div>
              {teams.map((t) => {
                const price = estimateGroupCost(t, job).total;
                const maxPrice = Math.max(
                  ...teams.map((g) => estimateGroupCost(g, job).total),
                  0.0000001
                );
                const a = GROUP_ACCENT[t.rank];
                return (
                  <div key={t.id} className="flex items-center gap-2.5">
                    <div className="lbl w-28 shrink-0">{RANK_TITLE[t.rank]}</div>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: C.track }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.max(2, (price / maxPrice) * 100)}%`, background: a, boxShadow: `0 0 8px ${a}66` }}
                      />
                    </div>
                    <div className="val num w-24 text-right text-[12px]">{micro(price)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* right column */}
        <div className="space-y-5">
          <div className="panel p-4">
            <div className="lbl mb-3">Surfaced models — from {team?.id}</div>
            {detected.length === 0 ? (
              <div className="lbl">Type a prompt to orchestrate models…</div>
            ) : (
              <div className="space-y-3.5">
                {detected.map((cap) => {
                  const m = team?.members.find((x) => x.capability === cap)?.model;
                  if (!m) return null;
                  return (
                    <div key={cap} className="space-y-1.5 pl-2.5 border-l-2" style={{ borderColor: CAPABILITY_COLOR[cap] }}>
                      <div className="flex items-center justify-between">
                        <CapBadge cap={cap} />
                        <span className="lbl num">×{counts[cap]}</span>
                      </div>
                      <button
                        onClick={() => open(m)}
                        className="val text-[12px] truncate text-left hover:opacity-70 block w-full"
                        title={`${m.name} — view benchmarks`}
                      >
                        {m.name.replace(/\s*\(free\)\s*$/i, "")} ↗
                      </button>
                      <Bar value={m.capScores[cap]} color={CAPABILITY_COLOR[cap]} />
                      <div className="lbl num">{money(m.blendedPerM)} / 1M</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="panel p-4">
            <div className="lbl mb-3">Output format support</div>
            {formatSupports.length === 0 ? (
              <div className="lbl">No output format requested yet…</div>
            ) : (
              <div className="space-y-2.5">
                {formatSupports.map((f) => (
                  <div key={f.fmt} className="space-y-1 pl-2.5 border-l-2" style={{ borderColor: FORMAT_COLOR }}>
                    <div className="flex items-center justify-between">
                      <span className="lbl !text-fg">{FORMAT_LABEL[f.fmt]}</span>
                      <span className="lbl" style={{ color: f.supported ? "#2fd98f" : "#f0a93b" }}>
                        {f.supported ? "✓ SUPPORTED" : "⚠ NOT IN GROUP"}
                      </span>
                    </div>
                    {f.model && (
                      <button
                        onClick={() => f.model && open(f.model)}
                        className="val text-[12px] truncate text-left hover:opacity-70 block w-full"
                        title={`${f.model.name} — view benchmarks`}
                      >
                        {f.model.name.replace(/\s*\(free\)\s*$/i, "")} ↗
                      </button>
                    )}
                    {f.note && <div className="lbl">{f.note}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* verdict */}
      <div className="px-5 sm:px-7 pb-7">
        <div
          className="panel p-5"
          style={verdict ? { borderColor: GROUP_ACCENT[verdict.team.rank] + "88" } : undefined}
        >
          <div className="lbl">Most cost-efficient group for this prompt</div>
          {verdict ? (
            <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xl font-extrabold" style={{ color: GROUP_ACCENT[verdict.team.rank] }}>
                  {RANK_TITLE[verdict.team.rank]}
                </span>{" "}
                <span className="lbl">{verdict.team.id}</span>
                <div className="lbl mt-0.5">
                  Covers {detected.map((c) => CAPABILITY_LABEL[c]).join(" · ") || "general"}
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="lbl">Est. cost</div>
                  <div className="val num font-bold" style={{ color: GROUP_ACCENT[verdict.team.rank] }}>
                    {micro(verdict.cost)}
                  </div>
                </div>
                {verdict.team.id !== team?.id && (
                  <button
                    onClick={() => setTeamId(verdict.team.id)}
                    className="text-[11px] tracking-wider uppercase px-3 py-1.5 rounded-full border border-line-bright hover:bg-fg hover:text-black"
                  >
                    Switch →
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="val mt-2 text-muted">No capabilities detected yet.</div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function Playground() {
  return (
    <Suspense fallback={<div className="p-8 lbl">Loading playground…</div>}>
      <PlaygroundInner />
    </Suspense>
  );
}
