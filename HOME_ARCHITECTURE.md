# Home Architecture

## Aggregation endpoint

`GET /api/home/pulse` is the Home query boundary. It returns:

- venture and persisted phase;
- `MetricResult` metrics for velocity, validation, risk, readiness and key counts;
- current persisted Sprint and item progress;
- deterministic trajectory/risk assessments;
- next actions derived from blocked/at-risk objectives, missing evidence, gates and Sprints;
- recent persisted records;
- one deterministic AI-style observation/recommendation with an evidence key.

## Real versus insufficient data

- Execution Velocity requires Sprints or decisions.
- Validation Activity requires Signals.
- Risk requires objectives or Sprints.
- Capital Readiness returns insufficient data for an empty venture and follows the backend readiness semantics.
- Trajectory remains insufficient below three historical objective/Sprint/signal records.
- Team Momentum remains insufficient until team activity data exists.

## Components

`src/app/vela/home-dashboard.tsx` composes Venture Context, Venture Pulse, Current Sprint, VELA AI, Trajectory, Key Metrics, Next Actions, Recent Activity and Network context. It reuses `Metric`, `DataState`, existing shell navigation and official brand assets.

## Explicit gaps

There is no durable activity/event store yet, so Home does not claim to render domain events. There is no live socket update or synthetic trajectory chart. Network context is a real route CTA only; people and opportunities are not fabricated.
