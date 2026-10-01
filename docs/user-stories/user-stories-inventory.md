# VELA 2.14 — FASE 3: Inventario y normalizacion de historias de usuario

Estado: ESPECIFICACION DERIVADA DEL REPOSITORIO  
Base auditada: `master`  
Dependencia: `docs/requirements/actors-permissions.md`

## 1. Criterio de inclusion

Una historia entra en este inventario cuando existe evidencia suficiente en al menos una de estas superficies:

- API o servicio funcional;
- modelo persistente;
- interfaz que consume una API real;
- evento de dominio;
- prueba o contrato funcional.

No se considera implementada una capacidad solo porque aparezca como texto de UI.

Estados:

- **IMPLEMENTADO**: flujo principal observable end-to-end.
- **PARCIAL**: existe parte sustancial, pero falta autorizacion, flujo, persistencia o cierre funcional.
- **DISEÑADO**: hay estructura/contrato claro sin flujo completo.
- **FALTANTE**: necesidad identificada por la arquitectura pero sin implementacion suficiente.

---

## 2. Command / Home

### HU-CMD-001 — Consultar el estado operativo del venture

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero consultar un pulso consolidado de mi venture para comprender su estado operativo actual y dirigir mi atencion.

**Evidencia:** `src/app/vela/home-dashboard.tsx`, `/api/home/pulse`  
**Estado:** IMPLEMENTADO

**CA inicial**
- Dado un founder autenticado con datos operativos, cuando abre Home, entonces VELA presenta el Venture Pulse con metricas derivadas de datos persistidos.
- Dado que una metrica no tiene evidencia suficiente, VELA debe representarla como insuficiente/no disponible y no inventar un valor.

### HU-CMD-002 — Recibir una prioridad operativa explicada

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero recibir una prioridad operativa respaldada por evidencia para saber donde concentrar mi siguiente accion.

**Evidencia:** Home `command`, evidence, affectedMetric, action.  
**Estado:** IMPLEMENTADO

### HU-CMD-003 — Iniciar una intervencion sugerida

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero convertir una intervencion sugerida por VELA en una accion operativa para actuar sobre una señal detectada.

**Evidencia:** `acceptIntervention()`, `POST /api/home/interventions`.  
**Estado:** IMPLEMENTADO

### HU-CMD-004 — Consultar aprendizaje de intervenciones previas

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero consultar aprendizaje derivado de intervenciones anteriores para evitar repetir acciones ineficaces y reutilizar respuestas con evidencia favorable.

**Evidencia:** `learningMemory` en Home, Learning Memory services.  
**Estado:** IMPLEMENTADO/PARCIAL

**Nota:** la memoria existe, pero la arquitectura 2.14 aun debe cerrar Atlas Change Streams, realtime y replay.

### HU-CMD-005 — Recibir actualizaciones operativas en tiempo casi real

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero que las vistas operativas se actualicen cuando cambian los datos para trabajar con el estado reciente del sistema.

**Evidencia:** `EventSource("/api/home/events")` en Home, Build, Validate y Team.  
**Estado:** PARCIAL

**Brecha:** el circuito objetivo Atlas Change Streams → Realtime → Trust Layer → Replay no esta cerrado.

---

## 3. Build

### HU-BLD-001 — Crear un objetivo de ejecucion

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero crear un objetivo con descripcion, estado, prioridad y fecha para convertir prioridades del venture en trabajo explicito.

**Evidencia:** `POST /api/objectives`, `src/app/build/build-page.tsx`.  
**Estado:** IMPLEMENTADO

### HU-BLD-002 — Consultar objetivos

**Actor:** Founder/Owner  
**Scope:** VENTURE/USER  
**Historia:** Como founder quiero consultar y filtrar mis objetivos para conocer el trabajo activo, bloqueado, en riesgo y completado.

**Evidencia:** `GET /api/objectives`.  
**Estado:** IMPLEMENTADO

### HU-BLD-003 — Actualizar estado de un objetivo

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero actualizar el estado de un objetivo para mantener el estado de ejecucion sincronizado con la realidad.

**Evidencia:** `PATCH /api/objectives`, evento `objective_updated`.  
**Estado:** IMPLEMENTADO

### HU-BLD-004 — Eliminar un objetivo propio

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero eliminar un objetivo propio que ya no corresponda al plan para mantener limpio el sistema de ejecucion.

**Evidencia:** `DELETE /api/objectives`.  
**Estado:** IMPLEMENTADO

### HU-BLD-005 — Analizar dependencias y bloqueos

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero que VELA analice dependencias, caminos criticos, bloqueos y trabajo prematuro para detectar restricciones de ejecucion.

**Evidencia:** `GET /api/build/intelligence`, Build Intelligence, graph.  
**Estado:** IMPLEMENTADO

### HU-BLD-006 — Ejecutar objetivos como integrante del venture

**Actor:** Team member  
**Scope:** VENTURE  
**Historia:** Como integrante del equipo quiero consultar y actualizar los objetivos para los que tengo autorizacion para colaborar en la ejecucion del venture.

**Evidencia:** `VentureMember`, `WorkAssignment`.  
**Estado:** PARCIAL

**Brecha:** `/api/objectives` sigue filtrando por `ownerId = session.sub` y no resuelve membership/capabilities.

---

## 4. Validate

### HU-VAL-001 — Registrar evidencia de validacion

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero registrar experimentos, entrevistas, metricas o insights para conservar evidencia de validacion.

**Evidencia:** `POST /api/signals`, `src/app/validate/validate-page.tsx`.  
**Estado:** IMPLEMENTADO

### HU-VAL-002 — Vincular evidencia a un objetivo

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero vincular una señal a un objetivo para saber que evidencia soporta o cuestiona el trabajo que estoy ejecutando.

**Evidencia:** `Signal.objectiveId`, validacion de ownership en `POST /api/signals`.  
**Estado:** IMPLEMENTADO

### HU-VAL-003 — Consultar evidencia

**Actor:** Founder/Owner  
**Scope:** VENTURE/USER  
**Historia:** Como founder quiero consultar y filtrar mis señales por tipo y objetivo para revisar la base de evidencia.

**Evidencia:** `GET /api/signals`.  
**Estado:** IMPLEMENTADO

### HU-VAL-004 — Identificar vacios de evidencia

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero conocer objetivos sin cobertura suficiente para decidir que debo validar a continuacion.

**Evidencia:** `/api/validate/coverage`, `/api/validate/intelligence`.  
**Estado:** IMPLEMENTADO

### HU-VAL-005 — Recibir recomendacion del siguiente tipo de evidencia

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero que VELA sugiera el siguiente foco y tipo de señal a registrar para orientar la validacion hacia los vacios detectados.

**Evidencia:** `suggestedSignalType`, `focusObjectiveId`.  
**Estado:** IMPLEMENTADO

### HU-VAL-006 — Registrar evidencia como integrante autorizado

**Actor:** Team member  
**Scope:** VENTURE  
**Historia:** Como integrante autorizado quiero registrar evidencia para los objetivos del venture en los que participo.

**Estado:** PARCIAL  
**Brecha:** Signal esta owner-scoped.

---

## 5. Engine / ejecucion

### HU-ENG-001 — Crear un sprint

**Actor:** Founder/Owner  
**Scope:** USER/VENTURE  
**Historia:** Como founder quiero crear un sprint con compromisos para establecer una cadencia de ejecucion.

**Evidencia:** `POST /api/sprints`.  
**Estado:** IMPLEMENTADO

### HU-ENG-002 — Actualizar compromisos y estado del sprint

**Actor:** Founder/Owner  
**Scope:** USER/VENTURE  
**Historia:** Como founder quiero marcar compromisos y actualizar el estado del sprint para reflejar el progreso real.

**Evidencia:** `PATCH /api/sprints`.  
**Estado:** IMPLEMENTADO

### HU-ENG-003 — Gestionar gates

**Actor:** Founder/Owner  
**Scope:** USER/VENTURE  
**Historia:** Como founder quiero crear y resolver gates para explicitar criterios de avance entre etapas.

**Evidencia:** `/api/gates`.  
**Estado:** IMPLEMENTADO

### HU-ENG-004 — Registrar una decision

**Actor:** Founder/Owner  
**Scope:** USER/VENTURE  
**Historia:** Como founder quiero registrar decisiones con contexto, eleccion, racional y evidencia para conservar trazabilidad de por que actue.

**Evidencia:** `/api/decisions`.  
**Estado:** IMPLEMENTADO

### HU-ENG-005 — Registrar resultado y aprendizaje de una decision

**Actor:** Founder/Owner  
**Scope:** USER/VENTURE  
**Historia:** Como founder quiero registrar el resultado de una decision para que VELA pueda aprender de su efectividad.

**Evidencia:** outcome, outcomeStatus, `decision_outcome_recorded`, `decision_learning_consolidated`.  
**Estado:** IMPLEMENTADO

---

## 6. Venture

### HU-VEN-001 — Crear un venture

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero registrar mi venture para que VELA pueda contextualizar la operacion y sus motores de inteligencia.

**Evidencia:** `POST /api/ventures`.  
**Estado:** IMPLEMENTADO

**Restriccion actual:** un usuario solo puede ser owner canonico de un Venture por `Venture.userId @unique`.

### HU-VEN-002 — Consultar el venture propio

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero consultar los datos de mi venture y sus diagnosticos para revisar su contexto persistido.

**Evidencia:** `GET /api/ventures`.  
**Estado:** IMPLEMENTADO

### HU-VEN-003 — Obtener inteligencia consolidada del venture

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero consultar inteligencia consolidada del venture para interpretar señales de negocio y ejecucion.

**Evidencia:** `/api/venture/intelligence`.  
**Estado:** IMPLEMENTADO/PARCIAL

### HU-VEN-004 — Acceder al mismo venture como miembro autorizado

**Actor:** Team member / Co-founder / Advisor  
**Scope:** VENTURE  
**Historia:** Como miembro autorizado quiero acceder al venture al que pertenezco sin necesitar ser su owner canonico.

**Estado:** PARCIAL

**Brecha:** multiples APIs resuelven el venture exclusivamente mediante `Venture.userId = session.sub`.

---

## 7. Team

### HU-TEAM-001 — Consultar integrantes del venture

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero consultar integrantes, roles, responsabilidades, habilidades y disponibilidad para comprender la estructura del equipo.

**Evidencia:** `GET /api/team`, Team Workspace.  
**Estado:** IMPLEMENTADO

### HU-TEAM-002 — Incorporar un usuario al venture

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero incorporar un usuario al venture con un rol y responsabilidad para formalizar su participacion.

**Evidencia:** `POST /api/team`.  
**Estado:** IMPLEMENTADO

### HU-TEAM-003 — Actualizar rol, responsabilidad o estado de un integrante

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero actualizar la responsabilidad y estado de un integrante para mantener vigente la estructura del equipo.

**Evidencia:** `PATCH /api/team`.  
**Estado:** IMPLEMENTADO

### HU-TEAM-004 — Analizar capacidad del equipo

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero conocer carga, concentracion, sobrecarga, vencimientos y trabajo sin asignar para distribuir mejor la ejecucion.

**Evidencia:** `/api/team/capacity`.  
**Estado:** IMPLEMENTADO

### HU-TEAM-005 — Aplicar permisos segun rol de venture

**Actor:** Founder/Owner / Team member  
**Scope:** VENTURE  
**Historia:** Como founder quiero que los roles de los integrantes determinen que acciones pueden ejecutar para colaborar sin otorgar privilegios innecesarios.

**Estado:** FALTANTE

**Evidencia de necesidad:** `VentureMember.role` existe pero es texto libre y no existe capability resolver.

---

## 8. Resources / Space

### HU-RES-001 — Registrar un recurso del venture

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero registrar recursos del venture para conocer activos, herramientas y capacidades disponibles.

**Evidencia:** `POST /api/resources`.  
**Estado:** IMPLEMENTADO

### HU-RES-002 — Actualizar disponibilidad y criticidad de un recurso

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero actualizar estado, criticidad, uso, costo y responsable de un recurso para mantener un inventario operativo.

**Evidencia:** `PATCH /api/resources`.  
**Estado:** IMPLEMENTADO

### HU-RES-003 — Analizar salud de recursos

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero identificar recursos criticos, no disponibles o infrautilizados para detectar restricciones y desperdicio.

**Evidencia:** `synthesizeResourceIntelligence`.  
**Estado:** IMPLEMENTADO

### HU-RES-004 — Gestionar recursos como integrante autorizado

**Actor:** Team member  
**Scope:** VENTURE  
**Historia:** Como integrante autorizado quiero actualizar los recursos que tengo asignados para reflejar su estado operativo.

**Estado:** PARCIAL  
**Brecha:** recursos se autorizan por `ownerId`.

---

## 9. Capital

### HU-CAP-001 — Registrar snapshot financiero

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero registrar ingresos, costos y otras variables financieras por periodo para construir una base financiera verificable.

**Evidencia:** `POST /api/capital/valuation` con `kind=snapshot`.  
**Estado:** IMPLEMENTADO

### HU-CAP-002 — Calcular una valoracion

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero calcular escenarios de valoracion desde datos financieros persistidos y supuestos explicitos para evaluar el venture.

**Evidencia:** `kind=valuation`, `valueVenture`.  
**Estado:** IMPLEMENTADO

### HU-CAP-003 — Crear un plan de fundraising

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero generar un plan de fundraising basado en mi snapshot financiero, runway y uso de fondos para estructurar una ronda.

**Evidencia:** `POST /api/capital/fundraising`.  
**Estado:** IMPLEMENTADO

### HU-CAP-004 — Activar un plan financiado con confirmacion explicita

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero confirmar explicitamente la activacion de un plan financiado para evitar que VELA convierta una simulacion en estado operacional sin consentimiento.

**Evidencia:** `POST /api/capital/execution`, `confirmed === true`.  
**Estado:** IMPLEMENTADO

### HU-CAP-005 — Consultar readiness e inteligencia de capital

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero conocer mi preparacion e inteligencia de capital para identificar brechas antes de buscar financiacion.

**Evidencia:** `/api/capital/readiness`, `/api/capital/intelligence`.  
**Estado:** IMPLEMENTADO

### HU-CAP-006 — Simular escenarios de capital

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero simular escenarios financieros y de capital para comparar consecuencias antes de ejecutar decisiones.

**Evidencia:** scenario optimizer, Digital Twin, intelligence lab.  
**Estado:** IMPLEMENTADO/PARCIAL

### HU-CAP-007 — Revisar informacion de capital como inversionista autorizado

**Actor:** Investor  
**Scope:** RELATIONSHIP/ORGANIZATION  
**Historia:** Como inversionista autorizado quiero revisar informacion de oportunidades que me hayan sido compartidas para realizar una evaluacion sin acceder a informacion privada no consentida.

**Evidencia:** InvestmentOpportunity, InvestmentReview, Softbox investor surfaces.  
**Estado:** PARCIAL

**Brecha:** no existe actor persistido/capability de inversionista suficientemente formalizado.

---

## 10. Risk

### HU-RISK-001 — Crear evaluacion de riesgo empresarial

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero evaluar riesgos empresariales utilizando evidencia financiera y exposiciones declaradas para identificar señales que requieren accion.

**Evidencia:** `POST /api/risk/assessments`.  
**Estado:** IMPLEMENTADO

### HU-RISK-002 — Consultar evaluaciones y señales de riesgo

**Actor:** Founder/Owner  
**Scope:** VENTURE  
**Historia:** Como founder quiero consultar evaluaciones historicas y señales para observar la exposicion y resiliencia del venture.

**Evidencia:** `GET /api/risk/assessments`, ResilienceSnapshot.  
**Estado:** IMPLEMENTADO

### HU-RISK-003 — Consultar riesgo agregado de portafolio

**Actor:** Organization admin / Analyst  
**Scope:** ORGANIZATION  
**Historia:** Como administrador o analista autorizado de una organizacion quiero consultar riesgo agregado de su portafolio para identificar concentraciones y necesidades de intervencion.

**Evidencia:** `PortfolioRiskSnapshot`, Portfolio State.  
**Estado:** PARCIAL

**Brecha critica:** Portfolio State consulta `OrganizationUser.status`, campo ausente en el schema auditado, y la autorizacion organizacional no esta cerrada.

---

## 11. Relay / Network

### HU-REL-001 — Conectar con otro usuario

**Actor:** Usuario autenticado  
**Scope:** RELATIONSHIP  
**Historia:** Como usuario quiero crear una relacion con otra persona para construir mi red de colaboracion.

**Evidencia:** `POST /api/platform/connect`.  
**Estado:** IMPLEMENTADO

### HU-REL-002 — Clasificar una relacion

**Actor:** Usuario autenticado  
**Scope:** RELATIONSHIP  
**Historia:** Como usuario quiero identificar una conexion como follow, collaborate o mentor para expresar el tipo de relacion profesional.

**Evidencia:** `ConnectionType`, platform/connect.  
**Estado:** IMPLEMENTADO

### HU-REL-003 — Consultar inteligencia de relaciones

**Actor:** Usuario autenticado  
**Scope:** RELATIONSHIP  
**Historia:** Como usuario quiero que VELA sintetice actividad, decisiones y conexiones para detectar señales relevantes de colaboracion.

**Evidencia:** `GET /api/relay/intelligence`.  
**Estado:** IMPLEMENTADO

### HU-REL-004 — Separar relacion social de autorizacion

**Actor:** Mentor / Founder  
**Scope:** RELATIONSHIP → VENTURE  
**Historia:** Como founder quiero que una relacion social de mentor no otorgue automaticamente acceso a datos privados del venture para conservar control sobre la informacion.

**Estado:** DISEÑADO

---

## 12. Organization / Portfolio

### HU-ORG-001 — Consultar portafolio organizacional

**Actor:** Organization admin / viewer / mentor autorizado  
**Scope:** ORGANIZATION  
**Historia:** Como miembro autorizado de una organizacion quiero consultar su portafolio y cohorts segun mi rol para comprender los ventures vinculados.

**Evidencia:** Organization, OrganizationUser, Cohort, PortfolioState.  
**Estado:** PARCIAL

### HU-ORG-002 — Administrar miembros de organizacion

**Actor:** Organization admin  
**Scope:** ORGANIZATION  
**Historia:** Como administrador de organizacion quiero administrar miembros y roles para controlar quien accede al contexto organizacional.

**Estado:** FALTANTE/PARCIAL

### HU-ORG-003 — Aplicar permisos organizacionales

**Actor:** Organization admin  
**Scope:** ORGANIZATION  
**Historia:** Como administrador de organizacion quiero que VELA aplique el rol de OrganizationUser a cada operacion para evitar accesos fuera del alcance asignado.

**Estado:** FALTANTE

---

## 13. Intelligence / System

### HU-INT-001 — Construir estado computacional desde datos canonicos

**Actor:** VELA System  
**Scope:** SYSTEM  
**Historia:** Como sistema VELA quiero construir estados computacionales desde datos operacionales persistidos para alimentar inteligencia sin sustituir la fuente canonica.

**Evidencia:** State Engine, ComputationalStateSnapshot.  
**Estado:** IMPLEMENTADO/PARCIAL

### HU-INT-002 — Construir grafo de conocimiento del venture

**Actor:** VELA System  
**Scope:** SYSTEM/VENTURE  
**Historia:** Como sistema VELA quiero relacionar personas, objetivos, asignaciones, recursos, capital y riesgos para razonar sobre dependencias del venture.

**Evidencia:** `knowledge-graph.ts`.  
**Estado:** IMPLEMENTADO

### HU-INT-003 — Ejecutar inteligencia solo con evidencia suficiente

**Actor:** VELA System  
**Scope:** SYSTEM  
**Historia:** Como sistema VELA quiero expresar estados de datos insuficientes y confidence para no presentar inferencias sin soporte como hechos.

**Evidencia:** multiples contratos `INSUFFICIENT_DATA`, confidence y evidence.  
**Estado:** IMPLEMENTADO/PARCIAL

### HU-INT-004 — Proyectar eventos canonicos hacia Atlas

**Actor:** VELA System  
**Scope:** SYSTEM  
**Historia:** Como sistema VELA quiero proyectar eventos canonicos de PostgreSQL hacia MongoDB Atlas para mantener memoria e inteligencia computacional desacopladas de la verdad operacional.

**Estado:** PARCIAL

### HU-INT-005 — Propagar cambios de Atlas hacia Realtime con Trust Layer

**Actor:** VELA System  
**Scope:** SYSTEM  
**Historia:** Como sistema VELA quiero consumir Change Streams de Atlas, validar confianza y audiencia, y publicar cambios autorizados en realtime para mantener las interfaces sincronizadas.

**Estado:** FALTANTE/PARCIAL

### HU-INT-006 — Reconstruir Atlas mediante replay desde PostgreSQL

**Actor:** VELA System  
**Scope:** SYSTEM  
**Historia:** Como sistema VELA quiero reconstruir la memoria computacional desde eventos canonicos de PostgreSQL cuando Atlas haya estado indisponible para recuperar consistencia sin convertir Atlas en fuente de verdad.

**Estado:** DISEÑADO/PARCIAL

---

## 14. Seguridad y administracion

### HU-AUTH-001 — Iniciar una sesion autenticada

**Actor:** Usuario  
**Scope:** USER  
**Historia:** Como usuario registrado quiero autenticarme para acceder a los recursos que me correspondan.

**Estado:** IMPLEMENTADO

### HU-AUTH-002 — Proteger una sesion con MFA

**Actor:** Usuario  
**Scope:** USER  
**Historia:** Como usuario quiero que una sesion que requiere MFA permanezca restringida hasta completar el segundo factor.

**Estado:** IMPLEMENTADO con `requireAuth()`.

### HU-AUTH-003 — Revocar una sesion

**Actor:** Usuario / Platform admin  
**Scope:** USER/PLATFORM  
**Historia:** Como usuario o administrador autorizado quiero que una sesion revocada deje de autorizar operaciones.

**Estado:** PARCIAL

**Brecha:** `requireRole()` no ofrece las mismas garantias que `requireAuth()`.

### HU-ADM-001 — Administrar usuarios de VELA

**Actor:** Platform admin  
**Scope:** PLATFORM  
**Historia:** Como administrador de VELA quiero crear y actualizar usuarios y roles globales para administrar acceso a la plataforma.

**Evidencia:** `/api/admin/users`.  
**Estado:** IMPLEMENTADO

---

## 15. Resumen por estado

| Dominio | Implementadas | Parciales | Diseñadas/Faltantes |
|---|---:|---:|---:|
| Command/Home | 3 | 2 | 0 |
| Build | 5 | 1 | 0 |
| Validate | 5 | 1 | 0 |
| Engine | 5 | 0 | 0 |
| Venture | 2 | 2 | 0 |
| Team | 4 | 0 | 1 |
| Resources | 3 | 1 | 0 |
| Capital | 5 | 2 | 0 |
| Risk | 2 | 1 | 0 |
| Relay/Network | 3 | 0 | 1 |
| Organization | 0 | 1 | 2 |
| Intelligence/System | 2 | 2 | 2 |
| Auth/Admin | 3 | 1 | 0 |

El inventario no representa exhaustivamente cada endpoint auxiliar. Agrupa capacidades observables desde la perspectiva de actores y objetivos.

---

## 16. Inconsistencias reveladas por las HU

### GAP-HU-001 — Colaboracion modelada pero no autorizada

`VentureMember` y `WorkAssignment` permiten representar equipos, pero Build, Validate, Resources, Capital y otros dominios continuan resolviendo ownership desde `session.sub`.

Afecta:

- HU-BLD-006
- HU-VAL-006
- HU-VEN-004
- HU-RES-004
- HU-TEAM-005

### GAP-HU-002 — Organization no tiene authorization boundary completo

Afecta:

- HU-RISK-003
- HU-ORG-001
- HU-ORG-002
- HU-ORG-003

### GAP-HU-003 — Realtime actual y arquitectura realtime 2.14 no son equivalentes

Existe SSE basado en `/api/home/events`, pero eso no demuestra el circuito:

```
Atlas Change Streams
→ Realtime
→ Trust Layer
→ Replay PostgreSQL
```

Afecta:

- HU-CMD-005
- HU-INT-004
- HU-INT-005
- HU-INT-006

### GAP-HU-004 — Actor inversionista incompleto

Existen superficies y modelos de inversion, pero falta una identidad contextual/capability formal.

Afecta:

- HU-CAP-007

### GAP-HU-005 — Scope USER y VENTURE mezclados

Sprints, decisiones, gates, objectives y signals conservan varios campos `ownerId` aun cuando funcionalmente forman parte del sistema operativo del venture.

FASE 4 debera decidir que historias forman un mismo objetivo y cuales deben migrar conceptualmente a scope VENTURE.

---

## 17. Entrada para FASE 4 — Agrupacion por objetivos

No se debe transformar cada HU en un CU.

Agrupaciones candidatas que FASE 4 debe validar:

```
Gestionar ejecucion
  HU-BLD-001
  HU-BLD-002
  HU-BLD-003
  HU-BLD-005
  HU-ENG-001
  HU-ENG-002

Gestionar validacion
  HU-VAL-001
  HU-VAL-002
  HU-VAL-003
  HU-VAL-004
  HU-VAL-005

Gestionar equipo
  HU-TEAM-001
  HU-TEAM-002
  HU-TEAM-003
  HU-TEAM-004
  HU-TEAM-005

Gestionar capital
  HU-CAP-001
  HU-CAP-002
  HU-CAP-003
  HU-CAP-004
  HU-CAP-005
  HU-CAP-006

Gestionar riesgo
  HU-RISK-001
  HU-RISK-002
  HU-RISK-003

Operar inteligencia en tiempo real
  HU-CMD-005
  HU-INT-004
  HU-INT-005
  HU-INT-006
```

Estas son agrupaciones candidatas, no casos de uso definitivos.
