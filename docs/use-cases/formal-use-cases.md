# VELA 2.14 — FASE 5: Casos de uso formales

Estado: ESPECIFICACION FUNCIONAL FORMAL  
Base: FASE 1–4  
Rama: `docs/vela-2-14-phase-2-actors-permissions`

## 1. Convenciones

- `CU-*`: caso de uso iniciado por actor humano.
- `CUS-*`: caso de uso iniciado por VELA System.
- `<<include>>`: comportamiento obligatorio y reutilizable.
- `<<extend>>`: comportamiento condicional u opcional.
- PostgreSQL: verdad operacional/canonica.
- MongoDB Atlas: memoria/inteligencia computacional derivada.
- Estado de implementacion: IMPLEMENTADO / PARCIAL / DISEÑADO / FALTANTE.

### Includes transversales

**CU-AUTH-Z01 — Verificar acceso contextual**

Comportamiento reusable objetivo:

1. VELA verifica autenticacion.
2. VELA verifica sesion activa/no revocada.
3. VELA valida estado MFA cuando aplique.
4. VELA resuelve scope solicitado.
5. VELA resuelve ownership/membership.
6. VELA resuelve capability.
7. VELA verifica consentimiento cuando aplique.
8. VELA permite o rechaza la accion.
9. VELA audita mutaciones privilegiadas cuando corresponda.

Estado: **PARCIAL**. `requireAuth()` cubre 1–3; ownership aparece en varias APIs; membership/capability contextual aun no es general.

---

# CU-CMD-001 — Dirigir venture con evidencia

**Objetivo:** comprender el estado actual del venture y actuar sobre la prioridad mas relevante con evidencia.

**Actor principal:** Founder/Owner  
**Actores secundarios:** VELA System  
**Interesados:** Team members, advisors autorizados  
**Alcance:** VENTURE  
**Nivel:** objetivo de usuario

**Historias relacionadas:** HU-CMD-001, HU-CMD-002, HU-CMD-003, HU-CMD-004, HU-VEN-002, HU-VEN-003, HU-CMD-005.

**Disparador:** el founder abre Home/Command.

**Precondiciones:**
- sesion valida;
- venture resoluble para el actor;
- acceso al scope VENTURE.

**Garantia minima:** VELA no presenta datos inventados; si falta evidencia informa insuficiencia.

**Garantia de exito:** el actor recibe pulse, prioridad, evidencia, accion recomendada y puede iniciar una intervencion.

**Postcondiciones:** si inicia una intervencion, queda persistida y se emite evento de dominio.

**Flujo principal**
1. El founder solicita el estado del venture.
2. VELA verifica acceso contextual.
3. VELA obtiene datos operativos canonicos del venture.
4. VELA calcula metricas disponibles y estados de suficiencia.
5. VELA sintetiza una prioridad operativa con evidencia.
6. VELA consulta aprendizaje relevante cuando existe.
7. VELA presenta pulse, prioridad, evidencia y accion.
8. El founder acepta iniciar la intervencion sugerida.
9. VELA valida nuevamente la accion solicitada.
10. VELA persiste la intervencion en PostgreSQL y emite evento.
11. VELA responde con confirmacion y estado actualizado.

**Alternativas**
- **3A — No existe venture:** VELA devuelve estado de configuracion y orienta a crear venture; finaliza.
- **4A — Datos insuficientes:** VELA marca metricas como `INSUFFICIENT_DATA`; continua con informacion disponible.
- **6A — Sin memoria previa:** VELA omite recomendacion historica; continua.
- **8A — El actor no inicia intervencion:** el CU finaliza en modo consulta.

**Excepciones**
- **E1:** sesion invalida/revocada → 401/403; sin cambios.
- **E2:** PostgreSQL no disponible → VELA no genera estado como si fuera valido; error controlado.
- **E3:** motor analitico falla → devuelve estado degradado sin fabricar conclusion.

**Reglas preliminares:** PRE-RN-AUTH-001/002, D4-04, D4-07.

**Relaciones**
- `<<include>> CU-AUTH-Z01 Verificar acceso contextual`.
- `<<extend>> Iniciar intervencion` desde paso 8.
- `<<extend>> Consultar Learning Memory` desde paso 6.
- No se modela Realtime como include: es mecanismo de actualizacion, no condicion funcional del objetivo.

**Datos:** Venture, Objective, Signal, Sprint, Decision, RiskAssessment, FundraisingPlan, Learning Memory.

**APIs/servicios actuales:** `/api/home/pulse`, `/api/home/interventions`, `/api/home/events`, Home Intelligence, Intervention Engine.

**Persistencia:** PostgreSQL; memoria derivada en Atlas cuando aplique.

**Estado:** IMPLEMENTADO/PARCIAL.

---

# CU-BLD-001 — Gestionar ejecucion

**Objetivo:** convertir prioridades en objetivos, dependencias, sprints y gates trazables.

**Actor principal:** Founder/Owner  
**Secundario:** Team member autorizado  
**Alcance:** VENTURE  
**Nivel:** objetivo de usuario

**HU:** HU-BLD-001–006, HU-ENG-001–003.

**Disparador:** actor inicia trabajo en Build/Engine.

**Precondiciones:** sesion valida; acceso al venture.

**Garantia minima:** una operacion invalida no modifica objetivos/sprints/gates.

**Garantia de exito:** el estado de ejecucion queda persistido y analizable.

**Flujo principal**
1. Actor consulta el tablero de ejecucion.
2. VELA verifica acceso.
3. VELA carga objetivos y estado asociado.
4. Actor crea o modifica un objetivo.
5. VELA valida datos y scope.
6. VELA persiste el cambio en PostgreSQL.
7. VELA emite evento de dominio.
8. Actor define/actualiza sprint o gate cuando corresponde.
9. VELA persiste el cambio correspondiente.
10. VELA analiza dependencias, bloqueos, cobertura y trabajo prematuro.
11. VELA devuelve estado actualizado.

**Alternativas**
- **4A — El actor elimina objetivo:** VELA verifica ownership/capability, elimina y actualiza vista.
- **8A — Sin sprint:** VELA conserva objetivos y muestra falta de cadencia.
- **8B — Gate no resuelto:** permanece `pending`.
- **10A — No hay dependencias:** inteligencia devuelve grafo sin cadena critica.

**Excepciones**
- objetivo inexistente;
- actor sin capability;
- conflicto de concurrencia;
- persistencia fallida.

**Relaciones**
- `<<include>> CU-AUTH-Z01`.
- `<<extend>> Analizar dependencias` despues de cambios.
- `<<extend>> Gestionar sprint`.
- `<<extend>> Gestionar gate`.

**Datos:** Objective, ObjectiveDependency, Sprint, SprintItem, Gate, DomainEventRecord.

**APIs:** `/api/objectives`, `/api/sprints`, `/api/gates`, `/api/build/intelligence`, `/api/objectives/graph`.

**Estado:** IMPLEMENTADO para owner; PARCIAL para team member.

---

# CU-VAL-001 — Gestionar evidencia de validacion

**Objetivo:** registrar, vincular y analizar evidencia que soporte o cuestione objetivos/hipotesis.

**Actor principal:** Founder/Owner  
**Secundario:** Team member autorizado  
**Alcance:** VENTURE

**HU:** HU-VAL-001–006.

**Disparador:** actor registra o consulta una señal.

**Precondiciones:** acceso al venture.

**Flujo principal**
1. Actor consulta evidencia existente.
2. VELA verifica acceso.
3. VELA muestra señales y cobertura.
4. Actor selecciona tipo de evidencia.
5. Actor registra titulo, resultado/hipotesis/aprendizaje y objetivo opcional.
6. VELA valida tipo y, si existe objetivo, valida acceso al objetivo.
7. VELA persiste Signal.
8. VELA emite evento cuando aplique.
9. VELA recalcula cobertura y blind spots.
10. VELA sugiere siguiente foco de validacion sin fabricar evidencia.

**Alternativas**
- **5A — Señal sin objetivo:** se guarda como unlinked; VELA lo refleja.
- **6A — Objetivo inexistente/no autorizado:** rechazo; sin escritura.
- **10A — Cobertura suficiente:** VELA puede indicar estabilidad en vez de recomendar nueva evidencia.

**Excepciones:** auth, DB, motor de inteligencia.

**Relaciones**
- `<<include>> CU-AUTH-Z01`.
- `<<extend>> Vincular evidencia a objetivo`.
- `<<extend>> Sugerir siguiente evidencia`.
- `<<extend>> Eliminar evidencia`.

**Datos:** Signal, Objective, DomainEventRecord.

**APIs:** `/api/signals`, `/api/validate/coverage`, `/api/validate/intelligence`.

**Estado:** IMPLEMENTADO owner / PARCIAL team member.

---

# CU-DEC-001 — Gestionar ciclo de decision y aprendizaje

**Objetivo:** dejar trazabilidad desde decision hasta resultado y aprendizaje.

**Actor:** Founder/Owner  
**Alcance:** VENTURE

**HU:** HU-ENG-004, HU-ENG-005, HU-CMD-004.

**Flujo principal**
1. Actor registra decision con contexto, choice, rationale y evidencia.
2. VELA verifica acceso.
3. VELA persiste Decision.
4. VELA emite evento.
5. Tiempo despues, actor registra resultado.
6. VELA valida ownership/capability.
7. VELA actualiza outcome/outcomeStatus.
8. Si el actor solicita consolidacion, VELA marca aprendizaje y emite evento.
9. Learning Memory procesa el resultado cuando corresponda.
10. VELA puede reutilizar dicho aprendizaje en recomendaciones futuras.

**Alternativas**
- **5A — Resultado aun desconocido:** decision permanece abierta.
- **8A — No consolidar aprendizaje:** se guarda outcome sin promoverlo a memoria.
- **9A — Atlas no disponible:** la verdad operacional permanece en PostgreSQL; memoria se recupera por replay cuando exista el circuito completo.

**Relaciones**
- `<<include>> CU-AUTH-Z01`.
- `<<extend>> Registrar resultado`.
- `<<extend>> Consolidar aprendizaje`.

**Datos:** Decision, DecisionLearning/InterventionLearning, DomainEventRecord, Atlas learning_memory.

**Estado:** IMPLEMENTADO/PARCIAL.

---

# CU-TEAM-001 — Gestionar equipo del venture

**Objetivo:** administrar membresia, roles, responsabilidades y capacidad.

**Actor principal:** Founder/Owner  
**Secundario:** Team member  
**Alcance:** VENTURE

**HU:** HU-TEAM-001–005, HU-VEN-004.

**Flujo principal**
1. Founder consulta roster.
2. VELA verifica acceso.
3. VELA devuelve miembros, habilidades, disponibilidad y capacidad.
4. Founder selecciona usuario activo.
5. Founder asigna rol y responsabilidad.
6. VELA valida usuario y venture.
7. VELA crea/reactiva VentureMember.
8. VELA emite evento.
9. Founder puede actualizar rol, responsabilidad o estado.
10. VELA recalcula capacidad y brechas.

**Alternativas**
- usuario inexistente;
- miembro ya existente → upsert/reactivacion;
- sin miembros → empty state;
- rol sin capability formal → se registra texto actual, pero no debe ampliar autorizacion por si solo.

**Relaciones**
- `<<include>> CU-AUTH-Z01`.
- `<<extend>> Analizar capacidad`.
- Futuro: `<<include>> Resolver capabilities de venture` en acciones protegidas.

**Datos:** Venture, VentureMember, User, UserSkill, WorkAssignment.

**APIs:** `/api/team`, `/api/team/capacity`.

**Estado:** IMPLEMENTADO en membership; FALTANTE/PARCIAL en authorization.

---

# CU-RES-001 — Gestionar recursos operativos

**Objetivo:** registrar y mantener recursos del venture.

**Actor:** Founder/Owner; Team member autorizado  
**Alcance:** VENTURE

**HU:** HU-RES-001–004.

**Flujo principal**
1. Actor consulta recursos.
2. VELA verifica acceso.
3. Actor registra recurso.
4. VELA valida datos.
5. VELA persiste recurso y evento.
6. Actor actualiza estado, criticidad, uso, costo o responsable.
7. VELA valida scope y persiste.
8. VELA analiza disponibilidad, criticidad y subutilizacion.

**Alternativas:** sin venture; recurso inexistente; integrante sin capability.

**Relaciones:** `<<include>> CU-AUTH-Z01`; `<<extend>> Analizar salud de recursos`.

**Datos:** SpaceResource, ResourceAllocation, VentureMember.

**Estado:** IMPLEMENTADO owner / PARCIAL member.

---

# CU-CAP-001 — Gestionar base financiera

**Objetivo:** mantener snapshots financieros verificables.

**Actor:** Founder/Owner  
**Alcance:** VENTURE

**HU:** HU-CAP-001.

**Flujo principal**
1. Actor abre Capital.
2. VELA verifica acceso y venture.
3. Actor registra periodo, revenue, operatingCosts y campos opcionales.
4. VELA valida formato y valores.
5. VELA hace upsert de FinancialSnapshot.
6. VELA emite `financial_snapshot_recorded`.
7. VELA devuelve snapshot persistido.

**Alternativas:** periodo ya existe → update; datos insuficientes → 400.

**Datos:** FinancialSnapshot.

**API:** `/api/capital/valuation` kind=snapshot.

**Estado:** IMPLEMENTADO.

---

# CU-CAP-002 — Evaluar estrategia de capital

**Objetivo:** evaluar readiness, valuation, fundraising y escenarios antes de ejecutar.

**Actor:** Founder/Owner  
**Alcance:** VENTURE

**HU:** HU-CAP-002,003,005,006.

**Precondicion:** base financiera cuando el subflujo lo requiera.

**Flujo principal**
1. Actor solicita evaluacion de capital.
2. VELA verifica acceso.
3. VELA obtiene snapshot y evidencia operacional.
4. VELA calcula readiness o devuelve insuficiencia.
5. Actor define supuestos.
6. VELA calcula valoracion/fundraising/scenario segun solicitud.
7. Si usa optimizacion, VELA aplica parametros gobernados.
8. VELA persiste el caso analitico correspondiente.
9. VELA emite evento.
10. VELA presenta resultados, supuestos y confidence/evidence.

**Alternativas**
- sin snapshot → no ejecutar modelos que lo requieran;
- sin evidencia suficiente → `INSUFFICIENT_DATA`;
- escenario inviable → resultado analitico, sin mutar estado operacional;
- modelo costoso innecesario → usar regla deterministica.

**Relaciones**
- `<<include>> CU-AUTH-Z01`.
- `<<include>> CU-CAP-001 Gestionar base financiera` solo como precondicion funcional de subflujos que la requieren, no ejecucion automatica.
- `<<extend>> Simular escenario`.
- `<<extend>> Generar fundraising plan`.

**Datos:** FinancialSnapshot, ValuationCase, ForecastScenario, CapitalScenario, FundraisingPlan.

**Motores:** valuation, forecasting, GWO/scenario optimizer, Digital Twin cuando aplique.

**Estado:** IMPLEMENTADO/PARCIAL.

---

# CU-CAP-003 — Ejecutar plan de capital

**Objetivo:** convertir una estrategia financiada en estado operacional solo tras confirmacion explicita.

**Actor:** Founder/Owner  
**Alcance:** VENTURE

**HU:** HU-CAP-004.

**Flujo principal**
1. Actor selecciona plan.
2. VELA verifica acceso y pertenencia del plan al venture.
3. VELA presenta consecuencias/estado actual.
4. Actor confirma explicitamente activacion.
5. VELA valida `confirmed=true`.
6. VELA cambia FundraisingPlan a funded.
7. VELA emite `fundraising_plan_activated`.
8. VELA devuelve estado confirmado.

**Alternativa 4A:** actor no confirma → no hay mutacion.

**Excepciones:** plan inexistente, venture inexistente, persistencia fallida.

**Regla:** simulacion no equivale a ejecucion.

**Estado:** IMPLEMENTADO.

---

# CU-RISK-001 — Gestionar riesgo del venture

**Objetivo:** evaluar y revisar riesgo/resiliencia con evidencia.

**Actor:** Founder/Owner  
**Alcance:** VENTURE

**HU:** HU-RISK-001, HU-RISK-002.

**Flujo principal**
1. Actor solicita nueva evaluacion.
2. VELA verifica acceso.
3. VELA obtiene snapshot financiero.
4. Actor proporciona exposiciones complementarias.
5. VELA ejecuta Risk Engine.
6. VELA persiste RiskAssessment, RiskSignals y ResilienceSnapshot.
7. VELA emite evento.
8. VELA presenta dimensiones, evidence, confidence y acciones.

**Alternativas:** sin snapshot → solicitar evidencia; campos opcionales ausentes → confidence puede disminuir.

**Regla:** riesgo detectado no es causalidad ni prediccion cierta.

**Estado:** IMPLEMENTADO.

---

# CU-BLD-002 — Colaborar en ejecucion autorizada

**Objetivo:** permitir a un team member operar objetivos permitidos.

**Actor:** Team member  
**Alcance:** VENTURE

**HU:** HU-BLD-006, HU-VEN-004, HU-TEAM-005.

**Precondiciones objetivo:** VentureMember activo + capability adecuada.

**Flujo objetivo**
1. Miembro solicita objetivos del venture.
2. VELA verifica sesion.
3. VELA resuelve membership activa.
4. VELA resuelve capabilities.
5. VELA devuelve solo recursos permitidos.
6. Miembro actualiza objetivo/asignacion permitida.
7. VELA revalida capability sobre el recurso.
8. VELA persiste y emite evento.

**Alternativas:** membership inactiva; capability insuficiente; recurso fuera del scope.

**Estado:** PARCIAL/FALTANTE en autorizacion general.

---

# CU-VAL-002 — Registrar evidencia autorizada

**Actor:** Team member  
**Alcance:** VENTURE  
**HU:** HU-VAL-006, HU-TEAM-005.

**Flujo objetivo:** resolver membership/capability → validar objetivo del venture → registrar Signal con autoria del miembro → evento → recalculo de cobertura.

**Estado:** PARCIAL.

---

# CU-RES-002 — Gestionar recursos asignados

**Actor:** Team member  
**Alcance:** VENTURE  
**HU:** HU-RES-004, HU-TEAM-005.

**Flujo objetivo:** resolver membership → verificar asignacion/capability → permitir lectura/actualizacion del recurso asignado → evento/auditoria.

**Estado:** PARCIAL.

---

# CU-ORG-001 — Gestionar membresia organizacional

**Objetivo:** administrar miembros y roles contextuales de una organizacion.

**Actor:** Organization admin  
**Alcance:** ORGANIZATION

**HU:** HU-ORG-002, HU-ORG-003.

**Flujo objetivo**
1. Admin solicita miembros de organizacion.
2. VELA verifica acceso contextual.
3. VELA lista OrganizationUser.
4. Admin invita/agrega o cambia rol.
5. VELA valida que el actor tenga `organization.members.manage`.
6. VELA persiste membership/role.
7. VELA audita el cambio.

**Alternativas:** usuario ya miembro; rol invalido; actor sin capability.

**Datos:** Organization, OrganizationUser, AuditLog.

**Estado:** FALTANTE/PARCIAL.

---

# CU-ORG-002 — Consultar portafolio autorizado

**Actor:** Organization admin/viewer/mentor autorizado  
**Alcance:** ORGANIZATION

**HU:** HU-ORG-001.

**Flujo objetivo**
1. Actor selecciona organizacion.
2. VELA verifica membership y role/capabilities.
3. VELA obtiene cohorts y ventures vinculados.
4. VELA aplica filtros de visibilidad/consentimiento.
5. VELA construye PortfolioState agregado.
6. VELA devuelve solo informacion autorizada.

**Alternativas:** sin membership; viewer read-only; venture sin consentimiento para detalle → solo agregado permitido.

**Excepcion critica actual:** `buildPortfolioState()` consulta `OrganizationUser.status`, campo ausente en schema auditado.

**Estado:** PARCIAL.

---

# CU-ORG-003 — Analizar riesgo agregado

**Actor:** Organization admin/analyst autorizado  
**Alcance:** ORGANIZATION

**HU:** HU-RISK-003.

**Flujo objetivo**
1. Actor solicita riesgo agregado.
2. VELA verifica acceso organizacional.
3. VELA obtiene snapshots agregables permitidos.
4. VELA calcula/distribuye señales de portafolio.
5. VELA persiste/consulta PortfolioRiskSnapshot segun flujo.
6. VELA presenta distribucion agregada sin ampliar acceso al detalle privado.

**Estado:** PARCIAL.

---

# CU-INV-001 — Revisar oportunidad compartida

**Actor:** Investor autorizado  
**Alcance:** RELATIONSHIP/ORGANIZATION

**HU:** HU-CAP-007.

**Flujo objetivo**
1. Investor abre oportunidad compartida.
2. VELA verifica identidad.
3. VELA verifica relacion/invitacion/consentimiento.
4. VELA determina campos compartibles.
5. VELA presenta oportunidad y evidencia permitida.
6. Investor registra review cuando tiene capability.
7. VELA persiste review y audita acceso sensible si aplica.

**Alternativas:** consentimiento revocado; oportunidad expirada; solo lectura.

**Datos:** InvestmentOpportunity, InvestmentReview, DataConsent.

**Estado:** PARCIAL.

---

# CU-REL-001 — Gestionar relacion profesional

**Actor:** Usuario autenticado  
**Alcance:** RELATIONSHIP

**HU:** HU-REL-001–004.

**Flujo principal**
1. Usuario consulta red.
2. VELA verifica sesion.
3. Usuario selecciona otro usuario.
4. Usuario crea/actualiza relacion permitida.
5. VELA valida que no sea consigo mismo y que el target exista.
6. VELA persiste UserConnection.
7. VELA emite evento.
8. VELA muestra inteligencia de relaciones si se solicita.

**Alternativas:** eliminar conexion; follow/collaborate/mentor.

**Regla:** relacion no concede acceso al venture/organization.

**Estado:** IMPLEMENTADO, con gobernanza de autorizacion DISEÑADA.

---

# CU-ADM-001 — Administrar usuarios de plataforma

**Actor:** Platform admin  
**Alcance:** PLATFORM

**HU:** HU-ADM-001.

**Flujo principal**
1. Admin solicita listado/operacion.
2. VELA verifica rol global admin.
3. Admin crea o actualiza usuario.
4. VELA valida payload y role global.
5. VELA persiste User.
6. Si cambia role, VELA registra AuditLog.
7. VELA responde con usuario actualizado.

**Alternativas:** email duplicado; datos invalidos; cambio sin role.

**Excepcion:** actualmente usa `requireRole()`; debe converger hacia garantias de `requireAuth()`.

**Estado:** IMPLEMENTADO/PARCIAL seguridad.

---

# CU-AUTH-001 — Autenticar y mantener sesion segura

**Actor:** Usuario  
**Alcance:** USER

**HU:** HU-AUTH-001, HU-AUTH-002, HU-AUTH-003.

**Flujo principal**
1. Usuario presenta credenciales.
2. VELA valida identidad.
3. VELA crea/valida AuthSession.
4. Si MFA aplica, VELA marca sesion pendiente.
5. Usuario completa MFA.
6. VELA habilita sesion.
7. En cada request protegido, VELA verifica token y sesion persistida.
8. Si sesion se revoca, futuras operaciones se rechazan.

**Relaciones**
- `<<extend>> Completar MFA` cuando mfaPending.
- `<<extend>> Revocar sesion` por usuario/admin.

**Datos:** User, AuthSession, MfaRecoveryCode, SecurityEvent, AccessLog.

**Estado:** IMPLEMENTADO/PARCIAL por coexistencia de `requireRole()`.

---

# CUS-DF-001 — Proyectar evento canonico a Atlas

**Actor:** VELA System  
**Alcance:** SYSTEM

**HU:** HU-INT-004.

**Objetivo:** reflejar eventos canonicos en memoria computacional sin hacer Atlas fuente de verdad.

**Disparador:** evento operacional confirmado en PostgreSQL.

**Precondiciones:** transaccion operacional exitosa; evento identificable.

**Flujo principal**
1. PostgreSQL confirma estado operacional.
2. VELA registra/dispone evento canonico.
3. Projector toma evento.
4. VELA transforma a documento derivado.
5. VELA agrega provenance/fingerprint.
6. VELA hace upsert idempotente en Atlas.
7. VELA registra checkpoint/resultado.

**Alternativas:** Atlas no configurado → skipped controlado; Atlas temporalmente indisponible → evento queda recuperable.

**Excepciones:** payload corrupto, version incompatible.

**Relacion:** `<<include>> Verificar provenance/integridad`.

**Estado:** PARCIAL; replay en Draft PR separado.

---

# CUS-RT-001 — Procesar cambio computacional en realtime

**Actor:** VELA System  
**Alcance:** SYSTEM

**HU:** HU-INT-005, HU-CMD-005.

**Objetivo:** detectar cambios derivados relevantes y convertirlos en eventos realtime candidatos.

**Disparador:** Change Stream de Atlas.

**Flujo objetivo**
1. Worker abre Change Stream sobre colecciones permitidas.
2. Atlas entrega change event.
3. VELA valida resume token y namespace.
4. VELA normaliza evento a envelope interno.
5. VELA determina subject/scope.
6. VELA entrega envelope al Trust Layer.
7. Si autorizado, Realtime Gateway publica a subscribers.

**Alternativas:** cambio irrelevante → descartar; resume token recuperable → reanudar stream.

**Excepciones:** stream cae, token invalido, Atlas no disponible.

**Estado:** FALTANTE.

---

# CUS-TRUST-001 — Autorizar publicacion realtime

**Actor:** VELA System  
**Alcance:** SYSTEM

**HU:** HU-INT-005.

**Objetivo:** impedir que realtime publique datos fuera de audience/scope o con provenance invalida.

**Flujo objetivo**
1. Trust Layer recibe envelope.
2. Verifica provenance/fingerprint/version.
3. Clasifica sensibilidad.
4. Resuelve subject y scope.
5. Resuelve audiences/subscriptions.
6. Aplica consentimiento/capabilities.
7. Reduce payload al minimo necesario.
8. Emite decision `ALLOW/DENY/REDACT`.
9. Audita decisiones sensibles.
10. Gateway publica solo payload autorizado.

**Regla:** Change Stream no decide permisos.

**Estado:** FALTANTE/PARCIAL (existen piezas de security/data classification, no el pipeline completo).

---

# CUS-RPL-001 — Reconstruir memoria computacional mediante replay

**Actor:** VELA System  
**Alcance:** SYSTEM

**HU:** HU-INT-006.

**Objetivo:** reconstruir Atlas desde PostgreSQL sin duplicacion ni perdida.

**Disparadores:** recuperacion de Atlas, operacion manual autorizada, deteccion de lag.

**Flujo objetivo**
1. VELA lee checkpoint.
2. Lee eventos canonicos posteriores ordenados deterministicamente.
3. Valida payload/version.
4. Proyecta cada evento de forma idempotente.
5. Actualiza checkpoint solo tras proyeccion exitosa.
6. Repite por lotes.
7. Compara conteo/lag.
8. Declara `IN_SYNC` cuando corresponda.

**Alternativas:** evento ya proyectado → upsert no duplica; lote parcial → checkpoint conserva ultimo exito.

**Excepciones:** PostgreSQL falla → detener; Atlas falla → detener sin avanzar checkpoint.

**Datos:** DomainEventRecord, Atlas event_documents, replay_state.

**Estado:** DISEÑADO/PARCIAL en Draft PR #1.

---

## 2. Relaciones UML principales

### Includes justificados

| Caso origen | Relacion | Caso destino | Justificacion |
|---|---|---|---|
| CU-CMD-001 | include | CU-AUTH-Z01 | todo acceso al venture requiere autorizacion |
| CU-BLD-001 | include | CU-AUTH-Z01 | mutaciones operativas requieren scope/capability |
| CU-VAL-001 | include | CU-AUTH-Z01 | evidencia pertenece a un scope protegido |
| CU-TEAM-001 | include | CU-AUTH-Z01 | membresia solo la gestiona actor autorizado |
| CU-RES-001 | include | CU-AUTH-Z01 | recursos son venture-scoped |
| CU-CAP-* | include | CU-AUTH-Z01 | datos financieros son protegidos |
| CU-RISK-001 | include | CU-AUTH-Z01 | riesgo es informacion privada del venture |
| CU-ORG-* | include | CU-AUTH-Z01 | requiere membership contextual |
| CU-INV-001 | include | CU-AUTH-Z01 | requiere relacion/consentimiento |
| CU-ADM-001 | include | CU-AUTH-Z01 | administracion requiere role global |
| CUS-DF-001 | include | Verificar provenance | integridad obligatoria del dato derivado |
| CUS-RT-001 | include | CUS-TRUST-001 | ningun cambio se publica sin Trust decision |

### Extends justificados

| Caso base | extension | condicion |
|---|---|---|
| CU-CMD-001 | Iniciar intervencion | actor decide actuar |
| CU-CMD-001 | Consultar Learning Memory | existen memorias relevantes |
| CU-BLD-001 | Analizar dependencias | hay objetivos/dependencias suficientes |
| CU-BLD-001 | Gestionar sprint | actor usa cadencia temporal |
| CU-BLD-001 | Gestionar gate | proceso necesita criterio de avance |
| CU-VAL-001 | Vincular evidencia | actor selecciona objetivo |
| CU-VAL-001 | Sugerir siguiente evidencia | inteligencia disponible |
| CU-DEC-001 | Registrar resultado | decision ya tiene outcome |
| CU-DEC-001 | Consolidar aprendizaje | actor/sistema decide promoverlo |
| CU-CAP-002 | Simular escenario | actor solicita comparacion |
| CU-CAP-002 | Generar fundraising | existe base financiera suficiente |
| CU-AUTH-001 | Completar MFA | cuenta/sesion requiere MFA |

---

## 3. Matriz HU → CU → Implementacion

| HU | CU | Implementacion principal | Estado |
|---|---|---|---|
| HU-CMD-001/002/003/004 | CU-CMD-001 | Home Pulse / Interventions / Learning | IMPLEMENTADO/PARCIAL |
| HU-CMD-005 | CU-CMD-001 + CUS-RT-001 | SSE actual / Change Streams futuro | PARCIAL |
| HU-BLD-001–005 | CU-BLD-001 | objectives, build intelligence, graph | IMPLEMENTADO |
| HU-BLD-006 | CU-BLD-002 | VentureMember + objectives | PARCIAL |
| HU-VAL-001–005 | CU-VAL-001 | signals, coverage, validate intelligence | IMPLEMENTADO |
| HU-VAL-006 | CU-VAL-002 | Signal + membership futura | PARCIAL |
| HU-ENG-001–003 | CU-BLD-001 | sprints + gates | IMPLEMENTADO |
| HU-ENG-004/005 | CU-DEC-001 | decisions + learning | IMPLEMENTADO |
| HU-VEN-001/002/003 | CU-CMD-001 / onboarding venture | ventures + venture intelligence | IMPLEMENTADO/PARCIAL |
| HU-VEN-004 | CU-BLD-002 / CU-TEAM-001 | VentureMember | PARCIAL |
| HU-TEAM-001–004 | CU-TEAM-001 | team + capacity | IMPLEMENTADO |
| HU-TEAM-005 | CU-TEAM-001 + CU-AUTH-Z01 | capability resolver futuro | FALTANTE |
| HU-RES-001–003 | CU-RES-001 | resources + intelligence | IMPLEMENTADO |
| HU-RES-004 | CU-RES-002 | assignment/capability | PARCIAL |
| HU-CAP-001 | CU-CAP-001 | FinancialSnapshot | IMPLEMENTADO |
| HU-CAP-002/003/005/006 | CU-CAP-002 | valuation/readiness/fundraising/scenario | IMPLEMENTADO/PARCIAL |
| HU-CAP-004 | CU-CAP-003 | capital execution | IMPLEMENTADO |
| HU-CAP-007 | CU-INV-001 | InvestmentOpportunity/Review | PARCIAL |
| HU-RISK-001/002 | CU-RISK-001 | risk assessments | IMPLEMENTADO |
| HU-RISK-003 | CU-ORG-003 | portfolio risk | PARCIAL |
| HU-REL-001–003 | CU-REL-001 | platform connect/relay intelligence | IMPLEMENTADO |
| HU-REL-004 | CU-REL-001 + CU-AUTH-Z01 | regla de separacion auth | DISEÑADO |
| HU-ORG-001 | CU-ORG-002 | PortfolioState | PARCIAL |
| HU-ORG-002/003 | CU-ORG-001 | OrganizationUser | FALTANTE/PARCIAL |
| HU-INT-001–003 | soporte CU humanos | state/features/graph/contracts | IMPLEMENTADO/PARCIAL |
| HU-INT-004 | CUS-DF-001 | Event Store + Atlas projection | PARCIAL |
| HU-INT-005 | CUS-RT-001 + CUS-TRUST-001 | futuro Change Streams/Trust | FALTANTE |
| HU-INT-006 | CUS-RPL-001 | Draft PR replay | PARCIAL |
| HU-AUTH-001–003 | CU-AUTH-001 | auth/session/MFA | IMPLEMENTADO/PARCIAL |
| HU-ADM-001 | CU-ADM-001 | admin/users | IMPLEMENTADO/PARCIAL |

---

## 4. Datos y motores por CU

| CU | PostgreSQL | MongoDB Atlas | Motor/inteligencia |
|---|---|---|---|
| CU-CMD-001 | Venture, Objective, Signal, Sprint, Decision, Risk, Capital | Learning Memory derivada | Home Intelligence, root cause |
| CU-BLD-001 | Objective, Dependency, Sprint, Gate | opcional snapshots derivados | Build Intelligence, Graph |
| CU-VAL-001 | Signal, Objective | memoria derivada cuando aplique | Validate Intelligence |
| CU-DEC-001 | Decision, learning records | learning_memory | Learning Memory |
| CU-TEAM-001 | VentureMember, UserSkill, WorkAssignment | graph snapshots | Team Intelligence |
| CU-RES-001 | SpaceResource, Allocation | opcional | Resource Intelligence |
| CU-CAP-001 | FinancialSnapshot | no requerido | deterministic validation |
| CU-CAP-002 | Valuation/Forecast/Scenario/Fundraising | computational runs | valuation, forecasting, GWO, Twin |
| CU-CAP-003 | FundraisingPlan/Deployment | no canonico | rules |
| CU-RISK-001 | RiskAssessment, Signal, Resilience | computational state | Risk Engine |
| CU-ORG-* | OrganizationUser, Cohort, PortfolioRisk | portfolio state derivado | Portfolio Intelligence |
| CU-INV-001 | Opportunity, Review, Consent | matching outputs | Matching/Investment Intelligence |
| CUS-DF-001 | DomainEventRecord | event_documents | projector |
| CUS-RT-001 | subscription/audit refs | Change Streams | realtime normalization |
| CUS-TRUST-001 | identity/membership/consent/audit | payload derivado | trust policy |
| CUS-RPL-001 | DomainEventRecord | event_documents/replay_state | deterministic replay |

---

## 5. Invariantes de consistencia

1. Ningun CU puede considerar Atlas fuente de autorizacion.
2. Ningun CU debe persistir una simulacion como ejecucion sin confirmacion explicita.
3. Un error posterior a una transaccion canonica no debe revertir artificialmente la verdad de PostgreSQL si la operacion operacional ya fue confirmada.
4. Si una operacion requiere varias escrituras canonicas inseparables, deben ejecutarse de forma atomica/transaccional.
5. Las proyecciones Atlas deben ser idempotentes.
6. Las notificaciones realtime no modifican por si mismas el estado canonico.
7. Membership no implica capability ilimitada.
8. Connection social no implica membership.
9. Confidence y evidence deben acompañar resultados analiticos cuando exista incertidumbre.
10. `INSUFFICIENT_DATA` es un resultado valido y preferible a una cifra inventada.

---

## 6. Salida para FASE 6

FASE 6 debe convertir las reglas implicitas de estos CU en reglas de negocio versionadas con IDs definitivos:

- RN-AUTH-*
- RN-VEN-*
- RN-BLD-*
- RN-VAL-*
- RN-TEAM-*
- RN-CAP-*
- RN-RISK-*
- RN-ORG-*
- RN-REL-*
- RN-INT-*
- RN-TRUST-*

Cada RN debera indicar:
descripcion, actor, condicion, permitido/prohibido, CU relacionado, punto de validacion y persistencia involucrada.
