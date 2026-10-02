# VELA 2.14 — FASE 6: Reglas de negocio

Estado: ESPECIFICACION FORMAL  
Base: FASE 1–5  
Objetivo: convertir restricciones funcionales, invariantes de datos y politicas de acceso en reglas versionadas y trazables.

## 1. Convenciones

Cada regla contiene:

- **ID**
- **Descripcion**
- **Actor afectado**
- **Condicion**
- **Accion permitida/prohibida**
- **CU relacionados**
- **Punto de validacion**
- **Persistencia involucrada**
- **Estado**

Estados:
- IMPLEMENTADA
- PARCIAL
- DISEÑADA
- FALTANTE

---

# 2. Autenticacion y autorizacion

## RN-AUTH-001 — Sesion revocada no autoriza operaciones
**Actor:** cualquier usuario autenticado.  
**Condicion:** existe AuthSession asociada al token con `revokedAt != null`.  
**Accion:** prohibir todo acceso protegido.  
**CU:** CU-AUTH-001, CU-AUTH-Z01, todos los CU protegidos.  
**Validacion:** guard de autenticacion.  
**Persistencia:** PostgreSQL `AuthSession`.  
**Estado:** IMPLEMENTADA en `requireAuth()`, PARCIAL globalmente por coexistencia de `requireRole()`.

## RN-AUTH-002 — MFA pendiente restringe funcionalidad
**Actor:** usuario con MFA requerido.  
**Condicion:** sesion marcada como MFA pendiente.  
**Accion:** prohibir acceso funcional hasta completar MFA.  
**CU:** CU-AUTH-001, CU-AUTH-Z01.  
**Validacion:** guard de autenticacion.  
**Persistencia:** User/AuthSession + MFA records.  
**Estado:** IMPLEMENTADA en `requireAuth()`.

## RN-AUTH-003 — Rol global no sustituye rol contextual
**Actor:** admin, analista, operador.  
**Condicion:** una accion pertenece a VENTURE, ORGANIZATION o RELATIONSHIP.  
**Accion:** exigir validacion de scope/membership/capability cuando aplique; no usar `User.role` como sustituto automatico.  
**CU:** CU-AUTH-Z01, CU-BLD-002, CU-VAL-002, CU-RES-002, CU-ORG-*.  
**Validacion:** capability resolver objetivo.  
**Persistencia:** User, VentureMember, OrganizationUser, DataConsent.  
**Estado:** FALTANTE.

## RN-AUTH-004 — Membership no implica privilegio ilimitado
**Actor:** VentureMember/OrganizationUser.  
**Condicion:** actor pertenece al contexto.  
**Accion:** permitir solo capabilities asociadas al rol/contexto.  
**CU:** CU-TEAM-001, CU-ORG-001, CU-BLD-002, CU-VAL-002, CU-RES-002.  
**Validacion:** capa de autorizacion contextual.  
**Persistencia:** VentureMember / OrganizationUser.  
**Estado:** FALTANTE.

## RN-AUTH-005 — Toda mutacion privilegiada debe auditarse
**Actor:** Platform admin, Organization admin y actores con capability administrativa.  
**Condicion:** cambio de rol, membership, permisos o configuracion sensible.  
**Accion:** registrar AuditLog/SecurityEvent.  
**CU:** CU-ADM-001, CU-ORG-001, CU-TEAM-001 cuando cambie privilegios.  
**Validacion:** servicio de aplicacion posterior a autorizacion y dentro de la transaccion/logica segura.  
**Persistencia:** AuditLog / SecurityEvent.  
**Estado:** PARCIAL.

---

# 3. Venture

## RN-VEN-001 — Un owner canonico por Venture
**Actor:** Founder/Owner.  
**Condicion:** creacion de Venture.  
**Accion:** un mismo `User` no puede ser owner canonico de mas de un Venture bajo el modelo actual.  
**CU:** onboarding de venture, CU-CMD-001.  
**Validacion:** schema/API `POST /api/ventures`.  
**Persistencia:** `Venture.userId @unique`.  
**Estado:** IMPLEMENTADA.

## RN-VEN-002 — Acceso al venture requiere ownership o membership autorizada
**Actor:** Founder, co-founder, member, advisor.  
**Condicion:** lectura/escritura sobre recurso venture-scoped.  
**Accion:** permitir solo si actor es owner o member activo con capability.  
**CU:** CU-BLD-001/002, CU-VAL-001/002, CU-TEAM-001, CU-RES-001/002, CU-CAP-*, CU-RISK-001.  
**Validacion:** capability resolver.  
**Persistencia:** Venture, VentureMember.  
**Estado:** PARCIAL/FALTANTE.

## RN-VEN-003 — OwnerId identifica autoria, no frontera unica de acceso
**Actor:** todos los actores venture-scoped.  
**Condicion:** recurso tiene `ownerId`.  
**Accion:** no denegar automaticamente a un miembro autorizado solo porque `ownerId != session.sub`.  
**CU:** CU-BLD-002, CU-VAL-002, CU-RES-002.  
**Validacion:** capa de autorizacion.  
**Persistencia:** modelos con ownerId + VentureMember.  
**Estado:** DISEÑADA.

---

# 4. Build / ejecucion

## RN-BLD-001 — Estado de Objective debe pertenecer al vocabulario permitido
**Actor:** Founder/Member autorizado.  
**Condicion:** crear/actualizar Objective.  
**Accion:** permitir solo `on_track|at_risk|blocked|completed`.  
**CU:** CU-BLD-001, CU-BLD-002.  
**Validacion:** API `/api/objectives`.  
**Persistencia:** Objective.  
**Estado:** IMPLEMENTADA.

## RN-BLD-002 — No modificar Objective fuera del scope autorizado
**Actor:** Founder/Member.  
**Condicion:** PATCH/DELETE de Objective.  
**Accion:** rechazar si el recurso no pertenece al venture autorizado.  
**CU:** CU-BLD-001/002.  
**Validacion:** API/capability resolver.  
**Persistencia:** Objective, VentureMember.  
**Estado:** IMPLEMENTADA solo para owner; FALTANTE para membership.

## RN-BLD-003 — Dependencias no deben inventarse
**Actor:** VELA System.  
**Condicion:** Build Intelligence calcula critical path/bloqueos.  
**Accion:** derivar exclusivamente desde `ObjectiveDependency` persistido.  
**CU:** CU-BLD-001.  
**Validacion:** Build Intelligence/Graph.  
**Persistencia:** ObjectiveDependency.  
**Estado:** IMPLEMENTADA.

## RN-BLD-004 — Operacion invalida no deja estado parcial
**Actor:** cualquier actor de ejecucion.  
**Condicion:** una operacion requiere multiples cambios canonicos inseparables.  
**Accion:** ejecutar atomicamente o revertir la operacion.  
**CU:** CU-BLD-001.  
**Validacion:** servicio/API transaccional.  
**Persistencia:** PostgreSQL.  
**Estado:** PARCIAL.

---

# 5. Validacion

## RN-VAL-001 — Signal debe usar un tipo reconocido
**Actor:** Founder/Member autorizado.  
**Condicion:** crear Signal.  
**Accion:** aceptar solo experiment/interview/metric/insight.  
**CU:** CU-VAL-001/002.  
**Validacion:** `/api/signals`.  
**Persistencia:** Signal.  
**Estado:** IMPLEMENTADA.

## RN-VAL-002 — Evidencia vinculada debe apuntar a Objective autorizado
**Actor:** Founder/Member.  
**Condicion:** Signal incluye objectiveId.  
**Accion:** rechazar si Objective no existe o no pertenece al scope permitido.  
**CU:** CU-VAL-001/002.  
**Validacion:** API/capability resolver.  
**Persistencia:** Objective, Signal.  
**Estado:** IMPLEMENTADA owner / FALTANTE membership.

## RN-VAL-003 — Inteligencia no puede fabricar evidencia empirica
**Actor:** VELA System.  
**Condicion:** motor recomienda siguiente evidencia.  
**Accion:** puede sugerir, nunca persistir entrevista/metric/experiment como ocurrida sin accion/evidencia real.  
**CU:** CU-VAL-001.  
**Validacion:** Validate Intelligence y APIs de escritura.  
**Persistencia:** Signal.  
**Estado:** DISEÑADA/IMPLEMENTADA por separacion actual.

## RN-VAL-004 — Falta de evidencia debe expresarse como insuficiencia
**Actor:** VELA System.  
**Condicion:** cobertura insuficiente.  
**Accion:** devolver blind spots/INSUFFICIENT_DATA, no score ficticio.  
**CU:** CU-VAL-001, CU-CMD-001.  
**Validacion:** functional contracts/intelligence.  
**Persistencia:** ninguna necesaria.  
**Estado:** IMPLEMENTADA.

---

# 6. Team

## RN-TEAM-001 — Solo usuarios activos pueden incorporarse
**Actor:** Founder/Owner.  
**Condicion:** alta de VentureMember.  
**Accion:** rechazar usuario inexistente/inactivo.  
**CU:** CU-TEAM-001.  
**Validacion:** `POST /api/team`.  
**Persistencia:** User, VentureMember.  
**Estado:** IMPLEMENTADA.

## RN-TEAM-002 — Un usuario tiene una sola membership por venture
**Actor:** sistema/founder.  
**Condicion:** alta/reactivacion.  
**Accion:** usar la membership existente en vez de duplicar.  
**CU:** CU-TEAM-001.  
**Validacion:** unique `ventureId_userId` + upsert.  
**Persistencia:** VentureMember.  
**Estado:** IMPLEMENTADA.

## RN-TEAM-003 — VentureMember.role no concede permisos por si solo
**Actor:** Team member.  
**Condicion:** existe role textual.  
**Accion:** no usar el string libre como autorizacion final sin capability mapping.  
**CU:** CU-TEAM-001, CU-BLD-002, CU-VAL-002, CU-RES-002.  
**Validacion:** capability resolver futuro.  
**Persistencia:** VentureMember.  
**Estado:** FALTANTE.

## RN-TEAM-004 — Membership inactiva no autoriza operaciones
**Actor:** Team member.  
**Condicion:** `VentureMember.status != active`.  
**Accion:** prohibir operaciones venture-scoped.  
**CU:** CU-BLD-002, CU-VAL-002, CU-RES-002.  
**Validacion:** capability resolver.  
**Persistencia:** VentureMember.  
**Estado:** FALTANTE globalmente.

---

# 7. Recursos

## RN-RES-001 — Recurso debe pertenecer al venture autorizado
**Actor:** Founder/Member.  
**Condicion:** lectura/escritura de SpaceResource.  
**Accion:** permitir solo scope autorizado.  
**CU:** CU-RES-001/002.  
**Validacion:** API/capability resolver.  
**Persistencia:** SpaceResource.  
**Estado:** IMPLEMENTADA owner / FALTANTE member.

## RN-RES-002 — Asignacion debe referir miembro del mismo venture
**Actor:** Founder/System.  
**Condicion:** ownerMemberId o ResourceAllocation.  
**Accion:** prohibir referencia a miembro de otro venture.  
**CU:** CU-RES-001/002.  
**Validacion:** servicio de recursos.  
**Persistencia:** SpaceResource, ResourceAllocation, VentureMember.  
**Estado:** PARCIAL.

---

# 8. Capital

## RN-CAP-001 — Snapshot financiero requiere periodo y valores validos
**Actor:** Founder.  
**Condicion:** registrar FinancialSnapshot.  
**Accion:** periodo YYYY-MM; revenue y operatingCosts >= 0.  
**CU:** CU-CAP-001.  
**Validacion:** `/api/capital/valuation`.  
**Persistencia:** FinancialSnapshot.  
**Estado:** IMPLEMENTADA.

## RN-CAP-002 — Un snapshot por venture y periodo
**Actor:** Founder/System.  
**Condicion:** mismo venture + period.  
**Accion:** actualizar, no duplicar.  
**CU:** CU-CAP-001.  
**Validacion:** unique + upsert.  
**Persistencia:** FinancialSnapshot.  
**Estado:** IMPLEMENTADA.

## RN-CAP-003 — Modelos que requieren base financiera no corren sin snapshot
**Actor:** Founder/System.  
**Condicion:** valuation/fundraising/scenario necesita baseline.  
**Accion:** detener y solicitar snapshot.  
**CU:** CU-CAP-002.  
**Validacion:** APIs de capital.  
**Persistencia:** FinancialSnapshot.  
**Estado:** IMPLEMENTADA.

## RN-CAP-004 — Simulacion no cambia estado operacional
**Actor:** Founder/System.  
**Condicion:** valuation, forecast, Digital Twin, GWO scenario.  
**Accion:** persistir como escenario/analisis, no ejecutar efectos reales.  
**CU:** CU-CAP-002.  
**Validacion:** servicios de capital.  
**Persistencia:** ValuationCase, ForecastScenario, CapitalScenario.  
**Estado:** IMPLEMENTADA/DISEÑADA.

## RN-CAP-005 — Activacion de funding requiere confirmacion explicita
**Actor:** Founder.  
**Condicion:** activar plan financiado.  
**Accion:** exigir `confirmed=true`; si no, no mutar estado.  
**CU:** CU-CAP-003.  
**Validacion:** `/api/capital/execution`.  
**Persistencia:** FundraisingPlan.  
**Estado:** IMPLEMENTADA.

## RN-CAP-006 — Readiness sin evidencia suficiente no produce score ficticio
**Actor:** VELA System.  
**Condicion:** no existen componentes suficientes.  
**Accion:** devolver `INSUFFICIENT_DATA`.  
**CU:** CU-CAP-002.  
**Validacion:** readiness service.  
**Persistencia:** lectura de evidencia.  
**Estado:** IMPLEMENTADA.

---

# 9. Riesgo

## RN-RISK-001 — Evaluacion de riesgo debe estar anclada en evidencia
**Actor:** Founder/System.  
**Condicion:** crear assessment.  
**Accion:** exigir baseline financiero cuando el modelo lo requiera y conservar evidence/confidence.  
**CU:** CU-RISK-001.  
**Validacion:** risk API/engine.  
**Persistencia:** RiskAssessment, RiskSignal.  
**Estado:** IMPLEMENTADA.

## RN-RISK-002 — Riesgo no se presenta como causalidad cierta
**Actor:** VELA System.  
**Condicion:** motor emite señal.  
**Accion:** presentar exposure/probability/impact/confidence, no afirmar causalidad automatica.  
**CU:** CU-RISK-001, CU-ORG-003.  
**Validacion:** motor/UI contracts.  
**Persistencia:** RiskSignal.  
**Estado:** IMPLEMENTADA/DISEÑADA.

## RN-RISK-003 — Agregado organizacional no amplifica acceso a detalle privado
**Actor:** Organization analyst/admin.  
**Condicion:** consulta riesgo de portfolio.  
**Accion:** mostrar agregado permitido; no otorgar detalle de ventures sin capability/consent.  
**CU:** CU-ORG-003.  
**Validacion:** portfolio service + auth contextual.  
**Persistencia:** PortfolioRiskSnapshot, DataConsent.  
**Estado:** FALTANTE/PARCIAL.

---

# 10. Organization

## RN-ORG-001 — OrganizationUser define membership contextual, no rol global
**Actor:** Organization user.  
**Condicion:** acceso a organization scope.  
**Accion:** resolver permisos desde OrganizationUser y capability mapping.  
**CU:** CU-ORG-001/002/003.  
**Validacion:** auth contextual.  
**Persistencia:** OrganizationUser.  
**Estado:** FALTANTE.

## RN-ORG-002 — Viewer es read-only
**Actor:** Organization viewer.  
**Condicion:** role/capability de viewer.  
**Accion:** prohibir mutaciones organizacionales.  
**CU:** CU-ORG-001/002.  
**Validacion:** capability resolver.  
**Persistencia:** OrganizationUser.  
**Estado:** DISEÑADA.

## RN-ORG-003 — Cambios de membership requieren admin contextual
**Actor:** Organization admin.  
**Condicion:** agregar/cambiar miembro.  
**Accion:** exigir `organization.members.manage`.  
**CU:** CU-ORG-001.  
**Validacion:** auth contextual.  
**Persistencia:** OrganizationUser, AuditLog.  
**Estado:** FALTANTE.

## RN-ORG-004 — PortfolioState solo se construye para membership valida
**Actor:** Organization user/System.  
**Condicion:** construir estado de portafolio.  
**Accion:** comprobar membership real antes de leer datos.  
**CU:** CU-ORG-002.  
**Validacion:** `buildPortfolioState`.  
**Persistencia:** OrganizationUser.  
**Estado:** PARCIAL y actualmente inconsistente por referencia a campo `status` ausente del schema auditado.

---

# 11. Relaciones e inversion

## RN-REL-001 — Usuario no puede conectarse consigo mismo
**Actor:** Usuario.  
**Condicion:** target == session.sub.  
**Accion:** rechazar.  
**CU:** CU-REL-001.  
**Validacion:** `/api/platform/connect`.  
**Persistencia:** UserConnection.  
**Estado:** IMPLEMENTADA.

## RN-REL-002 — Tipo de conexion debe ser reconocido
**Actor:** Usuario.  
**Condicion:** crear/actualizar conexion.  
**Accion:** solo follow/collaborate/mentor.  
**CU:** CU-REL-001.  
**Validacion:** API.  
**Persistencia:** UserConnection.  
**Estado:** IMPLEMENTADA.

## RN-REL-003 — Conexion social no concede permisos
**Actor:** cualquier usuario conectado.  
**Condicion:** existe UserConnection.  
**Accion:** no derivar acceso a Venture/Organization exclusivamente de la conexion.  
**CU:** CU-REL-001, CU-INV-001, CU-AUTH-Z01.  
**Validacion:** auth contextual.  
**Persistencia:** UserConnection + memberships.  
**Estado:** DISEÑADA.

## RN-INV-001 — Investor solo ve informacion expresamente compartida
**Actor:** Investor.  
**Condicion:** acceso a oportunidad.  
**Accion:** filtrar por invitacion/relationship/consent/capability.  
**CU:** CU-INV-001.  
**Validacion:** investment service + Trust/auth layer.  
**Persistencia:** InvestmentOpportunity, DataConsent, InvestmentReview.  
**Estado:** PARCIAL/FALTANTE.

---

# 12. Inteligencia y Data Fabric

## RN-INT-001 — PostgreSQL es la fuente canonica operacional
**Actor:** VELA System.  
**Condicion:** conflicto entre estado operacional y proyeccion Atlas.  
**Accion:** prevalece PostgreSQL.  
**CU:** CUS-DF-001, CUS-RPL-001 y CU humanos con inteligencia.  
**Validacion:** arquitectura Data Fabric.  
**Persistencia:** PostgreSQL + Atlas.  
**Estado:** DISEÑADA/IMPLEMENTADA conceptualmente.

## RN-INT-002 — Atlas almacena estado derivado reconstruible
**Actor:** VELA System.  
**Condicion:** guardar computational memory.  
**Accion:** conservar provenance/fingerprint/version cuando aplique.  
**CU:** CUS-DF-001.  
**Validacion:** intelligence-store/projector.  
**Persistencia:** Atlas.  
**Estado:** PARCIAL.

## RN-INT-003 — Fallo de Atlas no invalida transaccion canonica confirmada
**Actor:** VELA System.  
**Condicion:** PostgreSQL confirmo operacion y Atlas falla.  
**Accion:** conservar operacion, registrar fallo y recuperar por replay.  
**CU:** CUS-DF-001, CUS-RPL-001.  
**Validacion:** event/data fabric.  
**Persistencia:** DomainEventRecord + Atlas.  
**Estado:** PARCIAL.

## RN-INT-004 — Proyecciones Atlas deben ser idempotentes
**Actor:** VELA System.  
**Condicion:** mismo evento se procesa mas de una vez.  
**Accion:** no duplicar estado derivado.  
**CU:** CUS-DF-001, CUS-RPL-001.  
**Validacion:** upsert por postgresEventId/fingerprint.  
**Persistencia:** Atlas event_documents.  
**Estado:** PARCIAL/Draft PR.

## RN-INT-005 — INSufficient data prevalece sobre inferencia fabricada
**Actor:** VELA System.  
**Condicion:** evidencia insuficiente.  
**Accion:** devolver estado insuficiente/low confidence.  
**CU:** CU-CMD-001, CU-VAL-001, CU-CAP-002, CU-RISK-001.  
**Validacion:** contracts/motores.  
**Persistencia:** no aplica.  
**Estado:** IMPLEMENTADA en varios modulos.

## RN-INT-006 — No ejecutar motor costoso si regla deterministica resuelve
**Actor:** VELA System.  
**Condicion:** existe decision deterministica suficiente.  
**Accion:** preferir regla simple.  
**CU:** CU-CAP-002 y otros CU analiticos.  
**Validacion:** orchestration/service layer.  
**Persistencia:** no aplica.  
**Estado:** DISEÑADA/PARCIAL.

---

# 13. Realtime y Trust Layer

## RN-TRUST-001 — Change Stream no autoriza
**Actor:** VELA System.  
**Condicion:** llega evento de Atlas Change Stream.  
**Accion:** tratarlo solo como cambio candidato; nunca como permiso.  
**CU:** CUS-RT-001, CUS-TRUST-001.  
**Validacion:** realtime worker.  
**Persistencia:** Atlas resume token/metadata + PostgreSQL auth data.  
**Estado:** FALTANTE.

## RN-TRUST-002 — Toda publicacion realtime requiere decision de Trust Layer
**Actor:** VELA System.  
**Condicion:** envelope realtime listo para publicar.  
**Accion:** ejecutar ALLOW/DENY/REDACT antes de enviar.  
**CU:** CUS-RT-001, CUS-TRUST-001.  
**Validacion:** trust policy engine.  
**Persistencia:** AuditLog cuando sensible.  
**Estado:** FALTANTE.

## RN-TRUST-003 — Audience se resuelve desde fuente canonica
**Actor:** VELA System.  
**Condicion:** publicar evento venture/org/user scoped.  
**Accion:** resolver membership/capabilities/consent desde PostgreSQL, no Atlas.  
**CU:** CUS-TRUST-001.  
**Validacion:** trust layer.  
**Persistencia:** User, VentureMember, OrganizationUser, DataConsent.  
**Estado:** FALTANTE.

## RN-TRUST-004 — Payload realtime debe minimizar datos
**Actor:** VELA System.  
**Condicion:** audience autorizada.  
**Accion:** publicar solo campos necesarios para la actualizacion.  
**CU:** CUS-TRUST-001.  
**Validacion:** redaction/minimization policy.  
**Persistencia:** opcional audit.  
**Estado:** FALTANTE.

## RN-TRUST-005 — Realtime no modifica estado canonico
**Actor:** VELA System/cliente.  
**Condicion:** recibe evento realtime.  
**Accion:** usarlo como notificacion/invalidation; mutaciones requieren API canonica.  
**CU:** CUS-RT-001 y CU humanos.  
**Validacion:** frontend/API boundaries.  
**Persistencia:** PostgreSQL solo via API transaccional.  
**Estado:** DISEÑADA; SSE actual ya se usa principalmente para refresh.

---

# 14. Replay

## RN-RPL-001 — Replay se ordena deterministicamente
**Actor:** VELA System.  
**Condicion:** reconstruccion de Atlas.  
**Accion:** procesar por `createdAt` + `id` o cursor canonico equivalente.  
**CU:** CUS-RPL-001.  
**Validacion:** replay worker.  
**Persistencia:** DomainEventRecord, replay_state.  
**Estado:** PARCIAL/Draft PR.

## RN-RPL-002 — Checkpoint avanza solo tras exito
**Actor:** VELA System.  
**Condicion:** evento/lote proyectado.  
**Accion:** no avanzar checkpoint si Atlas fallo.  
**CU:** CUS-RPL-001.  
**Validacion:** replay worker.  
**Persistencia:** Atlas replay_state.  
**Estado:** PARCIAL/Draft PR.

## RN-RPL-003 — Evento repetido no duplica proyeccion
**Actor:** VELA System.  
**Condicion:** replay encuentra evento previamente aplicado.  
**Accion:** upsert idempotente.  
**CU:** CUS-RPL-001.  
**Validacion:** mirrorDomainEvent.  
**Persistencia:** event_documents unique postgresEventId.  
**Estado:** PARCIAL/Draft PR.

## RN-RPL-004 — PostgreSQL indisponible detiene replay
**Actor:** VELA System.  
**Condicion:** no puede leer evento canonico.  
**Accion:** detener y no inferir eventos desde Atlas.  
**CU:** CUS-RPL-001.  
**Validacion:** worker.  
**Persistencia:** PostgreSQL.  
**Estado:** DISEÑADA.

---

# 15. Administracion

## RN-ADM-001 — Solo Platform admin administra roles globales
**Actor:** Platform admin.  
**Condicion:** create/update User.role.  
**Accion:** permitir solo a admin.  
**CU:** CU-ADM-001.  
**Validacion:** admin users API.  
**Persistencia:** User.  
**Estado:** IMPLEMENTADA.

## RN-ADM-002 — Valores de UserRole son cerrados
**Actor:** Platform admin.  
**Condicion:** asignar rol global.  
**Accion:** solo admin/analista/operador.  
**CU:** CU-ADM-001.  
**Validacion:** zod/schema.  
**Persistencia:** User.  
**Estado:** IMPLEMENTADA.

## RN-ADM-003 — Cambio de rol global se audita
**Actor:** Platform admin.  
**Condicion:** role cambia.  
**Accion:** registrar AuditLog.  
**CU:** CU-ADM-001.  
**Validacion:** admin API.  
**Persistencia:** AuditLog.  
**Estado:** IMPLEMENTADA.

---

# 16. Matriz RN → CU → validacion → datos

| RN | CU principales | Punto de validacion | Datos |
|---|---|---|---|
| RN-AUTH-001/002 | todos protegidos | requireAuth | AuthSession/User |
| RN-AUTH-003/004 | CU-AUTH-Z01, member/org CU | capability resolver | VentureMember/OrganizationUser |
| RN-VEN-002/003 | BLD/VAL/RES/CAP/RISK | authorization service | Venture + memberships |
| RN-BLD-* | CU-BLD-* | objectives/build services | Objective/Dependency/Sprint/Gate |
| RN-VAL-* | CU-VAL-* | signals/validate services | Signal/Objective |
| RN-TEAM-* | CU-TEAM-001 | team/capability service | VentureMember |
| RN-CAP-* | CU-CAP-* | capital services | Financial/Capital models |
| RN-RISK-* | CU-RISK-001/CU-ORG-003 | risk/portfolio layer | Risk/PortfolioRisk |
| RN-ORG-* | CU-ORG-* | organization auth | OrganizationUser/Cohort |
| RN-REL/INV-* | CU-REL-001/CU-INV-001 | relationship/investment layer | Connection/Consent |
| RN-INT-* | CUS-DF/CU intelligence | data fabric/intelligence | PG + Atlas |
| RN-TRUST-* | CUS-RT/TRUST | trust policy | memberships/consent/audit |
| RN-RPL-* | CUS-RPL-001 | replay worker | EventStore + Atlas |

---

# 17. Brechas de implementacion derivadas de reglas

## CRITICAS
1. Implementar capability resolver contextual.
2. Corregir `OrganizationUser.status` vs schema o eliminar esa dependencia.
3. Unificar garantias de `requireRole()` con `requireAuth()`.
4. Implementar Trust Layer antes de publicar Change Streams.
5. Cerrar replay garantizado desde Event Store.

## ALTAS
6. Migrar operaciones owner-centric a venture-scoped donde corresponda.
7. Normalizar vocabulario/capabilities de `VentureMember.role`.
8. Normalizar `OrganizationUser.role`.
9. Auditar cambios contextuales de membership/permissions.
10. Validar integridad cross-venture en asignaciones de recursos.

## MEDIAS
11. Formalizar actor Investor y mecanismo de sharing.
12. Definir politica de concurrencia/versionado para mutaciones sensibles.
13. Consolidar reglas de insufficient-data en contratos comunes.

---

# 18. Salida para FASE 7

FASE 7 debe tomar cada CU y cada RN y construir un catalogo exhaustivo de:

- alternativas funcionales;
- excepciones tecnicas;
- punto exacto del flujo donde nacen;
- resultado;
- retorno al flujo o finalizacion;
- estado transaccional garantizado;
- respuesta HTTP/UI esperada;
- evento generado o no generado.

Regla central para FASE 7:

**ninguna excepcion debe dejar a VELA en un estado parcialmente valido.**
