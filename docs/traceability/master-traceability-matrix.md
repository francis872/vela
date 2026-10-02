# VELA 2.14 — FASE 11: Matriz maestra de trazabilidad

Estado: TRAZABILIDAD FUNCIONAL Y TECNICA  
Base: FASE 1–10  
Objetivo: permitir rastreo bidireccional desde necesidad/HU hasta implementacion y prueba, y desde codigo/test/dato hasta requisito.

## 1. Convenciones

Estados:
- IMPLEMENTADO
- PARCIAL
- DISEÑADO
- FALTANTE

Pruebas:
- nombre real de archivo si existe evidencia directa o razonablemente asociada;
- `TEST-FALTANTE` cuando no existe cobertura identificada;
- una prueba de motor NO sustituye una prueba de autorizacion/API.

---

## 2. Matriz maestra

| HU | CU | Actor | Flujo/Alt clave | RN | UI | API/Servicio | PostgreSQL | MongoDB | Motor | Prueba | Estado |
|---|---|---|---|---|---|---|---|---|---|---|---|
| HU-CMD-001 | CU-CMD-001 | Founder | consultar pulse; 3A no venture; 4A insufficient | RN-INT-005, RN-VEN-002 | UI-CMD-001 | /api/home/pulse; Home Intelligence | Venture, Objective, Signal, Sprint, Decision | learning_memory derivada | Home Intelligence | tests/home-intelligence.test.ts | IMPLEMENTADO |
| HU-CMD-002 | CU-CMD-001 | Founder | prioridad con evidencia | RN-INT-005 | UI-CMD-001 | /api/home/pulse | mismas fuentes operativas | opcional | Home Intelligence/root cause | tests/home-intelligence.test.ts | IMPLEMENTADO |
| HU-CMD-003 | CU-CMD-001 | Founder | iniciar intervencion; 8A cancelar | RN-AUTH-*, RN-VEN-002 | UI-CMD-001 | POST /api/home/interventions | Intervention records/Event Store | derivado | Intervention Engine | TEST-FALTANTE API/CU | IMPLEMENTADO/PARCIAL |
| HU-CMD-004 | CU-CMD-001 / CU-DEC-001 | Founder | consultar/reusar aprendizaje; Atlas degradado | RN-INT-001/003/005 | UI-CMD-001, UI-DEC-001 | Learning Memory services | Decision/InterventionLearning | learning_memory | Learning Intelligence | tests/learning-intelligence.test.ts | PARCIAL |
| HU-CMD-005 | CUS-RT-001/CU-CMD-001 | System/Founder | realtime; EX-RT-001 | RN-TRUST-001–005 | UI-CMD-001 | /api/home/events; futuro RT gateway | auth context | Change Streams futuro | realtime/trust | TEST-FALTANTE | PARCIAL |
| HU-BLD-001 | CU-BLD-001 | Founder | crear objective | RN-BLD-001/002/004 | UI-BLD-001 | POST /api/objectives | Objective | event projection derivada | Build Intelligence | TEST-FALTANTE CRUD | IMPLEMENTADO |
| HU-BLD-002 | CU-BLD-001 | Founder | consultar/filter | RN-VEN-002 | UI-BLD-001 | GET /api/objectives | Objective | no requerido | — | TEST-FALTANTE API | IMPLEMENTADO |
| HU-BLD-003 | CU-BLD-001 | Founder | actualizar status | RN-BLD-001/002 | UI-BLD-001 | PATCH /api/objectives | Objective, Event | derivado | Build Intelligence | tests/cross-module-signals.test.ts (indirecta) | IMPLEMENTADO |
| HU-BLD-004 | CU-BLD-001 | Founder | delete; 4C | RN-BLD-002 | UI-BLD-001 | DELETE /api/objectives | Objective | no garantizado | — | TEST-FALTANTE | IMPLEMENTADO/PARCIAL evento |
| HU-BLD-005 | CU-BLD-001 | Founder | graph/blockers; cycle | RN-BLD-003 | UI-BLD-001 | /api/build/intelligence; /api/objectives/graph | ObjectiveDependency | graph snapshots opcional | Graph Intelligence | tests/graph-intelligence.test.ts | IMPLEMENTADO |
| HU-BLD-006 | CU-BLD-002 | Team member | membership/capability; 3A/3B/4A | RN-AUTH-003/004, RN-VEN-002/003, RN-TEAM-003/004 | UI-BLD-001 read/write contextual | objectives + futuro capability service | Objective, VentureMember | no auth | Capability Resolver | TEST-FALTANTE | PARCIAL/FALTANTE |
| HU-VAL-001 | CU-VAL-001 | Founder | registrar Signal | RN-VAL-001/003 | UI-VAL-001 | POST /api/signals | Signal | derivado | Validate Intelligence | tests/cross-module-signals.test.ts (indirecta) | IMPLEMENTADO |
| HU-VAL-002 | CU-VAL-001 | Founder | link objective; 6A/6B | RN-VAL-002 | UI-VAL-001 | POST /api/signals | Signal, Objective | — | — | TEST-FALTANTE API | IMPLEMENTADO |
| HU-VAL-003 | CU-VAL-001 | Founder | consultar/filter evidence | RN-VEN-002 | UI-VAL-001 | GET /api/signals | Signal | — | — | TEST-FALTANTE | IMPLEMENTADO |
| HU-VAL-004/005 | CU-VAL-001 | Founder | coverage/blind spots/next evidence | RN-VAL-003/004, RN-INT-005 | UI-VAL-001 | /api/validate/coverage; /api/validate/intelligence | Objective, Signal | opcional derived | Validate Intelligence | tests/phase-a-contracts.test.ts (contracts) | IMPLEMENTADO |
| HU-VAL-006 | CU-VAL-002 | Team member | authorized evidence | RN-AUTH-004, RN-VAL-002, RN-TEAM-004 | UI-VAL-001 contextual | futuro auth contextual + /api/signals | Signal, VentureMember | — | Capability Resolver | TEST-FALTANTE | PARCIAL |
| HU-ENG-001/002 | CU-BLD-001 | Founder | create/update sprint | RN-BLD-004 | Engine/Home UI | /api/sprints | Sprint, SprintItem | — | Execution metrics | TEST-FALTANTE | IMPLEMENTADO |
| HU-ENG-003 | CU-BLD-001 | Founder | gates pending/resolved | RN-BLD-004 | Engine UI | /api/gates | Gate | — | — | TEST-FALTANTE | IMPLEMENTADO |
| HU-ENG-004/005 | CU-DEC-001 | Founder | decision→outcome→learning | RN-INT-003/005 | UI-DEC-001 | /api/decisions; decisions intelligence | Decision, DecisionLearning, Event | learning_memory | Learning Intelligence | tests/learning-intelligence.test.ts | IMPLEMENTADO/PARCIAL UI |
| HU-VEN-001 | onboarding venture | Founder | create venture | RN-VEN-001 | Venture UI | POST /api/ventures | Venture | — | venture intelligence later | TEST-FALTANTE | IMPLEMENTADO |
| HU-VEN-002/003 | CU-CMD-001 | Founder | read venture/intelligence | RN-VEN-002, RN-INT-005 | Venture/Home | GET /api/ventures; /api/venture/intelligence | Venture + domain data | derived | Venture Intelligence | tests/state-engine.test.ts; tests/feature-engine.test.ts (indirecta) | IMPLEMENTADO/PARCIAL |
| HU-VEN-004 | CU-BLD-002/CU-TEAM-001 | Member | access via membership | RN-VEN-002/003, RN-TEAM-004 | Venture/Build contextual | futuro capability resolver | VentureMember | — | Authorization | TEST-FALTANTE | PARCIAL |
| HU-TEAM-001/002/003 | CU-TEAM-001 | Founder | roster/add/update member | RN-TEAM-001/002/003 | UI-TEAM-001 | /api/team | VentureMember, User | graph derived | Team Intelligence | TEST-FALTANTE | IMPLEMENTADO membership |
| HU-TEAM-004 | CU-TEAM-001 | Founder | capacity/overload | RN-INT-005 | UI-TEAM-001 | /api/team/capacity | VentureMember, WorkAssignment | optional graph | Team Intelligence | TEST-FALTANTE | IMPLEMENTADO |
| HU-TEAM-005 | CU-TEAM-001/CU-AUTH-Z01 | Founder/Member | role→capability | RN-AUTH-003/004, RN-TEAM-003/004 | UI-TEAM-001 | capability resolver futuro | VentureMember | never auth source | Authorization | TEST-FALTANTE | FALTANTE |
| HU-RES-001/002 | CU-RES-001 | Founder | create/update resource | RN-RES-001/002 | UI-RES-001 | /api/resources | SpaceResource, ResourceAllocation | — | Resource Intelligence | TEST-FALTANTE | IMPLEMENTADO/PARCIAL |
| HU-RES-003 | CU-RES-001 | Founder | analyze health | RN-INT-005 | UI-RES-001 | resource intelligence | resources/allocations | optional | Resource Intelligence | TEST-FALTANTE | IMPLEMENTADO |
| HU-RES-004 | CU-RES-002 | Member | assigned resources | RN-RES-001/002, RN-TEAM-004 | UI-RES-001 contextual | futuro capability resolver | SpaceResource, VentureMember | — | Authorization | TEST-FALTANTE | PARCIAL |
| HU-CAP-001 | CU-CAP-001 | Founder | snapshot upsert | RN-CAP-001/002 | UI-CAP-001A | /api/capital/valuation kind=snapshot | FinancialSnapshot | — | deterministic validation | tests/valuation-engine.test.ts (motor, no API) | IMPLEMENTADO |
| HU-CAP-002 | CU-CAP-002 | Founder | valuation | RN-CAP-003/004/006 | UI-CAP-001B | valuation service | ValuationCase, FinancialSnapshot | computational runs opcional | Valuation Engine | tests/valuation-engine.test.ts | IMPLEMENTADO |
| HU-CAP-003 | CU-CAP-002 | Founder | fundraising | RN-CAP-003/004 | UI-CAP-001C | /api/capital/fundraising | FundraisingPlan | computational memory opcional | Fundraising Intelligence | tests/fundraising-intelligence.test.ts | IMPLEMENTADO |
| HU-CAP-004 | CU-CAP-003 | Founder | explicit confirmation | RN-CAP-005 | UI-CAP-001D | /api/capital/execution | FundraisingPlan/Deployment | derived | deterministic rules | tests/capital-execution.test.ts; tests/capital-deployment.test.ts | IMPLEMENTADO |
| HU-CAP-005 | CU-CAP-002 | Founder | readiness | RN-CAP-006, RN-INT-005 | UI-CAP-001 | /api/capital/readiness/intelligence | financial + venture evidence | optional | Readiness Intelligence | tests/cross-module-signals.test.ts (indirecta) | IMPLEMENTADO |
| HU-CAP-006 | CU-CAP-002 | Founder | scenario/GWO/Twin | RN-CAP-004, RN-INT-006 | UI-CAP-001 | scenario optimizer/digital twin | CapitalScenario/Forecast | computational_runs, digital_twin_runs | GWO, Digital Twin, Forecasting | tests/capital-scenario-optimizer.test.ts; tests/capital-digital-twin.test.ts; tests/gwo-optimization.test.ts; tests/financial-forecasting.test.ts | IMPLEMENTADO/PARCIAL |
| HU-CAP-007 | CU-INV-001 | Investor | shared opportunity/review | RN-INV-001, RN-REL-003 | UI-INV-001 | investments/review/consent | InvestmentOpportunity, InvestmentReview, DataConsent | matching outputs | Investment/Matching Intelligence | tests/investment-intelligence.test.ts; tests/matching-intelligence.test.ts | PARCIAL auth/UI |
| HU-RISK-001/002 | CU-RISK-001 | Founder | assess/read risk | RN-RISK-001/002 | UI-RISK-001 | /api/risk/assessments | RiskAssessment, RiskSignal, ResilienceSnapshot | computational state optional | Risk Engine | tests/risk-financial-intelligence.test.ts | IMPLEMENTADO |
| HU-RISK-003 | CU-ORG-003 | Org admin/analyst | aggregate portfolio risk | RN-RISK-003, RN-ORG-004 | UI-ORG-002 | portfolio/risk services | PortfolioRiskSnapshot, OrganizationUser | portfolio derived | Portfolio Intelligence | tests/portfolio-intelligence.test.ts | PARCIAL/BLOCKED schema |
| HU-REL-001/002 | CU-REL-001 | User | create/classify relation | RN-REL-001/002/003 | UI-REL-001 | /api/platform/connect | UserConnection | — | — | TEST-FALTANTE | IMPLEMENTADO |
| HU-REL-003 | CU-REL-001 | User | relation intelligence | RN-REL-003, RN-INT-005 | UI-REL-001 | /api/relay/intelligence | relation/activity data | graph optional | Relay/Graph Intelligence | tests/graph-intelligence.test.ts (indirecta) | IMPLEMENTADO |
| HU-REL-004 | CU-REL-001/CU-AUTH-Z01 | Founder/Mentor | connection != authorization | RN-REL-003 | UI-REL-001 | auth contextual futuro | UserConnection + memberships | — | Authorization | TEST-FALTANTE | DISEÑADO |
| HU-ORG-001 | CU-ORG-002 | Org member | portfolio read | RN-ORG-001/004, RN-RISK-003 | UI-ORG-002 | PortfolioState | OrganizationUser, Cohort, Ventures | portfolio derived | Portfolio Intelligence | tests/portfolio-intelligence.test.ts | PARCIAL |
| HU-ORG-002/003 | CU-ORG-001 | Org admin | manage members/roles | RN-ORG-001/002/003 | UI-ORG-001 | API por consolidar | OrganizationUser, AuditLog | — | Authorization | TEST-FALTANTE | FALTANTE/PARCIAL |
| HU-INT-001 | soporte transversal | System | canonical→computational state | RN-INT-001/002 | UI-SYS-001 futuro | state engine | ComputationalStateSnapshot + domain data | derived | State Engine | tests/state-engine.test.ts; tests/computational-intelligence-pipeline.test.ts | IMPLEMENTADO/PARCIAL |
| HU-INT-002 | soporte transversal | System | knowledge graph | RN-INT-002 | UI-SYS-001 futuro | graph services | domain entities | graph_snapshots | Graph Intelligence | tests/graph-intelligence.test.ts | IMPLEMENTADO |
| HU-INT-003 | soporte transversal | System | evidence/confidence | RN-INT-005/006 | varios UI | functional contracts | domain evidence | derived | Explainability/Confidence | tests/explainability-intelligence.test.ts; tests/probability-engine.test.ts | IMPLEMENTADO/PARCIAL |
| HU-INT-004 | CUS-DF-001 | System | project event to Atlas | RN-INT-001–004 | UI-SYS-001 futuro | event-store/intelligence-store | DomainEventRecord | event_documents | Projector | TEST-FALTANTE | PARCIAL |
| HU-INT-005 | CUS-RT-001/CUS-TRUST-001 | System | change→trust→realtime | RN-TRUST-001–005 | UI-SYS-001 futuro | Change Streams/Trust/RT futuro | memberships/consent/audit | Change Streams | Trust/Realtime | TEST-FALTANTE | FALTANTE |
| HU-INT-006 | CUS-RPL-001 | System | deterministic replay | RN-RPL-001–004, RN-INT-004 | UI-SYS-001 futuro | replay worker (Draft PR) | DomainEventRecord | replay_state/event_documents | Replay | TEST-FALTANTE | PARCIAL/Draft PR |
| HU-AUTH-001/002/003 | CU-AUTH-001 | User/Admin | login/MFA/revoke | RN-AUTH-001/002/005 | UI-AUTH-001 | auth/session/MFA APIs | User, AuthSession, MFA, SecurityEvent | — | Auth | TEST-FALTANTE integration | IMPLEMENTADO/PARCIAL |
| HU-ADM-001 | CU-ADM-001 | Platform admin | manage global users/roles | RN-ADM-001/002/003 | UI-ADM-001 | /api/admin/users | User, AuditLog | — | deterministic auth | TEST-FALTANTE | IMPLEMENTADO/PARCIAL guard |

---

## 3. Trazabilidad inversa por componente

### PostgreSQL

| Modelo / grupo | CU/HU asociados |
|---|---|
| Venture | HU-VEN-001–004, CU-CMD-001, CU-TEAM-001 |
| Objective / ObjectiveDependency | HU-BLD-001–006, CU-BLD-001/002 |
| Signal | HU-VAL-001–006, CU-VAL-001/002 |
| Sprint / Gate | HU-ENG-001–003, CU-BLD-001 |
| Decision / DecisionLearning | HU-ENG-004/005, CU-DEC-001 |
| VentureMember / WorkAssignment | HU-TEAM-*, HU-VEN-004, collaboration CU |
| SpaceResource / ResourceAllocation | HU-RES-* |
| FinancialSnapshot / Valuation / Forecast / Fundraising / Scenario | HU-CAP-* |
| RiskAssessment / RiskSignal / Resilience | HU-RISK-* |
| Organization / OrganizationUser / Cohort | HU-ORG-*, HU-RISK-003 |
| InvestmentOpportunity / Review / Consent | HU-CAP-007 |
| UserConnection | HU-REL-* |
| AuthSession / MFA / Audit / SecurityEvent | HU-AUTH-*, HU-ADM-001 |
| DomainEventRecord | HU-INT-004/006 y mutaciones con evento |

### MongoDB Atlas

| Coleccion | Requisito/CU |
|---|---|
| computational_runs | HU-INT-001/003; CU analiticos |
| feature_snapshots | State/Feature Intelligence |
| optimization_runs | HU-CAP-006; GWO |
| digital_twin_runs | HU-CAP-006 |
| learning_memory | HU-CMD-004; HU-ENG-005 |
| graph_snapshots | HU-INT-002; Build/Team/Relay intelligence |
| event_documents | HU-INT-004/006 |
| replay_state | HU-INT-006 |
| encrypted_models | governance/model security |

---

## 4. Trazabilidad inversa por pruebas reales

| Test | Requisitos/CU cubiertos |
|---|---|
| tests/home-intelligence.test.ts | HU-CMD-001/002, CU-CMD-001 |
| tests/graph-intelligence.test.ts | HU-BLD-005, HU-INT-002 |
| tests/learning-intelligence.test.ts | HU-CMD-004, HU-ENG-005 |
| tests/state-engine.test.ts | HU-INT-001 |
| tests/feature-engine.test.ts | HU-INT-001/003 |
| tests/valuation-engine.test.ts | HU-CAP-002 |
| tests/fundraising-intelligence.test.ts | HU-CAP-003 |
| tests/capital-execution.test.ts | HU-CAP-004 |
| tests/capital-deployment.test.ts | HU-CAP-004 |
| tests/capital-scenario-optimizer.test.ts | HU-CAP-006 |
| tests/capital-digital-twin.test.ts | HU-CAP-006 |
| tests/gwo-optimization.test.ts | HU-CAP-006 / optimization |
| tests/financial-forecasting.test.ts | HU-CAP-006 |
| tests/risk-financial-intelligence.test.ts | HU-RISK-001/002 |
| tests/portfolio-intelligence.test.ts | HU-RISK-003, HU-ORG-001 |
| tests/investment-intelligence.test.ts | HU-CAP-007 |
| tests/matching-intelligence.test.ts | HU-CAP-007 / relationship intelligence |
| tests/explainability-intelligence.test.ts | HU-INT-003 |
| tests/probability-engine.test.ts | HU-INT-003 |
| tests/computational-intelligence-pipeline.test.ts | HU-INT-001–003 |
| tests/cross-module-signals.test.ts | cross-module evidence/readiness |
| tests/algorithm-governance.test.ts | governance de motores |
| tests/governance-intelligence.test.ts | governance/confidence |
| tests/algorithms.test.ts | motores base |
| tests/anomaly-engine.test.ts | anomaly intelligence |
| tests/digital-twin-intelligence.test.ts | Digital Twin general |
| tests/investment-gwo-digital-twin.test.ts | investment optimization |
| tests/optimization-intelligence.test.ts | optimization layer |
| tests/similarity-intelligence.test.ts | similarity |
| tests/geospatial-intelligence.test.ts | geospatial intelligence |
| tests/phase-a-contracts.test.ts | contratos funcionales |
| tests/capital-learning.test.ts | capital learning |

---

## 5. Cobertura faltante prioritaria

### TEST-AUTH-001 — authorization contextual
Debe cubrir:
- sesion revocada;
- MFA pending;
- owner;
- active member + capability;
- inactive member;
- member sin capability;
- organization viewer/admin;
- consent revoked.

Estado: FALTANTE.

### TEST-BLD-API-001
CRUD Objective + ownership/capability + eventos.

Estado: FALTANTE.

### TEST-VAL-API-001
Signal create/link/unlinked/delete + unauthorized objective.

Estado: FALTANTE.

### TEST-TEAM-001
Add/reactivate/update/deactivate member + unique membership + inactive authorization.

Estado: FALTANTE.

### TEST-RES-001
Cross-venture assignment rejection + member capabilities.

Estado: FALTANTE.

### TEST-ORG-001
OrganizationUser membership, role policies, PortfolioState, viewer read-only, schema consistency.

Estado: FALTANTE.

### TEST-INV-001
Consent/shared fields/read-only/review capability.

Estado: FALTANTE.

### TEST-DF-001
Canonical event→Atlas idempotent projection + Atlas failure.

Estado: FALTANTE.

### TEST-RPL-001
Replay order, duplicate event, checkpoint only after success, PG/Atlas failure.

Estado: FALTANTE.

### TEST-TRUST-001
ALLOW/DENY/REDACT, unresolved audience fail-closed, invalid provenance.

Estado: FALTANTE.

### TEST-RT-001
Change Stream resume/reconnect/no-subscriber/Trust integration.

Estado: FALTANTE.

---

## 6. Gaps de trazabilidad que bloquean "DONE"

| Gap | Impacto |
|---|---|
| Capability Resolver inexistente | HU de colaboración no pueden cerrarse |
| OrganizationUser.status inconsistente | Portfolio CU no puede considerarse estable |
| requireRole vs requireAuth | seguridad no uniforme |
| CRUD/API tests faltantes | funcionalidad existe pero no esta verificada end-to-end |
| Transactional Outbox faltante | estado + evento no garantizados atomicamente |
| Trust Layer faltante | Change Streams no pueden publicarse de forma segura |
| Replay sin tests/merge | recuperación 2.14 no cerrada |
| Organization/Investor UI parcial | CU existen solo parcialmente para actores externos |

---

## 7. Definition of Traceability Complete

Una HU solo puede marcarse `DONE` cuando existen:

1. HU normalizada.
2. CU asociado.
3. RN aplicables.
4. UI o interfaz definida si es CU humano.
5. API/servicio identificado.
6. Persistencia identificada.
7. Motor identificado o `NONE`.
8. Alternativas/excepciones documentadas.
9. Prueba positiva.
10. Pruebas negativas para reglas criticas.
11. Estado de implementacion verificado.
12. Ninguna dependencia FALTANTE que invalide su flujo principal.

---

## 8. Direccion de rastreo

### Directa

```
HU
→ CU
→ RN
→ UI
→ API/Service
→ PostgreSQL
→ Event
→ Atlas/Intelligence
→ TEST
```

### Inversa

```
TEST / API / Model / Atlas Collection
→ CU
→ RN
→ HU
→ Actor / necesidad
```

---

## 9. Salida para FASE 12

FASE 12 debe convertir gaps y estados PARCIAL/FALTANTE en backlog tecnico real:

```
TASK-ID
HU
CU
RN
UI
prioridad
dependencias
componente
criterios de aceptacion
pruebas necesarias
```

No crear tareas para codigo ya implementado salvo que exista gap de seguridad, prueba, trazabilidad o consistencia.
