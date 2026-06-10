# BEETLE / BTL-01 — Model Cost & Performance Advisor (beta)

Beetle pulls every live model from **OpenRouter**, scores each on **cost + performance**,
and assembles **3 budget-capped "teams"** of models. Pick a team, drop into a playground,
and watch your prompt get colour-coded live by intent — each highlighted keyword surfaces
the team model that would handle it, with a verdict on the most cost-efficient group.

## How it works

- **Data** — `app/api/models/route.ts` fetches OpenRouter's `/api/v1/models` live (1h cache)
  and falls back to the committed snapshot in `data/snapshot.json` if the API is unreachable.
- **Scoring** (`lib/scoring.ts`) — pricing → blended `$/1M tokens` (70% prompt / 30% completion),
  capabilities derived from `supported_parameters` (tools, reasoning) and `input_modalities`
  (vision), quality from a **hybrid** curated tier table refined per-axis.
- **Teams** (`lib/groups.ts`) — three trade-offs (BUDGET / BALANCED / MAX-PERFORMANCE).
  **Worst-case budget guarantee:** every member's blended `$/1M` ≤ your budget, so processing
  1M tokens never exceeds budget no matter how it's orchestrated.
- **Playground** (`app/playground/page.tsx`) — `lib/keywords.ts` segments the prompt and tags
  keywords by capability; a transparent textarea over a coloured backdrop renders the live
  highlight. Execution is **simulate-only** (no API key, no real calls).

## Design

NASA / Berkeley-Graphics technical test-report aesthetic — pure-black canvas, JetBrains Mono,
hairline-bordered data-grid cells, swatch palette (`lib/palette.ts`) driving both the keyword
highlights and the benchmark/quality graphs.

## Run

```bash
npm run dev   # http://localhost:3000
```

## Capability → colour

| Axis | Colour |
|---|---|
| Reasoning / Thinking | purple |
| Coding | cyan |
| Vision | magenta |
| Tool calling | amber |
| Research / General | teal |
