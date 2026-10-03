# VELA Venture — Architecture

## Bounded context

```
src/lib/venture/
  domain/
  repositories/
  services/
  dto/
```

The bounded context consumes existing VELA services instead of duplicating them.

## Dependency direction

```
API Route
  -> Application Service
  -> Repository Interface
  -> Prisma Repository

Application Service
  -> Existing Intelligence Engines
  -> Event Store

PostgreSQL
  -> Atlas projection (derived only)
```

## Core state vector

```
V_t = [
  M_t,
  P_t,
  PMF_t,
  TR_t,
  BM_t,
  TM_t,
  EX_t,
  CR_t
]
```

Dimensions:
- PROBLEM_MARKET
- PRODUCT
- VALIDATION_PMF
- TRACTION
- BUSINESS_MODEL
- TEAM
- EXECUTION
- CAPITAL_RISK

Each dimension result stores:
- value or null;
- confidence or null;
- evidenceCount;
- verifiedEvidenceCount;
- uncertainty;
- model version;
- explanation;
- supporting evidence references.

Missing evidence is represented explicitly, not imputed.

## Phase 0 impact map

### Files to create in Phase 1
- `prisma/migrations/<timestamp>_venture_intelligence_foundation/migration.sql`
- `src/lib/venture/domain/types.ts`
- `src/lib/venture/repositories/venture-intelligence-repository.ts`
- `src/lib/venture/repositories/prisma-venture-intelligence-repository.ts`
- `src/lib/venture/services/evidence-service.ts`
- `src/lib/venture/services/venture-state-engine.ts`
- tests for domain/state foundation
- `docs/venture/*`

### Files to modify in Phase 1
- `prisma/schema.prisma`
- later, only after repository/service verification, selected APIs

### Future modifications
- `src/lib/intelligence/state/venture-state.ts` becomes a source adapter, not deleted.
- `src/lib/intelligence/intelligence-store.ts` gains Venture State projection support.
- `src/lib/event-store.ts` participates in state/evidence events.
- `src/app/venture/*` evolves into Venture Command Center after backend foundation.
- portfolio routes/UI added only after portfolio domain exists.

## Regression risks

1. **Legacy Evaluation semantic collision**  
   Mitigation: create `VentureEvaluation`; do not alter existing Evaluation contract.

2. **Owner-centric access**  
   Current APIs resolve Venture through `userId=session.sub`. New APIs must use contextual access resolution before multi-actor support.

3. **Signal vs Evidence duplication**  
   Signal is a validation source, not the universal evidence model. Adapters should reference/import Signals rather than clone them silently.

4. **BuilderExperiment duplication**  
   Existing BuilderExperiment is too shallow for the target lifecycle. Keep it and migrate/adapter later.

5. **State engine duplication**  
   Existing `VentureState` is operational and useful. New Venture State Snapshot should persist the multidimensional evaluation output while reusing operational features.

6. **Realtime overclaim**  
   Current production-friendly path is SSE polling DomainEventRecord. Atlas Change Streams remain future Phase 10.

7. **Outbox gap**  
   Current Event Store + best-effort Atlas projection is not a transactional outbox. Phase 11 must close that gap.

8. **CI verify script**  
   Existing `npm run verify` references aliases not all present; verification must use focused scripts until CI is repaired.

## Incremental plan

### Phase 1
Canonical evidence, model versions, evaluations, dimension results and state snapshots.

### Phase 2
Evaluation model/configuration + explainable State Engine.

### Phase 3
Evidence ingestion/baseline V0/provenance.

### Phase 4
Trajectory and delta engine.

### Phase 5
Canonical hypothesis/experiment/result lifecycle + Learning Memory adapter.

### Phase 6
PMF Probability, recommendations, similarity, forecasting and risk integration.

### Phase 7
Digital Twin, Graph and GWO orchestration.

### Phase 8
Portfolio domain + portfolio intelligence.

### Phase 9
Venture and Portfolio Command Centers.

### Phase 10
Change Streams + Trust Layer + realtime delivery.

### Phase 11
Outbox + replay hardening.

### Phase 12
Security, observability, performance, complete testing and docs.
