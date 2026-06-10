"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Header, LivePill } from "@/components/ui";
import { Nav } from "@/components/nav";
import { TeamCard, TeamCompare } from "@/components/teams";
import { buildTeams, inBudgetCount } from "@/lib/groups";
import type { Model, Team } from "@/lib/types";

function Shield() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-[3px]">
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export default function Home() {
  const router = useRouter();
  const [models, setModels] = useState<Model[]>([]);
  const [source, setSource] = useState<string>("…");
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState(20);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((d) => {
        setModels(d.models ?? []);
        setSource(d.source ?? "snapshot");
      })
      .catch(() => setSource("error"))
      .finally(() => setLoading(false));
  }, []);

  const teams = useMemo(() => buildTeams(models, budget), [models, budget]);
  const inBudget = useMemo(() => inBudgetCount(models, budget), [models, budget]);

  const bestId = useMemo(() => {
    let best: Team | null = null;
    let bestVal = -Infinity;
    for (const t of teams) {
      const val = t.avgQuality / (1 + t.evenSplitPerM);
      if (val > bestVal) {
        bestVal = val;
        best = t;
      }
    }
    return best?.id;
  }, [teams]);

  function selectTeam(t: Team) {
    router.push(`/playground?budget=${budget}&team=${t.id}`);
  }

  return (
    <main className="max-w-6xl mx-auto w-full my-4 sm:my-6 rounded-2xl border border-line bg-surface overflow-hidden">
      <Header
        subtitle="Compare live OpenRouter models by cost & performance"
        right={
          <LivePill text={loading ? "CONNECTING…" : `${source.toUpperCase()} | ${models.length} MODELS`} />
        }
      />
      <Nav />

      {/* budget control */}
      <section className="px-5 sm:px-7 py-5">
        <div className="panel p-5">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5 items-center">
            <div>
              <label className="lbl">Max cost per 1,000,000 tokens</label>
              <div className="flex items-center gap-3 mt-2.5">
                <span className="text-3xl font-extrabold">$</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={budget}
                  onChange={(e) => setBudget(Math.max(0, Number(e.target.value) || 0))}
                  className="bg-panel2 border border-line-bright rounded-lg px-3 py-1.5 w-28 text-3xl font-extrabold num outline-none focus:border-[#2fd98f]"
                />
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={0.5}
                  value={Math.min(budget, 50)}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="flex-1 min-w-40 accent-[#2fd98f]"
                />
              </div>
            </div>
            <div className="text-right">
              <div className="lbl">In-budget models</div>
              <div className="text-2xl font-extrabold num mt-0.5">
                <span style={{ color: "#2fd98f" }}>{inBudget}</span>
                <span className="text-muted text-base"> / {models.length}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4 pt-4 border-t border-line text-muted">
            <Shield />
            <p className="lbl">
              Worst-case guarantee — every model in a group costs ≤ ${budget} / 1M, so processing
              1M tokens never exceeds your budget, however the work is split.
            </p>
          </div>
        </div>
      </section>

      {/* groups */}
      <section className="px-5 sm:px-7 pb-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="val font-bold flex items-center gap-2">
            <span style={{ color: "#f0a93b" }}>★</span> Recommended groups
          </h2>
          <span className="lbl">Select a group to open the playground →</span>
        </div>

        {loading ? (
          <div className="panel p-10 text-center lbl">Fetching model feed…</div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {teams.map((t) => (
                <TeamCard key={t.id} team={t} best={t.id === bestId} onSelect={selectTeam} />
              ))}
            </div>
            <TeamCompare teams={teams} budget={budget} />
          </>
        )}
      </section>
    </main>
  );
}
