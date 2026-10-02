# VELA 2.14 — FASE 10: Diagramas funcionales y de arquitectura

Estado: ESPECIFICACION VERSIONABLE  
Base: FASE 1–9  
Objetivo: representar visualmente la arquitectura REAL y la arquitectura OBJETIVO, diferenciando claramente IMPLEMENTADO / PARCIAL / FALTANTE.

Leyenda:
- IMPLEMENTADO: flujo existente en master.
- PARCIAL: existe parte sustancial, pero faltan piezas.
- FALTANTE: arquitectura objetivo aun no implementada.

---

# 1. Arquitectura funcional general

```mermaid
flowchart TD
    A[Actor humano] --> UI[Next.js UI]
    UI --> API[Route Handlers / APIs]
    API --> AUTH[Auth / Authorization]
    AUTH --> APP[Application logic / services]
    APP --> PG[(PostgreSQL)]
    APP --> EVT[Domain Events]
    EVT --> INT[Intelligence Layer]
    INT --> ATLAS[(MongoDB Atlas)]
    APP --> RESP[Response]
    RESP --> UI

    INT --> GWO[GWO / Optimization]
    INT --> TWIN[Digital Twin]
    INT --> GRAPH[Graph Intelligence]
    INT --> LM[Learning Memory]
    INT --> FC[Forecasting / Matching / Risk / Confidence]
```

## Estado
- UI/API/PostgreSQL/Event Store/engines: IMPLEMENTADO.
- Atlas projection: PARCIAL.
- Change Streams/Trust/Realtime completo: FALTANTE.

---

# 2. Autorizacion contextual

```mermaid
flowchart TD
    REQ[Protected request]
    REQ --> JWT[Validate token]
    JWT --> SES[Validate AuthSession]
    SES --> MFA{MFA satisfied?}
    MFA -- No --> DENY1[DENY / MFA flow]
    MFA -- Yes --> SCOPE[Resolve scope]
    SCOPE --> OWN{Owner?}
    OWN -- Yes --> CAP[Resolve capability]
    OWN -- No --> MEM[Resolve membership]
    MEM --> CAP
    CAP --> CONS{Consent required?}
    CONS -- Yes --> CONSCHK[Validate consent]
    CONS -- No --> DECIDE[Authorization decision]
    CONSCHK --> DECIDE
    DECIDE -->|ALLOW| ACTION[Execute CU]
    DECIDE -->|DENY| DENY2[403 / fail closed]
    ACTION --> AUDIT{Privileged mutation?}
    AUDIT -- Yes --> LOG[AuditLog / SecurityEvent]
    AUDIT -- No --> DONE[Continue]
    LOG --> DONE
```

## Estado
- JWT/AuthSession/MFA: IMPLEMENTADO/PARCIAL.
- Membership/capability resolver: FALTANTE.
- Consent in selected flows: PARCIAL.

---

# 3. Build — secuencia Objective → Event Store → Intelligence

```mermaid
sequenceDiagram
    actor Founder
    participant UI as Build UI
    participant API as /api/objectives
    participant Auth as Auth Layer
    participant PG as PostgreSQL
    participant ES as Event Store
    participant BI as Build Intelligence
    participant Atlas as MongoDB Atlas

    Founder->>UI: Create/Update Objective
    UI->>API: POST/PATCH objective
    API->>Auth: verify access
    Auth-->>API: allow
    API->>PG: persist Objective
    PG-->>API: commit
    API->>ES: append domain event
    ES-->>API: event recorded
    API-->>UI: success

    UI->>BI: refresh intelligence
    BI->>PG: read objectives/dependencies/signals
    BI-->>UI: blockers / coverage / critical path

    ES-->>Atlas: derived projection (PARCIAL)
```

## Alternativas clave
- Auth fail → no persist.
- Invalid payload → no event.
- PostgreSQL fail → rollback/no event.
- Atlas fail after commit → operational success remains; replay later.

---

# 4. Validate — secuencia de evidencia

```mermaid
sequenceDiagram
    actor Founder
    participant UI as Validate UI
    participant API as /api/signals
    participant Auth as Auth Layer
    participant PG as PostgreSQL
    participant INT as Validate Intelligence

    Founder->>UI: Record Signal
    UI->>API: POST signal
    API->>Auth: verify venture access
    Auth-->>API: allow
    API->>PG: validate Objective if linked
    PG-->>API: objective valid / unlinked allowed
    API->>PG: persist Signal
    PG-->>API: commit
    API-->>UI: created

    UI->>INT: refresh coverage
    INT->>PG: read objectives + signals
    INT-->>UI: coverage / blind spots / next evidence
```

## Regla
Validate Intelligence puede recomendar evidencia, pero nunca crear evidencia empirica automaticamente.

---

# 5. Decision → Outcome → Learning Memory

```mermaid
sequenceDiagram
    actor Founder
    participant UI as Decision UI
    participant API as Decisions API
    participant PG as PostgreSQL
    participant ES as Event Store
    participant LM as Learning Memory
    participant Atlas as MongoDB Atlas

    Founder->>UI: Register decision
    UI->>API: POST decision
    API->>PG: persist decision
    PG-->>API: commit
    API->>ES: decision_created
    API-->>UI: success

    Note over Founder,UI: Later

    Founder->>UI: Record outcome
    UI->>API: PATCH decision outcome
    API->>PG: persist outcome
    PG-->>API: commit
    API->>ES: decision_outcome_recorded

    alt consolidate learning
        API->>PG: mark learned
        API->>ES: decision_learning_consolidated
        ES->>LM: process learning
        LM->>Atlas: store derived memory
    end

    alt Atlas unavailable
        LM--xAtlas: projection fails
        Note over PG,Atlas: PostgreSQL/Event Store remain canonical; replay later
    end
```

---

# 6. Team y capability-based collaboration

```mermaid
flowchart LR
    Owner[Founder/Owner]
    Member[Team Member]
    VM[(VentureMember)]
    CAP[Capability Resolver]
    OBJ[Objectives]
    SIG[Signals]
    RES[Resources]

    Owner --> VM
    Member --> VM
    VM --> CAP

    CAP -->|venture.objectives.read/write| OBJ
    CAP -->|venture.validation.read/write| SIG
    CAP -->|venture.resources.read/write| RES
```

## Estado
- VentureMember: IMPLEMENTADO.
- Capability Resolver: FALTANTE.
- Owner-only behavior: IMPLEMENTADO.
- Member collaboration: PARCIAL.

---

# 7. Capital — flujo funcional completo

```mermaid
flowchart TD
    FS[Financial Snapshot]
    RD[Readiness]
    VAL[Valuation]
    FUND[Fundraising Plan]
    SIM[Scenario / Digital Twin / GWO]
    CONF{Explicit confirmation?}
    EXEC[Operational execution]

    FS --> RD
    FS --> VAL
    FS --> FUND
    FS --> SIM

    RD --> OUT[Evidence + Confidence]
    VAL --> OUT
    FUND --> OUT
    SIM --> OUT

    OUT --> CONF
    CONF -- No --> STOP[No canonical mutation]
    CONF -- Yes --> EXEC
```

## Regla
Simulacion no equivale a ejecucion.

---

# 8. Risk / Organization Portfolio

```mermaid
flowchart TD
    V1[Venture A Risk]
    V2[Venture B Risk]
    V3[Venture C Risk]
    CONS[Consent / authorization]
    AGG[Portfolio Risk Aggregator]
    ORG[Organization Portfolio View]

    V1 --> CONS
    V2 --> CONS
    V3 --> CONS
    CONS --> AGG
    AGG --> ORG
```

## Regla
El agregado organizacional no amplifica acceso a detalle privado.

## Estado
Organization auth: FALTANTE/PARCIAL.

---

# 9. Data Fabric 2.14 — arquitectura objetivo

```mermaid
flowchart LR
    PG[(PostgreSQL)]
    OUTBOX[Outbox / Event Store]
    PROJ[Atlas Projector]
    ATLAS[(MongoDB Atlas)]

    GWO[GWO]
    TWIN[Digital Twin]
    GRAPH[Graph Intelligence]
    LM[Learning Memory]

    CS[Atlas Change Streams]
    RT[Realtime Gateway]
    TRUST[Trust Layer]
    SUBS[Authorized subscribers]
    REPLAY[Replay Worker]

    PG --> OUTBOX
    OUTBOX --> PROJ
    PROJ --> ATLAS

    ATLAS --> GWO
    ATLAS --> TWIN
    ATLAS --> GRAPH
    ATLAS --> LM

    ATLAS --> CS
    CS --> RT
    RT --> TRUST
    TRUST --> SUBS

    PG --> REPLAY
    REPLAY --> ATLAS
```

## Estado real
| Componente | Estado |
|---|---|
| PostgreSQL | IMPLEMENTADO |
| Event Store | IMPLEMENTADO |
| Transactional Outbox | FALTANTE |
| Atlas projector | PARCIAL |
| GWO | IMPLEMENTADO |
| Digital Twin | IMPLEMENTADO |
| Graph | IMPLEMENTADO |
| Learning Memory | IMPLEMENTADO/PARCIAL |
| Change Streams | FALTANTE |
| Realtime Gateway real | PARCIAL |
| Trust Layer | FALTANTE |
| Replay | PARCIAL en Draft PR |

---

# 10. Data Fabric — secuencia de escritura canonica

```mermaid
sequenceDiagram
    participant API as Business API
    participant PG as PostgreSQL
    participant ES as Event Store/Outbox
    participant AP as Atlas Projector
    participant Atlas as MongoDB Atlas

    API->>PG: Begin transaction
    API->>PG: Write canonical state
    API->>ES: Write domain event
    PG-->>API: Commit canonical transaction

    API-->>AP: event available
    AP->>Atlas: idempotent upsert

    alt Atlas succeeds
        Atlas-->>AP: stored
    else Atlas unavailable
        Atlas--xAP: error
        Note over PG,Atlas: Canonical transaction remains valid
    end
```

## Arquitectura objetivo
El evento debe quedar atomicamente garantizado junto al estado canonico mediante outbox/transaccion.

---

# 11. Change Streams → Trust → Realtime

```mermaid
sequenceDiagram
    participant Atlas as MongoDB Atlas
    participant CS as Change Stream Worker
    participant Trust as Trust Layer
    participant PG as PostgreSQL Auth Data
    participant RT as Realtime Gateway
    participant Client as Authorized Client

    Atlas-->>CS: change event + resume token
    CS->>CS: normalize envelope
    CS->>Trust: candidate event
    Trust->>Trust: verify provenance/fingerprint
    Trust->>PG: resolve audience/membership/consent
    PG-->>Trust: canonical authorization context
    Trust->>Trust: minimize/redact payload

    alt ALLOW
        Trust->>RT: publish authorized payload
        RT-->>Client: domain update
    else REDACT
        Trust->>RT: publish reduced payload
        RT-->>Client: redacted update
    else DENY
        Trust--xRT: no publication
    end
```

## Regla
Fail closed si no puede resolverse audience, provenance o consent.

---

# 12. Replay de recuperacion

```mermaid
sequenceDiagram
    participant RW as Replay Worker
    participant PG as PostgreSQL Event Store
    participant Atlas as MongoDB Atlas
    participant CP as Replay Checkpoint

    RW->>CP: read checkpoint
    CP-->>RW: lastCreatedAt + lastEventId

    loop batches
        RW->>PG: read ordered events after checkpoint
        PG-->>RW: canonical events

        loop each event
            RW->>Atlas: idempotent upsert by postgresEventId
            alt success
                Atlas-->>RW: stored/already present
                RW->>CP: advance checkpoint
            else failure
                Atlas--xRW: error
                Note over RW,CP: checkpoint does NOT advance
                RW-->>RW: stop/retry later
            end
        end
    end

    RW->>RW: compare canonical vs mirrored count
    RW-->>RW: IN_SYNC / LAGGING
```

---

# 13. Trust Layer — decision tree

```mermaid
flowchart TD
    E[Realtime envelope]
    E --> P{Provenance valid?}
    P -- No --> D1[DENY + SecurityEvent]
    P -- Yes --> S{Scope resolvable?}
    S -- No --> D2[DENY]
    S -- Yes --> A[Resolve audience from PostgreSQL]
    A --> C{Consent/capability valid?}
    C -- No --> D3[DENY]
    C -- Yes --> M[Minimize payload]
    M --> R{Sensitive fields?}
    R -- Yes --> REDACT[REDACT]
    R -- No --> ALLOW[ALLOW]
```

---

# 14. UI state machine comun

```mermaid
stateDiagram-v2
    [*] --> Loading
    Loading --> Success: data available
    Loading --> Empty: zero records
    Loading --> Insufficient: context but not enough evidence
    Loading --> Forbidden: authenticated/no capability
    Loading --> Error: technical failure
    Success --> Degraded: realtime/Atlas/model unavailable
    Degraded --> Success: dependency recovers
    Success --> Loading: canonical refresh
```

## Regla
Empty, Insufficient y Error son estados distintos.

---

# 15. Flujo de una mutacion segura

```mermaid
flowchart TD
    U[User action]
    U --> AUTH[Auth + contextual authorization]
    AUTH --> VALID[Validate payload/business rules]
    VALID --> TX[PostgreSQL transaction]

    TX -->|rollback| ERR[Error / no event]
    TX -->|commit| EVT[Event/Outbox]
    EVT --> DERIVED[Derived processing]
    DERIVED --> UI[Refresh/invalidate UI]

    DERIVED -->|Atlas/realtime fails| DEG[Degraded mode + replay later]
```

---

# 16. Diagrama de trazabilidad funcional

```mermaid
flowchart LR
    NEED[Need]
    HU[User Story]
    OBJ[Functional Objective]
    CU[Use Case]
    RN[Business Rule]
    UI[Prototype/UI]
    API[API/Service]
    PG[(PostgreSQL)]
    EVT[Domain Event]
    INT[Intelligence]
    TEST[Test]

    NEED --> HU
    HU --> OBJ
    OBJ --> CU
    CU --> RN
    CU --> UI
    RN --> API
    UI --> API
    API --> PG
    PG --> EVT
    EVT --> INT
    CU --> TEST
    RN --> TEST
```

---

# 17. Diagramas por estado de implementacion

## IMPLEMENTADO
- AuthSession/MFA (parcial en guards legacy).
- Command/Home.
- Build owner.
- Validate owner.
- Team membership.
- Resources owner.
- Capital core.
- Risk venture.
- Event Store.
- GWO.
- Digital Twin.
- Graph Intelligence.
- Learning Memory base.

## PARCIAL
- Team member collaboration.
- Organization portfolio.
- Investor access.
- Atlas projection.
- Learning Memory 2.14.
- Realtime abstraction/SSE.
- Replay branch.

## FALTANTE
- Capability Resolver general.
- Transactional Outbox real.
- Atlas Change Streams.
- Trust Layer.
- Realtime Gateway production.
- Organization authorization complete.
- Data Fabric Health UI.

---

# 18. Salida para FASE 11

FASE 11 debe construir la matriz maestra:

HU | CU | Actor | Flujo | Alternativas | RN | UI | API | Servicio | PostgreSQL | MongoDB | Motor | Prueba | Estado

Debe permitir rastreo directo e inverso:

HU → CU → RN → UI → API → Datos → Inteligencia → TEST

y:

TEST/API/Dato → CU → HU.
