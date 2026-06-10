"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bar, Header, LivePill } from "@/components/ui";
import { Nav } from "@/components/nav";
import { useModelDetail } from "@/components/model-detail";
import { CAPABILITY_COLOR, C } from "@/lib/palette";
import {
  CAPABILITIES,
  CAPABILITY_LABEL,
  type Capability,
  type Model,
} from "@/lib/types";

function money(n: number): string {
  if (n === 0) return "Free";
  if (n < 0.01) return "<$0.01";
  return "$" + n.toFixed(2);
}

type SortKey = "quality" | "price-asc" | "price-desc" | "name";

export default function ModelsPage() {
  const router = useRouter();
  const { open } = useModelDetail();
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("quality");
  const [capFilter, setCapFilter] = useState<Set<Capability>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((d) => setModels(d.models ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = models.filter((m) => {
      if (q && !m.name.toLowerCase().includes(q) && !m.id.toLowerCase().includes(q)) return false;
      for (const c of capFilter) if (!m.caps.includes(c)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "price-asc":
          return a.blendedPerM - b.blendedPerM || b.quality - a.quality;
        case "price-desc":
          return b.blendedPerM - a.blendedPerM;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return b.quality - a.quality || a.blendedPerM - b.blendedPerM;
      }
    });
    return list;
  }, [models, query, sort, capFilter]);

  function toggleCap(c: Capability) {
    setCapFilter((prev) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });
  }
  function toggleSel(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const selectedModels = models.filter((m) => selected.has(m.id));
  const maxBlended = selectedModels.reduce((a, m) => Math.max(a, m.blendedPerM), 0);

  function createGroup() {
    if (!selected.size) return;
    const budget = Math.max(1, Math.ceil(maxBlended));
    const ids = [...selected].join(",");
    router.push(`/playground?budget=${budget}&team=CUSTOM&custom=${encodeURIComponent(ids)}`);
  }

  return (
    <main className="max-w-6xl mx-auto w-full my-4 sm:my-6 rounded-2xl border border-line bg-surface overflow-hidden pb-24">
      <Header
        subtitle="Browse every model · select any to build your own group"
        right={<LivePill text={loading ? "CONNECTING…" : `${models.length} MODELS`} />}
      />
      <Nav />

      {/* controls */}
      <section className="px-5 sm:px-7 py-5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search model or provider…"
            className="flex-1 bg-panel border border-line-bright rounded-lg px-3.5 py-2.5 text-[13px] outline-none focus:border-[#3b9eff]"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="bg-panel border border-line-bright rounded-lg px-3.5 py-2.5 text-[13px] outline-none focus:border-[#3b9eff]"
          >
            <option value="quality">Sort: Quality</option>
            <option value="price-asc">Sort: Price (low→high)</option>
            <option value="price-desc">Sort: Price (high→low)</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {CAPABILITIES.map((c) => {
            const on = capFilter.has(c);
            return (
              <button
                key={c}
                onClick={() => toggleCap(c)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] tracking-wider uppercase transition-colors"
                style={{
                  borderColor: on ? CAPABILITY_COLOR[c] + "99" : C.line,
                  background: on ? CAPABILITY_COLOR[c] + "1f" : "transparent",
                  color: on ? "#fff" : C.muted,
                }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: CAPABILITY_COLOR[c] }} />
                {CAPABILITY_LABEL[c]}
              </button>
            );
          })}
          <span className="lbl self-center ml-1">{filtered.length} shown</span>
        </div>
      </section>

      {/* table */}
      <section className="px-5 sm:px-7">
        <div className="panel overflow-hidden">
          <div className="hidden md:grid grid-cols-[28px_1fr_140px_1fr_90px] gap-3 px-4 py-2.5 border-b border-line lbl">
            <span />
            <span>Model</span>
            <span>Capabilities</span>
            <span>Quality</span>
            <span className="text-right">$/1M</span>
          </div>
          {loading ? (
            <div className="p-10 text-center lbl">Fetching model feed…</div>
          ) : (
            <ul>
              {filtered.map((m) => {
                const on = selected.has(m.id);
                return (
                  <li
                    key={m.id}
                    className="grid grid-cols-[28px_1fr] md:grid-cols-[28px_1fr_140px_1fr_90px] gap-3 px-4 py-2.5 border-b border-line items-center transition-colors"
                    style={{ background: on ? "rgba(59,158,255,0.08)" : "transparent" }}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleSel(m.id)}
                      className="w-4 h-4 accent-[#3b9eff]"
                    />
                    <div className="min-w-0">
                      <button
                        onClick={() => open(m)}
                        className="val text-[13px] truncate text-left hover:opacity-70 block w-full"
                        title={`${m.name} — view benchmarks`}
                      >
                        {m.name.replace(/\s*\(free\)\s*$/i, "")} ↗
                      </button>
                      <span className="lbl">{m.provider.toUpperCase()}</span>
                    </div>
                    <div className="hidden md:flex gap-1.5 flex-wrap">
                      {m.caps.length === 0 && <span className="lbl">—</span>}
                      {m.caps.map((c) => (
                        <span
                          key={c}
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ background: CAPABILITY_COLOR[c] }}
                          title={CAPABILITY_LABEL[c]}
                        />
                      ))}
                    </div>
                    <div className="hidden md:block">
                      <Bar value={m.quality} color={m.quality >= 85 ? "#2fd98f" : "#3b9eff"} labelWidth="w-0" />
                    </div>
                    <div className="hidden md:block val num text-[12px] text-right">{money(m.blendedPerM)}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* selection bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-line-bright" style={{ background: "rgba(10,11,13,0.96)", backdropFilter: "blur(8px)" }}>
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-3.5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="val font-bold">{selected.size} model{selected.size > 1 ? "s" : ""} selected</span>
              <span className="lbl ml-3">
                Worst-case {money(maxBlended)} / 1M · covers{" "}
                {CAPABILITIES.filter((c) => selectedModels.some((m) => m.caps.includes(c))).length}/5 axes
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setSelected(new Set())}
                className="lbl border border-line-bright rounded-full px-3.5 py-2 hover:bg-fg hover:text-black"
              >
                Clear
              </button>
              <button
                onClick={createGroup}
                className="text-[12px] tracking-wider uppercase rounded-full px-4 py-2 font-bold text-black"
                style={{ background: "#2fd98f", boxShadow: "0 0 16px rgba(47,217,143,0.4)" }}
              >
                Create group & open playground →
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
