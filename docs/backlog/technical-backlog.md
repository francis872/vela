# VELA 2.14 — FASE 12: Backlog técnico trazable

Estado: READY FOR IMPLEMENTATION  
Base: FASE 1–11  
Objetivo: convertir exclusivamente gaps PARCIAL/FALTANTE, riesgos de seguridad, inconsistencias y ausencia de pruebas en trabajo implementable.

## 1. Priorización

- **P0**: seguridad, autorización, integridad canónica o bloqueo estructural.
- **P1**: capacidad funcional necesaria para cerrar CU/HU.
- **P2**: UX, observabilidad y endurecimiento.
- **P3**: deuda no bloqueante.

Orden obligatorio de dependencias:

```
Security/Auth foundation
→ Scope + Capability
→ Collaboration
→ Organization/Investor
→ Transactional events
→ Replay
→ Trust
→ Change Streams/Realtime
→ Observability/UI
→ Hardening/CI
```

---

# EPIC A — Autorización contextual y seguridad

## TASK-AUTH-001 — Unificar guard de autenticación

**Prioridad:** P0  
**HU:** HU-AUTH-001/002/003, transversal  
**CU:** CU-AUTH-001, CU-AUTH-Z01  
**RN:** RN-AUTH-001/002/005  
**UI:** todas las superficies protegidas  
**Componente:** auth/API

### Problema
Coexisten `requireAuth()` y `requireRole()` con garantías diferentes.

### Trabajo
- Definir un único guard base que valide JWT, AuthSession, revocación y MFA.
- Migrar rutas legacy gradualmente.
- Mantener roles globales admin/analista/operador donde realmente corresponden.
- No mezclar rol global con rol de venture/organization.

### Criterios de aceptación
- Sesión revocada nunca autoriza una API protegida.
- MFA pending nunca pasa un CU que requiere sesión completa.
- Las rutas migradas no dependen solo del claim JWT.
- Errores 401/403 son consistentes.

### Pruebas
`TEST-AUTH-001`: token válido + sesión revocada; MFA pending; sesión válida.

**Dependencias:** ninguna.  
**Bloquea:** AUTH-002, AUTH-003, TEAM-001, ORG-*, INV-*.

---

## TASK-AUTH-002 — Resolver scope contextual

**Prioridad:** P0  
**HU:** HU-VEN-004, HU-BLD-006, HU-VAL-006, HU-RES-004  
**CU:** CU-AUTH-Z01  
**RN:** RN-AUTH-003/004, RN-VEN-002/003  
**Componente:** `src/lib` authorization

### Trabajo
Crear servicio de resolución de contexto:
- USER
- VENTURE
- ORGANIZATION
- RELATIONSHIP
- PLATFORM

Debe devolver identidad canónica, scopeId, membership y estado.

### Criterios de aceptación
- Owner se resuelve sin depender de texto de rol.
- Member activo se resuelve por VentureMember.
- Member inactivo falla cerrado.
- Organization membership se resuelve independientemente de VentureMember.
- UserConnection nunca concede acceso VENTURE.

### Pruebas
Owner/member/inactive/cross-venture/no-membership.

**Dependencias:** AUTH-001.

---

## TASK-AUTH-003 — Capability Resolver

**Prioridad:** P0  
**HU:** HU-TEAM-005, HU-BLD-006, HU-VAL-006, HU-RES-004  
**CU:** CU-AUTH-Z01, CU-BLD-002, CU-VAL-002, CU-RES-002  
**RN:** RN-AUTH-003/004, RN-TEAM-003/004  
**UI:** UI-BLD-001, UI-VAL-001, UI-RES-001, UI-TEAM-001

### Trabajo
Implementar vocabulario controlado de capabilities sin convertir actores de negocio en `UserRole`.

Mínimo:
- venture.read
- venture.objectives.read/write/delete
- venture.validation.read/write/delete
- venture.resources.read/write
- venture.team.read/manage
- organization.portfolio.read
- organization.members.read/manage
- investment.opportunity.read/review

### Criterios
- Roles contextuales se traducen a capabilities.
- API autoriza por capability + scope.
- UI puede consultar capabilities efectivas.
- Deny by default para capability desconocida.

### Pruebas
Matrix owner/member/advisor/viewer/admin/investor.

**Dependencias:** AUTH-002.

---

## TASK-AUTH-004 — Alinear middleware y páginas modernas

**Prioridad:** P1  
**HU:** transversal  
**CU:** CU-AUTH-001  
**RN:** RN-AUTH-001/002  
**Componente:** middleware + session verification

### Trabajo
Cubrir rutas modernas Build, Validate, Capital, Risk, Financial Protection, Relay, Network, Venture, Team, Engine y Space con estrategia consistente.

### Criterios
- Página no se considera autenticada si API la rechazará por sesión revocada/MFA.
- No duplicar lógica de autorización de datos en middleware.

**Dependencias:** AUTH-001.

---

# EPIC B — Colaboración Venture

## TASK-BLD-001 — Objectives por venture/capability

**Prioridad:** P1  
**HU:** HU-BLD-006  
**CU:** CU-BLD-002  
**RN:** RN-VEN-002/003, RN-TEAM-004  
**UI:** UI-BLD-001  
**Componente:** /api/objectives

### Trabajo
Reemplazar owner-only como única vía de acceso por scope contextual sin romper owner actual.

### Criterios
- Owner conserva comportamiento.
- Member autorizado puede read/write según capability.
- Member sin capability recibe 403.
- Cross-venture access falla.
- Eventos conservan actorId y ventureId.

### Pruebas
`TEST-BLD-API-001`.

**Dependencias:** AUTH-003.

---

## TASK-VAL-001 — Signals por venture/capability

**Prioridad:** P1  
**HU:** HU-VAL-006  
**CU:** CU-VAL-002  
**RN:** RN-VAL-001/002/003, RN-TEAM-004  
**UI:** UI-VAL-001

### Criterios
- Member autorizado registra evidencia.
- objectiveId debe pertenecer al venture accesible.
- No se permite vinculación cross-venture.
- Evidence creator/audit queda trazable.

### Pruebas
`TEST-VAL-API-001`.

**Dependencias:** AUTH-003.

---

## TASK-RES-001 — Resources por venture/capability

**Prioridad:** P1  
**HU:** HU-RES-004  
**CU:** CU-RES-002  
**RN:** RN-RES-001/002, RN-TEAM-004  
**UI:** UI-RES-001

### Criterios
- Member solo modifica recursos permitidos/asignados.
- ownerMemberId debe pertenecer al mismo venture.
- Cross-venture assignment rechazado.

### Pruebas
`TEST-RES-001`.

**Dependencias:** AUTH-003.

---

## TASK-TEAM-001 — Formalizar roles de venture

**Prioridad:** P1  
**HU:** HU-TEAM-002/003/005  
**CU:** CU-TEAM-001  
**RN:** RN-TEAM-001–004  
**UI:** UI-TEAM-001

### Trabajo
Normalizar `VentureMember.role` mediante vocabulario/control de aplicación o migración compatible; evitar string arbitrario como fuente de privilegio.

### Criterios
- Rol inválido no concede capabilities.
- Reactivación de membership conserva invariantes.
- Cambios de rol generan audit/evento cuando aplique.

### Pruebas
`TEST-TEAM-001`.

**Dependencias:** AUTH-003.

---

## TASK-TEAM-002 — Completar gestión Team UI

**Prioridad:** P1  
**HU:** HU-TEAM-001/002/003  
**CU:** CU-TEAM-001  
**UI:** UI-TEAM-001

### Trabajo
Añadir Add/Edit/Activate/Deactivate usando componentes VELA existentes.

### Criterios
- CTA manage solo visible con capability.
- Estados loading/empty/error/forbidden/success.
- No fake users.
- Mobile usable.

**Dependencias:** TEAM-001.

---

# EPIC C — Organization e Investor

## TASK-ORG-001 — Corregir contrato OrganizationUser

**Prioridad:** P0  
**HU:** HU-ORG-001/002/003, HU-RISK-003  
**CU:** CU-ORG-001/002/003  
**RN:** RN-ORG-001–004  
**Componente:** Prisma + portfolio services

### Problema
Código consulta `OrganizationUser.status` pero el schema auditado no lo expone consistentemente.

### Criterios
- Schema y servicios usan un contrato único.
- Migración backward-safe.
- Membership activa/inactiva explícita.
- PortfolioState deja de depender de campo inexistente.

### Pruebas
`TEST-ORG-001`.

**Dependencias:** AUTH-001.

---

## TASK-ORG-002 — Organization authorization

**Prioridad:** P1  
**HU:** HU-ORG-001/002/003  
**CU:** CU-ORG-001/002/003  
**RN:** RN-ORG-001–004  
**UI:** UI-ORG-001/002

### Criterios
- Admin manage members.
- Viewer/mentor solo lee lo permitido.
- Organization membership no implica venture detail.
- Aggregate portfolio respeta redaction/consent.

**Dependencias:** AUTH-003, ORG-001.

---

## TASK-ORG-003 — Organization Members UI/API

**Prioridad:** P1  
**HU:** HU-ORG-002/003  
**CU:** CU-ORG-001  
**UI:** UI-ORG-001

### Criterios
Add/change role/deactivate, audit trail, forbidden/read-only, sin datos demo.

**Dependencias:** ORG-002.

---

## TASK-ORG-004 — Organization Portfolio UI

**Prioridad:** P1  
**HU:** HU-ORG-001, HU-RISK-003  
**CU:** CU-ORG-002/003  
**UI:** UI-ORG-002

### Criterios
- portfolio real;
- cohort filter;
- aggregate risk;
- data quality/confidence;
- redacted markers;
- no detalle sin permiso.

**Dependencias:** ORG-002.

---

## TASK-INV-001 — Investor sharing/consent policy

**Prioridad:** P1  
**HU:** HU-CAP-007  
**CU:** CU-INV-001  
**RN:** RN-INV-001, RN-REL-003  
**UI:** UI-INV-001

### Criterios
- Investor accede solo a oportunidad compartida.
- Consent revoked → acceso revocado.
- Review solo con capability.
- Social connection no concede investment access.

### Pruebas
`TEST-INV-001`.

**Dependencias:** AUTH-003.

---

# EPIC D — Eventos canónicos y Data Fabric

## TASK-EVT-001 — Transactional Outbox

**Prioridad:** P0  
**HU:** HU-INT-004  
**CU:** CUS-DF-001  
**RN:** RN-INT-001–004  
**Componente:** PostgreSQL/Event Store

### Trabajo
Garantizar estado canónico + evento en la misma transacción PostgreSQL.

### Criterios
- Commit de negocio implica evento durable.
- Rollback implica ausencia de evento.
- Event id/version/source/scope/provenance persistidos.
- Publicación a Atlas ocurre fuera de la transacción de negocio.
- Idempotencia por event id.

### Pruebas
Commit/rollback/duplicate/concurrent event.

**Dependencias:** ninguna funcional; coordinar con PR replay.

---

## TASK-DF-001 — Atlas projector idempotente

**Prioridad:** P0  
**HU:** HU-INT-004  
**CU:** CUS-DF-001  
**RN:** RN-INT-001–004

### Criterios
- event_documents keyed por canonical event.
- Duplicado no duplica memoria.
- Atlas failure no revierte operación PostgreSQL.
- provenance/fingerprint almacenados.

### Pruebas
`TEST-DF-001`.

**Dependencias:** EVT-001.

---

## TASK-RPL-001 — Integrar y probar Replay

**Prioridad:** P0  
**HU:** HU-INT-006  
**CU:** CUS-RPL-001  
**RN:** RN-RPL-001–004  
**Componente:** Draft PR #1

### Trabajo
Reconciliar PR de replay con Outbox final antes de merge.

### Criterios
- Orden estable createdAt+id.
- Checkpoint avanza solo tras éxito.
- Duplicate safe.
- Atlas outage recuperable.
- Estado IN_SYNC/LAGGING verificable.
- No pérdida al reiniciar worker.

### Pruebas
`TEST-RPL-001`.

**Dependencias:** EVT-001, DF-001.

---

# EPIC E — Trust, Change Streams y Realtime

## TASK-TRUST-001 — Trust decision engine

**Prioridad:** P0  
**HU:** HU-INT-005  
**CU:** CUS-TRUST-001  
**RN:** RN-TRUST-001–005

### Salida
`ALLOW | REDACT | DENY` + reason + audience + provenance.

### Criterios
- invalid provenance → DENY.
- unresolved scope/audience → DENY.
- consent revoked → DENY.
- sensitive fields → REDACT/minimize.
- decisiones sensibles auditables.
- autorización consultada desde PostgreSQL canónico, no Atlas.

### Pruebas
`TEST-TRUST-001`.

**Dependencias:** AUTH-003, DF-001.

---

## TASK-CS-001 — Atlas Change Stream worker

**Prioridad:** P1  
**HU:** HU-INT-005  
**CU:** CUS-RT-001  
**RN:** RN-TRUST-001–005

### Criterios
- `.watch()` real.
- resume token durable.
- reconnect con backoff.
- duplicate-safe.
- normaliza envelope antes de Trust.
- nunca publica directamente a cliente.

### Pruebas
Reconnect/resume/duplicate/Atlas unavailable.

**Dependencias:** TRUST-001.

---

## TASK-RT-001 — Realtime Gateway productivo

**Prioridad:** P1  
**HU:** HU-CMD-005, HU-INT-005  
**CU:** CUS-RT-001

### Trabajo
Elegir transporte soportado por runtime real; no llamar WebSocket a HTTP POST fallback.

### Criterios
- subscriber autenticado.
- solo recibe payload Trust-approved.
- disconnect/reconnect.
- no subscribers = no error.
- API canónica sigue funcionando si realtime cae.

### Pruebas
`TEST-RT-001`.

**Dependencias:** CS-001, TRUST-001.

---

# EPIC F — UI y consistencia funcional

## TASK-DEC-001 — Workspace Decision → Outcome → Learning

**Prioridad:** P1  
**HU:** HU-ENG-004/005, HU-CMD-004  
**CU:** CU-DEC-001  
**UI:** UI-DEC-001

### Criterios
- create decision;
- record outcome;
- consolidate learning;
- evidence references;
- Atlas degraded no pierde outcome canónico.

**Dependencias:** AUTH-001.

---

## TASK-UI-001 — Capability-aware UI states

**Prioridad:** P1  
**HU:** collaboration HU  
**UI:** Build/Validate/Resources/Team

### Criterios
- forbidden ≠ disabled ≠ hidden.
- read-only actor no ve mutating CTA.
- UI nunca sustituye autorización API.

**Dependencias:** AUTH-003, BLD-001, VAL-001, RES-001.

---

## TASK-UI-002 — Normalizar DataState

**Prioridad:** P2

### Criterios
Componente reutilizable para loading, empty, insufficient, forbidden, error y degraded; cero valores ficticios.

**Dependencias:** ninguna.

---

## TASK-UI-003 — Corregir topbar y búsqueda

**Prioridad:** P2

### Trabajo
- eliminar fecha hardcodeada;
- fecha real/localizada;
- mantener búsqueda global deshabilitada hasta tener CU/API real.

**Dependencias:** ninguna.

---

## TASK-SYS-001 — Data Fabric Health

**Prioridad:** P2  
**HU:** HU-INT-004/005/006  
**UI:** UI-SYS-001

### Criterios
Mostrar:
- PG/Event Store health;
- outbox lag;
- Atlas connectivity;
- projection/replay lag;
- Change Stream state;
- Trust ALLOW/REDACT/DENY counts;
- realtime subscribers;
- failures.

Replay manual solo para actor técnico autorizado.

**Dependencias:** RPL-001, TRUST-001, RT-001.

---

# EPIC G — Datos ficticios y documentación

## TASK-DATA-001 — Eliminar fake metrics de Inspire

**Prioridad:** P1

### Criterios
- Farma+/Logiq/etc. no aparecen como ventures reales.
- métricas 38+, $2.1M, exits, survival no se presentan sin fuente real.
- usar empty state o datos reales.

**Dependencias:** ninguna.

---

## TASK-DATA-002 — Aislar SOFTBOX demo mode

**Prioridad:** P2

### Criterios
Demo data solo bajo modo explícito; nunca mezclada con producción.

**Dependencias:** ninguna.

---

## TASK-DOC-001 — Actualizar README de arquitectura

**Prioridad:** P2

### Criterios
README refleja módulos actuales, arquitectura 2.14, PostgreSQL/Atlas, roles y estado real; enlaza docs FASE 1–12.

**Dependencias:** arquitectura estabilizada suficiente.

---

# EPIC H — Testing y CI

## TASK-TEST-001 — API integration suite

**Prioridad:** P0

### Alcance
AUTH, Objectives, Signals, Team, Resources, Organization, Investor.

### Criterios
Cada CU crítico tiene happy path + forbidden + invalid + cross-scope.

**Dependencias:** implementación de cada epic; puede crecer incrementalmente.

---

## TASK-CI-001 — Reparar npm run verify

**Prioridad:** P0

### Problema
`verify` referencia aliases de scripts inexistentes.

### Criterios
- `npm run verify` ejecuta scripts reales.
- workflow GitHub pasa con nombres consistentes.
- ningún test existente queda accidentalmente fuera.

**Dependencias:** ninguna.

---

## TASK-TEST-002 — Data Fabric integration suite

**Prioridad:** P0

### Alcance
Outbox, projector, replay, Trust, Change Streams, realtime.

### Criterios
Simular:
- Atlas outage;
- duplicate;
- restart;
- invalid provenance;
- revoked consent;
- reconnect;
- PG canonical recovery.

**Dependencias:** EVT/DF/RPL/TRUST/CS/RT.

---

# 2. Orden recomendado de implementación

## Wave 0 — CI y seguridad base
1. TASK-CI-001
2. TASK-AUTH-001
3. TASK-ORG-001
4. TASK-AUTH-002
5. TASK-AUTH-003

## Wave 1 — colaboración real
6. TASK-BLD-001
7. TASK-VAL-001
8. TASK-RES-001
9. TASK-TEAM-001
10. TASK-TEAM-002
11. TASK-UI-001
12. TASK-AUTH-004

## Wave 2 — Organization / Investor
13. TASK-ORG-002
14. TASK-ORG-003
15. TASK-ORG-004
16. TASK-INV-001

## Wave 3 — Data Fabric durable
17. TASK-EVT-001
18. TASK-DF-001
19. TASK-RPL-001

## Wave 4 — Realtime seguro
20. TASK-TRUST-001
21. TASK-CS-001
22. TASK-RT-001

## Wave 5 — producto/observabilidad
23. TASK-DEC-001
24. TASK-SYS-001
25. TASK-UI-002
26. TASK-UI-003
27. TASK-DATA-001
28. TASK-DATA-002
29. TASK-DOC-001

Testing se incorpora en cada wave; TASK-TEST-001/002 no se posponen al final.

---

# 3. Definition of Done por tarea

Una tarea no pasa a DONE si solo compila.

Debe cumplir:

- [ ] HU/CU/RN referenciados.
- [ ] autorización contextual aplicada.
- [ ] validaciones y excepciones implementadas.
- [ ] persistencia canónica correcta.
- [ ] evento de dominio cuando corresponda.
- [ ] sin fake data.
- [ ] happy path probado.
- [ ] negative/forbidden path probado.
- [ ] cross-scope probado si aplica.
- [ ] UI states completos si aplica.
- [ ] documentación/trazabilidad actualizada.
- [ ] `npm run verify` verde.
- [ ] no regresión observable en CU existentes.

---

# 4. Riesgos de implementación

| Riesgo | Mitigación |
|---|---|
| Cambiar ownerId rompe datos existentes | resolver owner como capability implícita y migrar incrementalmente |
| Role strings se convierten en privilegios inseguros | vocabulary + resolver deny-by-default |
| Organization migration rompe PortfolioState | corregir schema primero y probar migración |
| Outbox duplica Event Store | definir una sola semántica canónica antes de implementar |
| Replay PR diverge de Outbox | rebase/reconcile antes de merge |
| Change Streams filtra datos | Trust obligatorio antes de gateway |
| UI oculta botón pero API sigue abierta | API authorization es fuente real; UI solo refleja |
| Tests de motor crean falsa sensación E2E | separar engine tests de API/security integration tests |

---

# 5. Salida para FASE 13

FASE 13 debe ejecutar incrementalmente este backlog.

Primer lote recomendado:

```
TASK-CI-001
TASK-AUTH-001
TASK-ORG-001
TASK-AUTH-002
TASK-AUTH-003
```

Solo después habilitar colaboración de Team Member y Organization.

La implementación debe mantener commits pequeños, trazables por TASK-ID y pruebas asociadas.
