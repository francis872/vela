# VELA Metric Contracts

Canonical derived metrics use `MetricResult` from `src/lib/functional-contracts.ts`:

```ts
{
  status: "READY" | "INSUFFICIENT_DATA" | "UNAVAILABLE",
  value: number | null,
  label?: string,
  explanation?: string,
  calculatedAt: string,
  sampleSize?: number
}
```

`READY` with `value: 0` is valid when the sample exists and the measured result is zero. `INSUFFICIENT_DATA` must use `value: null`.

| Metric | Source | Formula / meaning | Required data | Insufficient-data rule | Version |
|---|---|---|---|---|---|
| Early Builder | `src/app/engine/engine-page.tsx` | `FounderScore.execution + results + collaboration` mapped through `LEVEL_THRESHOLDS` | Founder score | UI level is `Early Builder` for a zero score; it is a level, not evidence | Existing rules |
| Completed Sprints | `src/app/api/engine/genome/route.ts` | Count of Sprints with `status = completed` | Sprint records | Zero is valid when Sprint records exist and none completed | genome-v1 |
| PMF Evidence | `src/app/api/engine/genome/route.ts` | Heuristic from signal coverage, type diversity, density and recency | Validation signals; objective links improve coverage | No signals => `INSUFFICIENT_DATA`; not a validated probability model | genome-v1 |
| Risk | `src/app/api/engine/genome/route.ts`, `src/lib/predictions.ts` | Blocked objectives/Sprints, inactivity and execution score | Operational records | No operational records => `INSUFFICIENT_DATA` | genome-v1 / rules-v1 |
| Execution Velocity | `src/app/api/engine/genome/route.ts` | Sprint completion, item completion, execution score and decision activity | Sprints or decisions | No Sprints and no decisions => `INSUFFICIENT_DATA` | genome-v1 |
| Investment Readiness | `src/app/api/capital/readiness/route.ts` | Weighted available components: gates 0.5, evidence breadth 0.3, objective completion 0.2 | Gates, signals and objectives | No weighted component available => `INSUFFICIENT_DATA` | readiness-v1 |
| Operational Health | `src/app/api/engine/genome/route.ts` | Objective health, signal coverage and item completion | Objectives or Sprint items | Neither objectives nor Sprint items => `INSUFFICIENT_DATA` | genome-v1 |
| Team Momentum | `src/app/api/engine/genome/route.ts` | Collaboration score, connections and recent decisions | Connections, collaboration score or decisions | No team activity evidence => `INSUFFICIENT_DATA` | genome-v1 |
| Predictive Execution Signals | `src/app/api/engine/trajectory/route.ts` | Explainable trajectory and execution/validation risk rules | Venture stats | Each assessment exposes availability and factors | rules-v1 |
| Trajectory | `src/lib/predictions.ts` | Evidence, blocked ratio, Sprint completion, recency and decisions | At least 3 objective/Sprint/signal records | Fewer than 3 records => `INSUFFICIENT_DATA` | rules-v1 |

The genome endpoint retains legacy `indicators` for compatibility while exposing canonical `metricResults` and `startupHealthIndexResult`. Legacy indicator values are now nullable when evidence is insufficient. New consumers must use the canonical results and must not treat `null` as zero.
