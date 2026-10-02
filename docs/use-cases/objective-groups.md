# VELA 2.14 — FASE 4: Agrupacion de historias por objetivos funcionales

Estado: ESPECIFICACION FUNCIONAL  
Base: FASE 2 actores/permisos + FASE 3 inventario de HU  
Objetivo: definir unidades de intencion que serviran como frontera para los casos de uso de FASE 5.

## 1. Regla de agrupacion

Una agrupacion representa un **objetivo observable del actor**, no una pantalla, endpoint, tabla ni historia individual.

Una HU puede:
- pertenecer a un objetivo primario;
- actuar como soporte transversal de otro;
- convertirse en extension de un CU futuro;
- no producir un CU independiente.

Los objetivos se clasifican como:
- **CORE**: operacion principal del venture;
- **SUPPORT**: capacidad de soporte;
- **GOVERNANCE**: seguridad, permisos o administracion;
- **SYSTEM**: comportamiento interno de VELA.

## 2. Mapa macro

```
VELA 2.14
├── OBJ-01 Dirigir el venture
├── OBJ-02 Gestionar ejecucion
├── OBJ-03 Gestionar validacion
├── OBJ-04 Gestionar decisiones y aprendizaje
├── OBJ-05 Gestionar equipo y capacidad
├── OBJ-06 Gestionar recursos
├── OBJ-07 Gestionar capital
├── OBJ-08 Gestionar riesgo y resiliencia
├── OBJ-09 Gestionar relaciones y colaboracion
├── OBJ-10 Gestionar organizaciones y portafolios
├── OBJ-11 Gestionar identidad, acceso y autorizacion
└── OBJ-12 Operar memoria e inteligencia computacional
```

---

## OBJ-01 — Dirigir el venture

**Tipo:** CORE  
**Actor primario:** Founder/Owner  
**Scope objetivo:** VENTURE  
**Resultado observable:** el founder comprende el estado actual, identifica la prioridad operativa y puede iniciar una respuesta.

### HU primarias
- HU-CMD-001 — Consultar estado operativo.
- HU-CMD-002 — Recibir prioridad explicada.
- HU-CMD-003 — Iniciar intervencion.
- HU-CMD-004 — Consultar aprendizaje previo.
- HU-VEN-002 — Consultar venture.
- HU-VEN-003 — Obtener inteligencia consolidada.

### HU soporte
- HU-CMD-005 — Realtime.
- HU-INT-001/002/003 — estado, grafo y suficiencia de evidencia.

### Frontera futura de CU
No crear un CU separado para cada metrica de Home. El objetivo completo es **Dirigir venture con evidencia**; consultar pulse, recomendacion e iniciar intervencion son subflujos/extensiones.

### Dependencias
OBJ-02, OBJ-03, OBJ-04, OBJ-07, OBJ-08, OBJ-12.

---

## OBJ-02 — Gestionar ejecucion

**Tipo:** CORE  
**Actores:** Founder/Owner; Team member autorizado  
**Scope objetivo:** VENTURE  
**Resultado observable:** el venture convierte prioridades en objetivos, dependencias, sprints y compromisos trazables.

### HU primarias
- HU-BLD-001 — Crear objetivo.
- HU-BLD-002 — Consultar objetivos.
- HU-BLD-003 — Actualizar objetivo.
- HU-BLD-004 — Eliminar objetivo.
- HU-BLD-005 — Analizar dependencias/bloqueos.
- HU-BLD-006 — Ejecutar como integrante.
- HU-ENG-001 — Crear sprint.
- HU-ENG-002 — Actualizar sprint.
- HU-ENG-003 — Gestionar gates.

### Decisiones de frontera
- CRUD de Objective pertenece al mismo objetivo funcional.
- Sprint es una cadencia de ejecucion, no un dominio aislado.
- Gate es una restriccion/criterio de avance y puede convertirse en extension del CU de ejecucion.
- Build Intelligence es analisis del estado de ejecucion, no un actor.

### Brecha estructural
El scope actual mezcla USER/VENTURE. La especificacion objetivo normaliza ejecucion a **VENTURE**, manteniendo ownership individual como atributo de responsabilidad, no como frontera de autorizacion.

---

## OBJ-03 — Gestionar validacion

**Tipo:** CORE  
**Actores:** Founder/Owner; Team member autorizado  
**Scope objetivo:** VENTURE  
**Resultado observable:** el venture registra evidencia, la vincula a hipotesis/objetivos y detecta vacios de validacion.

### HU primarias
- HU-VAL-001 a HU-VAL-006.

### Frontera futura de CU
CU candidato: **Gestionar evidencia de validacion**.

Extensiones candidatas:
- vincular señal a objetivo;
- identificar blind spots;
- sugerir siguiente evidencia;
- eliminar señal.

### Regla
La inteligencia puede recomendar una evidencia, pero no debe crear una evidencia empirica que no haya ocurrido.

### Dependencias
OBJ-02 para objetivos; OBJ-12 para inteligencia.

---

## OBJ-04 — Gestionar decisiones y aprendizaje

**Tipo:** CORE  
**Actor:** Founder/Owner; eventualmente miembros con capability  
**Scope objetivo:** VENTURE  
**Resultado observable:** las decisiones quedan trazables desde contexto y evidencia hasta resultado y aprendizaje.

### HU primarias
- HU-ENG-004 — Registrar decision.
- HU-ENG-005 — Registrar resultado/aprendizaje.
- HU-CMD-004 — reutilizar aprendizaje de intervenciones.

### HU soporte
- HU-INT-003 — confidence/evidence.
- HU-INT-004/006 — memoria y replay.

### Frontera futura
No separar "registrar resultado" de "registrar decision" como CU completamente independiente: es una extension temporal del ciclo de decision.

---

## OBJ-05 — Gestionar equipo y capacidad

**Tipo:** CORE/GOVERNANCE  
**Actor primario:** Founder/Owner  
**Actor secundario:** Team member  
**Scope objetivo:** VENTURE  
**Resultado observable:** el venture tiene membresia, roles, responsabilidades y capacidad operativa visibles y gobernadas.

### HU primarias
- HU-TEAM-001 a HU-TEAM-005.
- HU-VEN-004 — acceso como miembro.

### HU relacionadas
- HU-BLD-006.
- HU-VAL-006.
- HU-RES-004.

### Decision clave
**Membresia no equivale a autorizacion.**

Modelo objetivo:
```
User
  ↓
VentureMember
  ↓
VentureRole / capabilities
  ↓
Resource scope / assignment
  ↓
Authorization decision
```

`VentureMember.role` como string libre no debe ser la fuente final de autorizacion.

---

## OBJ-06 — Gestionar recursos

**Tipo:** SUPPORT  
**Actores:** Founder/Owner; Team member autorizado  
**Scope objetivo:** VENTURE  
**Resultado observable:** recursos operativos son registrados, asignados y evaluados por disponibilidad, uso, costo y criticidad.

### HU primarias
- HU-RES-001 a HU-RES-004.

### Frontera futura
CU candidato: **Gestionar recurso operativo**.

La inteligencia de recursos es una extension analitica del mismo objetivo.

### Dependencias
OBJ-05 para responsables/capabilities.

---

## OBJ-07 — Gestionar capital

**Tipo:** CORE  
**Actor primario:** Founder/Owner  
**Actores secundarios:** Investor autorizado; Organization analyst cuando aplique  
**Scope objetivo:** VENTURE + RELATIONSHIP  
**Resultado observable:** el venture registra realidad financiera, evalua escenarios y estructura acciones de capital sin confundir simulacion con ejecucion.

### HU primarias
- HU-CAP-001 a HU-CAP-007.

### Subobjetivos internos
```
Base financiera
  → Valoracion
  → Readiness
  → Fundraising
  → Simulacion
  → Confirmacion explicita
  → Ejecucion
```

### Reglas de frontera
- Snapshot es evidencia de entrada.
- Valoracion/fundraising son analisis.
- Simulacion no cambia el estado operacional.
- Ejecucion requiere confirmacion explicita.
- Investor solo recibe informacion compartida/autorizada.

### CU candidatos
- Gestionar base financiera.
- Evaluar estrategia de capital.
- Ejecutar plan de capital.
- Revisar oportunidad compartida.

No crear un CU por cada formula financiera.

---

## OBJ-08 — Gestionar riesgo y resiliencia

**Tipo:** CORE  
**Actores:** Founder/Owner; Organization analyst autorizado  
**Scope:** VENTURE / ORGANIZATION  
**Resultado observable:** se detectan exposiciones respaldadas por evidencia y se conserva historial de resiliencia.

### HU primarias
- HU-RISK-001.
- HU-RISK-002.
- HU-RISK-003.

### Regla
Una señal de riesgo no equivale automaticamente a causalidad ni a un hecho futuro. Debe conservar evidencia, confidence y contexto.

### Separacion de scope
- Riesgo individual: VENTURE.
- Riesgo agregado: ORGANIZATION.
- El agregado no habilita automaticamente lectura irrestricta de datos privados de cada venture.

---

## OBJ-09 — Gestionar relaciones y colaboracion

**Tipo:** SUPPORT  
**Actores:** Usuario autenticado; Mentor; Founder; Investor segun contexto  
**Scope:** RELATIONSHIP  
**Resultado observable:** usuarios crean relaciones profesionales sin convertir automaticamente esas relaciones en permisos.

### HU primarias
- HU-REL-001 a HU-REL-004.

### Regla estructural
```
Connection != VentureMember
Connection != OrganizationUser
Connection != Authorization
```

Una conexion puede ser prerequisito de una invitacion, pero no una concesion de acceso.

---

## OBJ-10 — Gestionar organizaciones y portafolios

**Tipo:** CORE/GOVERNANCE  
**Actores:** Organization admin; analyst/viewer/mentor autorizado  
**Scope:** ORGANIZATION  
**Resultado observable:** una organizacion puede administrar miembros y consultar un portafolio segun permisos contextuales.

### HU primarias
- HU-ORG-001 a HU-ORG-003.
- HU-RISK-003.

### Estado
PARCIAL/FALTANTE.

### Bloqueadores antes de declararlo implementado
1. resolver inconsistencia `OrganizationUser.status`;
2. formalizar roles/capabilities;
3. verificar membership en cada endpoint;
4. separar lectura agregada de lectura de venture;
5. definir auditoria de accesos.

---

## OBJ-11 — Gestionar identidad, acceso y autorizacion

**Tipo:** GOVERNANCE  
**Actores:** Usuario; Platform admin; Founder/Owner; Organization admin  
**Scope:** USER / VENTURE / ORGANIZATION / PLATFORM  
**Resultado observable:** cada accion se ejecuta solo cuando identidad, sesion, contexto y capability lo permiten.

### HU primarias
- HU-AUTH-001.
- HU-AUTH-002.
- HU-AUTH-003.
- HU-ADM-001.
- HU-TEAM-005.
- HU-ORG-003.
- HU-REL-004.

### Modelo objetivo

```
Authentication
  → Session validity
  → MFA state
  → Context resolution
  → Membership
  → Capability
  → Resource scope
  → Authorization
  → Audit
```

### Regla
`requireAuth()` y `requireRole()` no deben evolucionar como dos modelos de seguridad divergentes.

### Dependencia critica
Este objetivo es transversal y bloquea el cierre real de OBJ-02, 03, 05, 06, 07, 08 y 10 para actores distintos del owner.

---

## OBJ-12 — Operar memoria e inteligencia computacional

**Tipo:** SYSTEM  
**Actor:** VELA System  
**Scope:** SYSTEM  
**Resultado observable:** VELA deriva inteligencia desde la verdad operacional, mantiene memoria computacional y puede recuperarla sin perder consistencia.

### HU primarias
- HU-INT-001 a HU-INT-006.
- HU-CMD-005.

### Arquitectura objetivo

```
PostgreSQL
  │ canonical operational truth
  ▼
Outbox / Event Store
  ▼
Atlas projector
  ▼
MongoDB Atlas
  ├── Computational Memory
  ├── GWO
  ├── Digital Twin
  ├── Graph Intelligence
  └── Learning Memory
  ▼
Atlas Change Streams
  ▼
Realtime Gateway
  ▼
Trust Layer
  ▼
Authorized subscribers

Recovery:
PostgreSQL Event Store
  → deterministic replay
  → Atlas reconstruction
```

### Invariantes
1. PostgreSQL conserva la verdad operacional canonica.
2. Atlas no reemplaza el estado operacional.
3. Todo documento derivado debe ser reconstruible desde eventos canonicos o fuentes identificables.
4. Change Streams transporta cambios; no decide permisos.
5. Trust Layer filtra audiencia, scope y confidence antes de publicar.
6. Un fallo de Atlas no debe impedir registrar una transaccion operacional valida en PostgreSQL.
7. Replay debe ser idempotente.
8. Realtime no debe convertir estados derivados en hechos canonicos.

### Estado
PARCIAL. Es el principal objetivo SYSTEM pendiente de cierre en 2.14.

---

## 3. Dependencias entre objetivos

| Objetivo | Depende principalmente de |
|---|---|
| OBJ-01 Dirigir venture | 02,03,04,07,08,12 |
| OBJ-02 Ejecucion | 05,11,12 |
| OBJ-03 Validacion | 02,11,12 |
| OBJ-04 Decisiones/aprendizaje | 03,12 |
| OBJ-05 Equipo/capacidad | 09,11 |
| OBJ-06 Recursos | 05,11 |
| OBJ-07 Capital | 11,12 |
| OBJ-08 Riesgo | 11,12 |
| OBJ-09 Relaciones | 11 |
| OBJ-10 Organizaciones | 11,12 |
| OBJ-11 Identidad/autorizacion | autenticacion + modelos de membership |
| OBJ-12 Inteligencia | Event Store + Atlas + contratos de dominio |

---

## 4. HU que NO deben transformarse directamente en CU

Las siguientes historias describen principalmente comportamiento interno o extensiones:

- HU-CMD-004: extension de direccion/aprendizaje.
- HU-CMD-005: requisito transversal realtime.
- HU-BLD-005: extension analitica de ejecucion.
- HU-VAL-004/005: extensiones de inteligencia de validacion.
- HU-TEAM-004: extension analitica de gestion de equipo.
- HU-RES-003: extension analitica de recursos.
- HU-CAP-005/006: subflujos analiticos.
- HU-REL-004: regla de autorizacion.
- HU-INT-001 a 006: casos de uso de sistema/arquitectura, no CU de usuario convencional.
- HU-AUTH-002/003: flujos de seguridad que pueden ser include/extend.

---

## 5. Candidatos para FASE 5 — Casos de uso

### Actor Founder/Owner
- CU-01 Dirigir venture con evidencia.
- CU-02 Gestionar ejecucion.
- CU-03 Gestionar evidencia de validacion.
- CU-04 Gestionar ciclo de decision y aprendizaje.
- CU-05 Gestionar equipo del venture.
- CU-06 Gestionar recursos operativos.
- CU-07 Gestionar base financiera.
- CU-08 Evaluar estrategia de capital.
- CU-09 Ejecutar plan de capital.
- CU-10 Gestionar riesgo del venture.

### Actor Team member
- CU-11 Colaborar en ejecucion autorizada.
- CU-12 Registrar evidencia autorizada.
- CU-13 Gestionar recursos asignados.

### Actor Organization admin / analyst
- CU-14 Gestionar membresia organizacional.
- CU-15 Consultar portafolio autorizado.
- CU-16 Analizar riesgo agregado.

### Actor Investor
- CU-17 Revisar oportunidad compartida.

### Actor Usuario / Network
- CU-18 Gestionar relacion profesional.

### Actor Platform admin
- CU-19 Administrar usuarios de plataforma.

### Actor VELA System
- CUS-01 Proyectar evento canonico a Atlas.
- CUS-02 Procesar cambio computacional en realtime.
- CUS-03 Autorizar publicacion realtime.
- CUS-04 Reconstruir memoria computacional mediante replay.

La numeracion es candidata y puede ajustarse al formalizar include/extend en FASE 5.

---

## 6. Decisiones que FASE 4 fija para fases posteriores

### D4-01 — VENTURE es la frontera funcional principal
Los datos de operacion del negocio deben converger conceptualmente en Venture. `ownerId` sigue siendo util para autoria/responsabilidad, pero no debe ser el unico mecanismo de acceso.

### D4-02 — Autorizacion es capability-based y contextual
Los roles globales no son suficientes para Team, Organization, Investor ni Mentor.

### D4-03 — Las relaciones sociales no conceden permisos
Relay/Network queda desacoplado del modelo de autorizacion.

### D4-04 — Inteligencia no sustituye evidencia
Los motores pueden derivar, priorizar, comparar y recomendar; no deben fabricar hechos empiricos.

### D4-05 — Simulacion no equivale a ejecucion
Especialmente en Capital, Digital Twin y optimizadores.

### D4-06 — PostgreSQL sigue siendo canonico
Atlas sirve memoria/inteligencia computacional. La recuperacion se diseña desde el Event Store canonico.

### D4-07 — Realtime es un efecto derivado
Una notificacion realtime no es una transaccion canonica ni una autorizacion.

---

## 7. Definition of Ready para FASE 5

Un objetivo puede convertirse en caso de uso formal cuando:

- tiene actor primario;
- tiene resultado observable;
- su scope esta definido;
- se conocen precondiciones de autorizacion;
- las HU asociadas estan trazadas;
- se diferencia flujo de usuario de procesamiento interno;
- se conocen dependencias principales;
- no depende de una UI especifica;
- no presupone datos ficticios;
- conserva estados de insuficiencia de evidencia cuando corresponda.

Los 19 CU de usuario y 4 CU de sistema candidatos cumplen esta condicion a nivel de especificacion, aunque varios siguen marcados como implementacion parcial o faltante.
