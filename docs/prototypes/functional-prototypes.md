# VELA 2.14 — FASE 9: Prototipos funcionales derivados de casos de uso

Estado: ESPECIFICACION DE UI/UX FUNCIONAL  
Base: FASE 1–8  
Objetivo: derivar interfaces desde los casos de uso y reutilizar la UI actual de VELA, sin rediseñar arbitrariamente el producto.

## 1. Principios

1. La UI se deriva de CU y RN; no al contrario.
2. Se reutilizan patrones visuales actuales: context header, command card, metric strips, workspace panels, DataState, btn-primary/secondary/ghost, os-input, grids y navegación existente.
3. Toda acción visible debe corresponder a una API/servicio real o quedar marcada como FALTANTE.
4. No se muestran datos ficticios.
5. Los estados obligatorios son: loading, empty, insufficient-data, error, success y forbidden cuando aplique.
6. Los permisos se resuelven antes de mostrar acciones mutables.
7. Realtime actualiza/invalida vistas; no sustituye APIs canonicas.
8. En mobile, acciones críticas deben permanecer accesibles sin hover.

---

# UI-CMD-001 — Home / Venture Pulse

**Actor:** Founder/Owner  
**CU:** CU-CMD-001  
**Ruta actual:** `/vela`  
**Estado:** EXISTENTE — REUTILIZAR

## Objetivo
Presentar estado operativo, prioridad, intervención y aprendizaje con evidencia.

## Componentes existentes
- Venture context header.
- Current phase.
- VELA Today command card.
- Intervention Engine.
- Learning Memory.
- Venture Pulse metrics.
- Current Sprint.
- Intelligence panel.
- Activity/trajectory.

## Acciones
- Abrir acción recomendada.
- Iniciar intervención.
- Navegar a módulos relacionados.

## Validaciones
- No mostrar métricas inventadas.
- Si falta evidencia: DataState/INSUFFICIENT_DATA.
- Si no existe venture: onboarding/configuración.

## Estados
- **Loading:** skeleton actual.
- **Empty:** NO_VENTURE.
- **Insufficient:** métricas individuales insuficientes.
- **Error:** pulse unavailable.
- **Success:** pulse renderizado.
- **Realtime degraded:** banner no bloqueante; permitir refresh.

## Permisos
`venture.read`; para Start intervention: capability de intervención/escritura.

## APIs
- GET `/api/home/pulse`
- POST `/api/home/interventions`
- GET/SSE `/api/home/events`

## Responsive
- Command card pasa a stack vertical.
- CTA permanece visible.
- Métricas 4→2→1 columnas.
- Learning Memory no debe esconderse detrás de hover.

## Wireframe
```
┌─────────────────────────────────────────────┐
│ Venture Pulse            Current phase      │
│ Good afternoon, Founder  [Validate ●───]    │
├─────────────────────────────────────────────┤
│ VELA TODAY · ATTENTION                      │
│ Priority grounded in evidence     [Open →]  │
│ evidence / affected metric                  │
├─────────────────────────────────────────────┤
│ INTERVENTION                  [Start]        │
│ hypothesis · target · deadline               │
│ Learning Memory / prior outcome              │
├─────────────────────────────────────────────┤
│ Velocity │ Validation │ Risk │ Readiness     │
├──────────────────────┬──────────────────────┤
│ Current Sprint       │ VELA Intelligence    │
└──────────────────────┴──────────────────────┘
```

---

# UI-BLD-001 — Build Execution Workspace

**Actor:** Founder/Owner; futuro Team Member autorizado  
**CU:** CU-BLD-001 / CU-BLD-002  
**Ruta:** `/build`  
**Estado:** EXISTENTE — EXTENDER PERMISOS

## Objetivo
Gestionar objetivos y visualizar estructura de ejecución.

## Componentes
- Context header.
- Build Intelligence command.
- Execution Pulse.
- Board/Graph tabs.
- Status filters.
- Objective cards.
- Create Objective panel.

## Campos Create Objective
| Campo | Tipo | Regla |
|---|---|---|
| title | text | requerido |
| description | textarea | opcional |
| status | select | on_track/at_risk/blocked/completed |
| priority | number/select | entero valido |
| dueDate | date | opcional |

## Acciones
- New objective.
- Update status.
- Delete objective.
- Switch Board/Graph.
- Apply intelligence focus/filter.

## Estados
Loading; empty SETUP; error; graph-no-dependencies; cycle detected; success.

## Permisos
- `venture.objectives.read`
- `venture.objectives.write`
- delete condicionado por capability.

**Brecha UI:** hoy no existe señal visual de read-only para Team Member.

## APIs
`/api/objectives`, `/api/build/intelligence`, `/api/objectives/graph`.

## Wireframe
```
┌ Build ──────────────────────────────────────┐
│ BUILD INTELLIGENCE · FOCUS      [Action →]  │
├─────────────────────────────────────────────┤
│ Active │ Blocked │ At risk │ Evidence       │
├───────────────────────────── [Board|Graph] ─┤
│ On track │ At risk │ Blocked │ Completed    │
│ [obj]      [obj]      [obj]       [obj]     │
│                                             │
│                         [+ New Objective]   │
└─────────────────────────────────────────────┘
```

---

# UI-VAL-001 — Validate Evidence Workspace

**Actor:** Founder/Owner; futuro Team Member autorizado  
**CU:** CU-VAL-001 / CU-VAL-002  
**Ruta:** `/validate`  
**Estado:** EXISTENTE — REUTILIZAR

## Campos
- type: experiment/interview/metric/insight.
- observation/title: requerido.
- objectiveId: opcional.
- hypothesis: opcional.
- result: opcional.
- learning: opcional.

## Componentes
- Validate Intelligence.
- Coverage metrics.
- Signal type cards.
- Blind spots.
- Coverage by Objective.
- Record Signal form.
- Evidence feed.

## Acciones
New signal; filter type; link objective; delete signal.

## Estados
- Empty: no evidence.
- Unlinked evidence.
- Coverage sufficient/STABLE.
- Insufficient context.
- Objective unavailable/forbidden.

## Permisos
`venture.validation.read/write`.

## APIs
`/api/signals`, `/api/validate/coverage`, `/api/validate/intelligence`, `/api/objectives`.

---

# UI-DEC-001 — Decision & Learning Workspace

**Actor:** Founder/Owner  
**CU:** CU-DEC-001  
**Estado:** PARCIAL — SUPERFICIES EXISTEN, PROTOTIPO UNIFICADO REQUERIDO

## Objetivo
Registrar decisión, evidencia, resultado y aprendizaje en un único ciclo visible.

## Componentes propuestos reutilizando cards VELA
- Decision list.
- Decision detail drawer/panel.
- Decision form.
- Outcome panel.
- Learning consolidation panel.
- Evidence references.

## Campos Decision
title, context, choice, rationale, evidence.

## Campos Outcome
outcome, outcomeStatus = SUCCESS/PARTIAL/NO_IMPROVEMENT, consolidateLearning boolean.

## Acciones
- Create decision.
- Record outcome.
- Consolidate learning.
- View related evidence.

## Estados
Open decision; awaiting outcome; learned; Atlas-memory pending/degraded.

## APIs
`/api/decisions`, `/api/decisions/intelligence`.

## Wireframe
```
┌ Decisions ──────────────────────────────────┐
│ Decision Intelligence                       │
├──────────────────┬──────────────────────────┤
│ Decision list    │ Selected decision        │
│ • Pricing        │ Context                  │
│ • Hiring         │ Choice / rationale       │
│                  │ Evidence                 │
│ [+ Decision]     │ [Record outcome]         │
│                  │ Learning: [Consolidate]  │
└──────────────────┴──────────────────────────┘
```

---

# UI-TEAM-001 — Team Workspace

**Actor:** Founder/Owner; Team Member read scope  
**CU:** CU-TEAM-001  
**Ruta:** `/team`  
**Estado:** EXISTENTE — FALTA GESTION VISIBLE DE MEMBERSHIP

## Componentes actuales
- Team Intelligence.
- Health strip.
- Capacity.
- Ownership matrix.
- Roster.
- Link to Network.

## Acciones requeridas por CU
- Add member.
- Edit role.
- Edit responsibility.
- Activate/deactivate.
- Inspect capacity.

**Brecha:** API soporta POST/PATCH, pero la UI auditada prioriza roster/capacity y no expone claramente toda la gestión.

## Form Add/Edit Member
userId selector/search, role, responsibility, status.

## Validaciones
- usuario activo;
- membership única;
- role no debe equivaler directamente a capability;
- cambios sensibles auditables.

## Estados
No venture; no members; insufficient skills; overloaded; read-only; forbidden.

## APIs
`/api/team`, `/api/team/capacity`.

---

# UI-RES-001 — Resources Workspace

**Actor:** Founder/Owner; Team Member autorizado  
**CU:** CU-RES-001 / CU-RES-002  
**Ruta:** `/space`  
**Estado:** EXISTENTE/PARCIAL

## Objetivo
Registrar, asignar y evaluar recursos.

## Campos
title*, description, tag, URL, resourceType, status, criticality, monthlyCost, ownerMemberId, usageStatus.

## Acciones
- Add resource.
- Edit operational properties.
- Assign/unassign member.
- View allocations.
- Filter critical/unavailable/unused.

## Validaciones
ownerMemberId debe pertenecer al mismo venture.

## Estados
empty; critical unavailable; unused paid; no owner; read-only member.

## APIs
`/api/resources`, `/api/resources/allocations`, intelligence actual.

---

# UI-CAP-001 — Capital Workspace

**Actor:** Founder/Owner  
**CU:** CU-CAP-001/002/003  
**Ruta:** `/capital`  
**Estado:** EXISTENTE — MANTENER ARQUITECTURA

## Subvistas funcionales
1. Overview/readiness.
2. Financial Base.
3. Valuation.
4. Fundraising.
5. Scenario Optimizer / Digital Twin.
6. Execution.
7. Deployment/Learning.

## UI-CAP-001A — Financial Snapshot Form
period*, currency, revenue*, operatingCosts*, cogs, cash, debt, customers, newCustomers, marketingSpend, churnRate.

Validaciones:
- YYYY-MM.
- revenue/cost >= 0.
- opcionales nullables.

## UI-CAP-001B — Valuation Case
name, capitalRequested, equityOffered, multiples, discountRate, terminalGrowth, projectedGrowth.

Debe mostrar inputs vs outputs claramente.

## UI-CAP-001C — Fundraising
targetRunwayMonths, equityOffered, cashBuffer, allocation percentages, growth targets.

## UI-CAP-001D — Execution Confirmation
Pantalla/modal explícito:
```
Plan: Series/Seed ...
Target: ...
Consequences: ...
[Cancel] [Confirm funding activation]
```
Nunca usar confirmación implícita.

## Estados
NO_VENTURE; INSUFFICIENT_DATA; AVAILABLE; model error; simulation only; funded.

## APIs
capital readiness/valuation/fundraising/scenario-optimizer/digital-twin/execution/deployments/learning.

---

# UI-RISK-001 — Risk & Resilience

**Actor:** Founder/Owner  
**CU:** CU-RISK-001  
**Ruta:** `/risk`  
**Estado:** EXISTENTE/PARCIAL

## Campos assessment
customerConcentrationPct, supplierConcentrationPct, founderDependencyPct, technologyDependencyPct, complianceOpenItems, cyberControlsCoveragePct, territorialExposurePct.

## Componentes
- resilience score/state.
- evidence quality/confidence.
- dimensions.
- signals.
- probability/exposure/impact.
- action/target metric.
- historical assessments.

## Reglas UI
Nunca etiquetar una señal como causalidad confirmada.
Mostrar confidence/evidence junto a señales.

## Estados
financial snapshot required; insufficient optional evidence; assessment available; no critical signals.

---

# UI-REL-001 — Network / Relay

**Actor:** Usuario autenticado  
**CU:** CU-REL-001  
**Rutas:** `/network`, `/relay`  
**Estado:** EXISTENTE — MANTENER SEPARACION

## Network
Objetivo: crear/consultar conexiones.

Acciones:
- Follow.
- Collaborate.
- Mentor relationship.
- Remove relationship.

**Mensaje obligatorio de arquitectura:** estas acciones no otorgan acceso a un venture.

## Relay
Objetivo: sintetizar actividad, decisiones y conexiones.

Componentes:
threads/activity, decisions, relationship intelligence.

## Estados
no connections; target unavailable; relationship created; intelligence insufficient.

---

# UI-ORG-001 — Organization Members

**Actor:** Organization Admin  
**CU:** CU-ORG-001  
**Estado:** FALTANTE

## Objetivo
Administrar memberships organizacionales.

## Componentes
- Organization context header.
- Member table.
- Role badge.
- Invite/Add member.
- Change role.
- Audit activity.

## Campos
user, role (controlled vocabulary), optional scope/cohort assignment if future CU requires it.

## Acciones
Add, change role, remove/deactivate.

## Estados
empty, loading, forbidden, conflict, success.

## Permisos
`organization.members.read/manage`.

## Dependencia previa
Resolver schema/semántica de OrganizationUser antes de implementar.

## Wireframe
```
┌ Organization · Members ─────────────────────┐
│ 24 members                      [+ Member]  │
├─────────────────────────────────────────────┤
│ Name       Role       Scope       Actions   │
│ ...        admin      org         Edit      │
│ ...        mentor     cohort A    Edit      │
│ ...        viewer     org         View      │
├─────────────────────────────────────────────┤
│ Audit trail                                 │
└─────────────────────────────────────────────┘
```

---

# UI-ORG-002 — Organization Portfolio

**Actor:** Org admin/viewer/mentor autorizado  
**CU:** CU-ORG-002 / CU-ORG-003  
**Estado:** FALTANTE/PARCIAL

## Componentes
- Portfolio summary.
- Cohort filter.
- Venture cards/table.
- Risk aggregate.
- Engagement.
- Data-quality indicators.
- Redacted/aggregate-only markers.

## Acciones
Filter; open permitted venture; inspect aggregate risk.

## Estados
no membership; no ventures; insufficient risk; redacted detail; schema error must never surface raw.

## APIs objetivo
portfolio state/intelligence endpoints a consolidar.

---

# UI-INV-001 — Shared Investment Opportunity

**Actor:** Investor autorizado  
**CU:** CU-INV-001  
**Estado:** PARCIAL

## Componentes
- Opportunity overview.
- Sharing/consent badge.
- Allowed metrics/evidence.
- Review form when capability allows.
- Expiration/access state.

## Acciones
View; submit review.

## Estados
shared; read-only; consent revoked; expired; forbidden.

## Regla
Nunca reutilizar SOFTBOX demo data como oportunidad real.

---

# UI-ADM-001 — Platform Users

**Actor:** Platform Admin  
**CU:** CU-ADM-001  
**Ruta:** `/admin/users`  
**Estado:** EXISTENTE

## Componentes
User list, create/edit form, global role selector, active state, audit result.

## Roles permitidos
admin / analista / operador.

## Estados
duplicate email; invalid role; forbidden; success; audit failure.

---

# UI-AUTH-001 — Authentication / MFA

**Actor:** Usuario  
**CU:** CU-AUTH-001  
**Estado:** EXISTENTE/PARCIAL

## Superficies
- Login.
- MFA challenge.
- Session revoked/expired.
- Recovery path.
- Access denied.

## Regla
Una pantalla funcional nunca debe tratar un JWT válido como suficiente si AuthSession fue revocada.

---

# 2. UI SYSTEM / observabilidad

Los CUS-DF/RT/TRUST/RPL no requieren pantallas de producto para usuarios finales.

Solo se justifica una superficie administrativa futura:

# UI-SYS-001 — Data Fabric Health

**Actor:** Platform Admin / operador técnico autorizado  
**CU:** CUS-DF-001, CUS-RT-001, CUS-TRUST-001, CUS-RPL-001  
**Estado:** DISEÑADO

## Objetivo
Observar salud sin modificar manualmente datos derivados.

## Componentes
- PostgreSQL canonical status.
- Event Store lag.
- Atlas connectivity.
- Projection lag.
- Change Stream status/resume token age.
- Trust decisions counts.
- Realtime connections/subscribers.
- Replay checkpoint/status.
- Last failures.

## Acciones
- Trigger authorized replay.
- Inspect failure metadata.
- Retry recoverable projection.
- Never edit Atlas documents directly.

## Wireframe
```
┌ Data Fabric Health ─────────────────────────┐
│ PostgreSQL  ● healthy                       │
│ Event Store ● 1,204 events                  │
│ Atlas       ● connected   lag: 0            │
│ ChangeStream● running                       │
│ Trust       ● active      denied: 3         │
│ Realtime    ● 14 subscribers                │
│ Replay      ● IN_SYNC     checkpoint ...    │
├─────────────────────────────────────────────┤
│ Recent failures                             │
│ event/version/reason                        │
│                              [Replay]        │
└─────────────────────────────────────────────┘
```

---

# 3. Matriz UI → CU → API → estado

| UI | CU | API/servicio | Estado |
|---|---|---|---|
| UI-CMD-001 | CU-CMD-001 | home pulse/interventions/events | EXISTENTE |
| UI-BLD-001 | CU-BLD-001/002 | objectives/build/graph | EXISTENTE/PERMISOS PARCIALES |
| UI-VAL-001 | CU-VAL-001/002 | signals/coverage/intelligence | EXISTENTE/PERMISOS PARCIALES |
| UI-DEC-001 | CU-DEC-001 | decisions/intelligence | PARCIAL |
| UI-TEAM-001 | CU-TEAM-001 | team/capacity | EXISTENTE/PARCIAL GESTION |
| UI-RES-001 | CU-RES-001/002 | resources/allocations | EXISTENTE/PARCIAL |
| UI-CAP-001 | CU-CAP-001/002/003 | capital APIs | EXISTENTE |
| UI-RISK-001 | CU-RISK-001 | risk assessments | EXISTENTE/PARCIAL |
| UI-REL-001 | CU-REL-001 | connect/relay | EXISTENTE |
| UI-ORG-001 | CU-ORG-001 | por consolidar | FALTANTE |
| UI-ORG-002 | CU-ORG-002/003 | portfolio | FALTANTE/PARCIAL |
| UI-INV-001 | CU-INV-001 | investments/review/consent | PARCIAL |
| UI-ADM-001 | CU-ADM-001 | admin/users | EXISTENTE |
| UI-AUTH-001 | CU-AUTH-001 | auth/MFA/session | EXISTENTE/PARCIAL |
| UI-SYS-001 | CUS-* | data-fabric/replay/health | DISEÑADO |

---

# 4. Estados de UI normalizados

## Loading
Usar skeleton/placeholder visual; nunca sustituir por valores cero ficticios.

## Empty
`0 records` real. Debe ofrecer siguiente acción posible.

## Insufficient data
Hay contexto, pero no evidencia suficiente para una métrica/análisis. Mostrar explicación y dato faltante.

## Error
Fallo técnico. No presentarlo como empty ni insufficient.

## Forbidden
Usuario autenticado sin capability. No mostrar CTAs que inevitablemente fallarán.

## Success
Confirmar mutación realizada; refrescar desde API canonica.

## Degraded intelligence
La operación canónica funciona, pero Atlas/model/realtime no está disponible. Mostrar banner no bloqueante.

---

# 5. Patrones de permisos visuales

1. **Ocultar o deshabilitar?**
   - Acción que el actor jamás puede realizar por rol: ocultar.
   - Acción temporalmente no disponible por estado del recurso: deshabilitar con explicación.
   - Información restringida: no renderizar payload y usar estado forbidden/redacted.

2. Team member read-only:
   - puede ver cards permitidas;
   - botones edit/delete no aparecen.

3. Organization viewer:
   - portfolio read-only;
   - member management oculto.

4. Investor read-only:
   - review form solo si capability.

---

# 6. Responsive behavior transversal

## Desktop
Sidebar + topbar + workspace de múltiples columnas.

## Tablet
Sidebar colapsable; grids 4→2; formularios 2→1 columnas.

## Mobile
- topbar simplificado;
- navegación drawer/bottom pattern reutilizando items existentes;
- command cards en stack;
- tablas se convierten en cards;
- CTA principal sticky o visible cerca del contexto;
- drawers/forms full-width;
- gráficos con scroll/summary accesible;
- no depender de tooltip/hover.

---

# 7. Cambios NO permitidos en esta fase

- No reemplazar identidad visual.
- No crear una segunda navegación.
- No implementar datos demo para rellenar empty states.
- No mostrar roles contextuales sin backend real.
- No exponer controles de Change Streams/Replay a usuarios normales.
- No crear una pantalla por cada motor de inteligencia.
- No introducir CRUD genérico cuando el CU requiere flujo específico.

---

# 8. Backlog visual derivado

Prioridad alta:
1. Añadir estados read-only/capability en Build/Validate/Resources.
2. Exponer gestión explícita Add/Edit/Deactivate en Team.
3. Construir Organization Members.
4. Construir Organization Portfolio.
5. Unificar Decision + Outcome + Learning en workspace trazable.
6. Diseñar Data Fabric Health solo para administración técnica.
7. Corregir fecha hardcodeada del topbar.
8. Mantener búsqueda global deshabilitada hasta que exista CU/API real.

Prioridad media:
9. Mejorar estados degraded realtime/Atlas.
10. Compartir componentes de DataState/error/forbidden.
11. Añadir badges claros de evidence/confidence/data-quality.

---

# 9. Salida para FASE 10

FASE 10 debe producir diagramas versionables de:
- arquitectura funcional general;
- flujos críticos;
- secuencias;
- Data Fabric 2.14;
- autorización contextual;
- capital;
- validación;
- replay/realtime/trust.

Los diagramas deben reflejar estos prototipos y la arquitectura real, no una arquitectura ideal no implementada sin marcar su estado.
