import React from "react";
import { CAPABILITY_COLOR, C } from "@/lib/palette";
import { CAPABILITY_LABEL, type Capability } from "@/lib/types";

// ---- Beetle mark ----
export function BeetleIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="13.5" rx="5" ry="6.5" />
      <line x1="12" y1="7" x2="12" y2="20" />
      <circle cx="12" cy="5" r="2.1" />
      <path d="M10.4 4 9 2.4M13.6 4 15 2.4" />
      <path d="M7 10.5 3.2 8.5M7 13.5 3 13.5M7 16.5 3.4 18.5" />
      <path d="M17 10.5 20.8 8.5M17 13.5 21 13.5M17 16.5 20.6 18.5" />
    </svg>
  );
}

// ---- Page header ----
export function Header({
  subtitle,
  icon = false,
  right,
}: {
  subtitle?: string;
  icon?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <header className="px-5 sm:px-7 py-5 flex items-start justify-between gap-5">
      <div className="flex items-center gap-3.5">
        {icon && (
          <div className="w-11 h-11 rounded-xl border border-line flex items-center justify-center text-fg shrink-0">
            <BeetleIcon />
          </div>
        )}
        <div>
          <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight leading-none">
            The Beetle Project
          </h1>
          {subtitle && <p className="lbl mt-2">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}

// ---- Live / status pill ----
export function LivePill({ text, dot = "#2fd98f" }: { text: string; dot?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 lbl whitespace-nowrap">
      <span
        className="w-2 h-2 rounded-full"
        style={{ background: dot, boxShadow: `0 0 7px ${dot}` }}
      />
      {text}
    </span>
  );
}

// ---- Capability label with colour key ----
export function CapBadge({ cap }: { cap: Capability }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ background: CAPABILITY_COLOR[cap], boxShadow: `0 0 6px ${CAPABILITY_COLOR[cap]}66` }}
      />
      <span className="lbl !text-fg">{CAPABILITY_LABEL[cap]}</span>
    </span>
  );
}

// ---- Horizontal bar ----
export function Bar({
  label,
  value,
  color,
  max = 100,
  suffix,
  labelWidth = "w-24",
}: {
  label?: string;
  value: number;
  color: string;
  max?: number;
  suffix?: string;
  labelWidth?: string;
}) {
  const pct = Math.max(2, Math.min(100, (value / max) * 100));
  return (
    <div className="flex items-center gap-2.5">
      {label !== undefined && (
        <div className={`lbl ${labelWidth} shrink-0 truncate`} title={label}>
          {label}
        </div>
      )}
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: C.track }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 9px ${color}55` }}
        />
      </div>
      <div className="val num w-14 text-right text-[12px]">
        {value}
        {suffix ?? ""}
      </div>
    </div>
  );
}

// ---- Dot-on-track (for cost comparison) ----
export function DotTrack({
  label,
  value,
  max,
  color,
  valueText,
  labelWidth = "w-28",
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  valueText: string;
  labelWidth?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex items-center gap-2.5">
      <div className={`lbl ${labelWidth} shrink-0 truncate`}>{label}</div>
      <div className="relative flex-1 h-1.5 rounded-full" style={{ background: C.track }}>
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
          style={{
            left: `calc(${pct}% - 6px)`,
            background: color,
            boxShadow: `0 0 9px ${color}`,
          }}
        />
      </div>
      <div className="val num w-20 text-right text-[12px]">{valueText}</div>
    </div>
  );
}

// ---- Labelled cell ----
export function Cell({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div>
      <div className="lbl">{label}</div>
      <div className="val mt-1.5">{children}</div>
    </div>
  );
}
