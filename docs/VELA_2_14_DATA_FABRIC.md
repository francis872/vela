# VELA 2.14 — Data Fabric

## Principle

PostgreSQL is the operational system of record. MongoDB Atlas is the computational intelligence memory.

A business transaction is successful based on PostgreSQL. Atlas persistence is intentionally best-effort: an Atlas outage must not invalidate an operational transaction.

## PostgreSQL owns
Identity, authentication, organizations, ventures, execution, financial state, risk, investments, decisions, consent, governance and canonical domain events.

## MongoDB Atlas owns projections
- `computational_runs`
- `feature_snapshots`
- `optimization_runs`
- `digital_twin_runs`
- `learning_memory`
- `graph_snapshots`
- `event_documents`
- `encrypted_models`

These documents are derived intelligence, history, simulation or memory. They are not authoritative operational records.

## Flow
```
PostgreSQL mutation
  -> canonical DomainEventRecord
  -> best-effort Mongo event projection
  -> intelligence engines
  -> snapshots / optimization / Digital Twin / learning documents
```

## Configuration
Set `DATABASE_URL`, `MONGODB_ATLAS_URI` and optionally `MONGODB_DATABASE`.

Authenticated `GET /api/system/data-fabric` reports both stores independently.
Authenticated `POST /api/system/data-fabric` initializes Atlas indexes.

## Failure policy
Never perform a Mongo write before the PostgreSQL transaction that establishes operational truth. Mongo failures are logged and must be recoverable by replaying PostgreSQL domain events.

## VELA 2.14 next hardening
Add an outbox/replay worker, cryptographic event chain, encrypted model artifact service, retention policies and realtime Change Stream worker.
