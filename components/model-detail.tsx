"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Bar, BeetleIcon } from "./ui";
import { CAPABILITY_COLOR, C } from "@/lib/palette";
import { CAPABILITIES, CAPABILITY_LABEL, type Model } from "@/lib/types";

const Ctx = createContext<{ open: (m: Model) => void }>({ open: () => {} });
export function useModelDetail() {
  return useContext(Ctx);
}

function money(n: number): string {
  if (n === 0) return "$0.00";
  if (n < 0.01) return "<$0.01";
  return "$" + n.toFixed(2);
}
function ctx(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0) + "M";
  if (n >= 1000) return Math.round(n / 1000) + "K";
  return String(n);
}
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="lbl">{label}</div>
      <div className="text-xl font-extrabold num mt-0.5">{value}</div>
      {sub && <div className="lbl">{sub}</div>}
    </div>
  );
}

function Tag({ children, color = "#2fd98f" }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="lbl px-2 py-0.5 rounded-full"
      style={{ background: color + "22", color }}
    >
      {children}
    </span>
  );
}

function Overlay({ model, onClose }: { model: Model; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const maxPrice = Math.max(
    model.pricePromptPerM,
    model.priceCompletionPerM,
    model.blendedPerM,
    0.01
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-auto"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="panel w-full max-w-lg my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-4 py-3.5 border-b border-line">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg border border-line flex items-center justify-center text-fg shrink-0 mt-0.5">
              <BeetleIcon size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-extrabold leading-tight truncate" title={model.name}>
                {model.name.replace(/\s*\(free\)\s*$/i, "")}
              </div>
              <div className="lbl mt-0.5 truncate">{model.id}</div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {model.flagship && <Tag color="#9d7bff">FLAGSHIP</Tag>}
                {model.free && <Tag color="#2fd98f">FREE</Tag>}
                {model.canImage && <Tag color="#ff4d9d">IMAGE OUTPUT</Tag>}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lbl border border-line-bright rounded-full px-2.5 py-1 hover:bg-fg hover:text-black shrink-0"
          >
            ✕ ESC
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 px-4 py-3.5 border-b border-line">
          <Stat label="QUALITY" value={String(model.quality)} sub="OF 100" />
          <Stat label="BENCHMARK" value={String(model.benchmark)} sub="INDEX" />
          <Stat label="CONTEXT" value={ctx(model.contextLength)} sub="TOKENS" />
          <Stat label="BLENDED" value={money(model.blendedPerM)} sub="$/1M" />
        </div>

        <div className="px-4 py-3.5 border-b border-line space-y-2.5">
          <div className="lbl">Capability benchmark</div>
          {CAPABILITIES.map((cap) => (
            <Bar
              key={cap}
              label={CAPABILITY_LABEL[cap]}
              value={model.capScores[cap]}
              color={model.capScores[cap] > 0 ? CAPABILITY_COLOR[cap] : C.lineBright}
              labelWidth="w-36"
            />
          ))}
        </div>

        <div className="px-4 py-3.5 space-y-2.5">
          <div className="lbl">Pricing — $ per 1M tokens</div>
          <Bar label="INPUT" value={r2(model.pricePromptPerM)} max={maxPrice} color="#3b9eff" suffix="$" labelWidth="w-28" />
          <Bar label="OUTPUT" value={r2(model.priceCompletionPerM)} max={maxPrice} color="#ff4d9d" suffix="$" labelWidth="w-28" />
          <Bar label="BLENDED 70/30" value={r2(model.blendedPerM)} max={maxPrice} color="#2fd98f" suffix="$" labelWidth="w-28" />
        </div>
      </div>
    </div>
  );
}

export function ModelDetailProvider({ children }: { children: React.ReactNode }) {
  const [model, setModel] = useState<Model | null>(null);
  const open = useCallback((m: Model) => setModel(m), []);
  const close = useCallback(() => setModel(null), []);
  return (
    <Ctx.Provider value={{ open }}>
      {children}
      {model && <Overlay model={model} onClose={close} />}
    </Ctx.Provider>
  );
}
