# VELA Frontend Architecture

## Shell

`OsNav` owns navigation presentation, grouping, the official wordmark, the TopBar and mobile navigation. It does not calculate business metrics. `os-main` provides the shell offset and page content owns its local composition.

## Home data flow

```text
/api/home/pulse
  -> collectVentureStats / Prisma records
  -> deterministic prediction and readiness contracts
  -> HomeDashboard presentation
```

`HomeDashboard` performs one query fetch and renders the returned view model. It does not own Capital, Risk, Velocity or Trajectory business rules.

## Activity

Recent Activity currently reads persisted Objective-adjacent, Signal, Sprint, Decision and Gate records. The in-process domain event dispatcher remains a future invalidation/analytics foundation; there is no durable event store or WebSocket consumer in Home yet.

## Future real-time path

```text
Database mutation -> domain event -> analytics/invalidation -> /api/home/pulse -> optional WebSocket refresh
```

Home is intentionally decoupled from sockets so the future transport can invalidate the same query rather than move business logic into React.
