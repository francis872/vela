# VELA Venture — Venture Evaluation & Portfolio Intelligence 2.14

## Purpose

VELA Venture is the Venture Intelligence bounded context of VELA 2.14. It does not replace the existing VELA operating modules; it composes their evidence into a time-aware, explainable representation of a venture.

The target cycle is:

```
VENTURE
  -> EVIDENCE
  -> STATE
  -> DIGITAL TWIN
  -> TRAJECTORY
  -> HYPOTHESIS
  -> EXPERIMENT
  -> RESULT
  -> LEARNING
  -> NEW EVIDENCE
  -> NEW STATE
```

At portfolio level:

```
VENTURE STATES
  -> PORTFOLIO
  -> COHORT ANALYSIS
  -> RISKS / NEEDS / PATTERNS
  -> INTERVENTIONS
  -> NEW EVIDENCE
  -> PORTFOLIO LEARNING
```

## Phase 0 discovery summary

### Stack found
- Next.js 16 App Router
- React 19
- TypeScript 5
- Prisma 6
- PostgreSQL
- MongoDB Atlas driver
- Zod
- JWT/session auth with persisted `AuthSession`
- SSE endpoint based on canonical domain events
- existing WebSocket abstraction, not a production WebSocket server

### Existing components to reuse

| Capability | Existing implementation | Reuse decision |
|---|---|---|
| Venture canonical identity | `Venture` Prisma model | REUSE |
| Team | `VentureMember`, `WorkAssignment` | REUSE |
| Legacy evaluation | `Evaluation` | KEEP AS LEGACY; DO NOT EXTEND INTO NEW MODEL |
| Validation evidence-lite | `Signal` | REUSE AS SOURCE; do not treat as universal evidence model |
| Builder experiments | `BuilderExperiment` | KEEP; future migration/adapter into experiment domain |
| Financial evidence | `FinancialSnapshot` | REUSE |
| Risk | `RiskAssessment`, `RiskSignal`, `ResilienceSnapshot` | REUSE |
| Interventions | `Intervention`, `InterventionLearning` | REUSE |
| Decision learning | `DecisionLearning` | REUSE |
| Cohorts | `Cohort`, `CohortVenture` | REUSE |
| Portfolio risk | `PortfolioRiskSnapshot` | REUSE |
| Venture state engine | `src/lib/intelligence/state/venture-state.ts` | REUSE/ADAPT |
| State comparison | `compareStates` | REUSE |
| State quality | `assessStateQuality` | REUSE |
| Digital Twin | `venture-twin.ts` | REUSE |
| GWO | `optimization/gwo.ts` | REUSE |
| Similarity | `similarity/*` | REUSE |
| Portfolio Intelligence | `portfolio/*` | REUSE |
| Explainability/confidence | `explainability/*` | REUSE |
| Graph Intelligence | `graph/*` | REUSE |
| Learning Memory | `learning/*` | REUSE |
| Event Store | `DomainEventRecord`, `event-store.ts` | REUSE |
| Atlas intelligence store | `intelligence-store.ts` | REUSE |
| Realtime SSE | `/api/home/events` | REUSE SHORT TERM |
| Auth guard | `requireAuth()` | REUSE |
| Contextual authorization | partial | EXTEND LATER |

### Missing canonical pieces

The following are not present as equivalent persistent models and must be added incrementally:

- canonical venture evidence with provenance;
- evaluation model/version definitions;
- dimension definitions;
- indicator definitions;
- versioned venture evaluations;
- dimension results with confidence/uncertainty;
- multidimensional Venture State snapshots;
- explicit trajectory records;
- canonical hypotheses;
- canonical venture experiments/results;
- recommendation records with traceability;
- portfolio entity independent from cohort;
- portfolio membership and portfolio snapshots;
- intervention linkage to organizations/ventures where required;
- realtime Trust Layer;
- guaranteed outbox/replay pipeline on master.

## Architecture decision

PostgreSQL remains canonical:

```
PostgreSQL
  -> DomainEventRecord / future Outbox
  -> Atlas projections
  -> Intelligence Engines
  -> Change Streams (future)
  -> Trust Layer (future)
  -> Realtime
```

MongoDB Atlas never becomes the authority for:
- ownership;
- permissions;
- evidence truth;
- experiment result truth;
- venture stage truth;
- portfolio membership.

## Phase 1 scope

Phase 1 creates only the domain foundation needed to support later engines:

1. `VentureEvidence`
2. versioned evaluation model definitions
3. `VentureEvaluation`
4. per-dimension evaluation result
5. `VentureStateSnapshot`

It deliberately does NOT implement PMF probability, recommendations, portfolio UI, Change Streams or GWO orchestration yet.

## Compatibility policy

- Existing `Evaluation` remains untouched as legacy VELASEED data.
- Existing `Signal` remains valid.
- Existing `BuilderExperiment` remains valid.
- Existing Venture UI remains valid.
- New models use explicit `Venture*` prefixes where name collision or semantic ambiguity exists.
- Existing public API contracts are not modified in Phase 1.
