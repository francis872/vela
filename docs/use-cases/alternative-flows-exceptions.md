# VELA 2.14 — FASE 7: Flujos alternativos y excepciones

Estado: ESPECIFICACION FORMAL  
Base: FASE 1–6  
Objetivo: describir todas las desviaciones funcionales y tecnicas relevantes sin dejar estados parcialmente validos.

## 1. Convenciones

Cada desviacion usa:
- `nA/nB`: alternativa funcional originada en el paso n.
- `En`: excepcion tecnica o de seguridad.
- **Resultado**: estado observable.
- **Retorno**: paso al que vuelve o FINALIZA.
- **Persistencia**: cambios confirmados o rollback.
- **Evento**: emitido / no emitido.
- **Respuesta**: HTTP/UI esperada.

Principio rector:

> Ninguna excepcion debe dejar una operacion canonica parcialmente valida.

---

# 2. Excepciones transversales

## EX-AUTH-001 — Sesion invalida o ausente
**Origen:** cualquier paso que incluya CU-AUTH-Z01.  
**Condicion:** token inexistente/invalido.  
**Comportamiento:** rechazar antes de leer/escribir recursos protegidos.  
**Resultado:** acceso denegado.  
**Retorno:** FINALIZA.  
**Persistencia:** sin cambios.  
**Evento:** no.  
**Respuesta:** 401; UI redirige a autenticacion.

## EX-AUTH-002 — Sesion revocada
**Origen:** validacion de AuthSession.  
**Condicion:** revokedAt != null.  
**Comportamiento:** rechazar.  
**Resultado:** sesion no autorizada.  
**Retorno:** FINALIZA.  
**Persistencia:** sin cambios funcionales; opcional SecurityEvent.  
**Respuesta:** 401/403.

## EX-AUTH-003 — MFA pendiente
**Origen:** validacion de sesion.  
**Condicion:** mfaPending.  
**Comportamiento:** bloquear CU y dirigir a MFA.  
**Retorno:** flujo de MFA; luego reintento del CU.  
**Persistencia:** sin cambios del dominio.

## EX-AUTH-004 — Capability insuficiente
**Origen:** resolucion contextual.  
**Condicion:** membership valida pero capability ausente.  
**Comportamiento:** negar accion y no revelar datos fuera de scope.  
**Retorno:** FINALIZA.  
**Persistencia:** sin cambios; opcional Audit/SecurityEvent.  
**Respuesta:** 403.

## EX-DATA-001 — Recurso inexistente
**Origen:** lectura/mutacion por id.  
**Comportamiento:** devolver no encontrado sin crear sustitutos.  
**Retorno:** FINALIZA o vuelve a selector.  
**Persistencia:** sin cambios.  
**Respuesta:** 404.

## EX-DATA-002 — Payload invalido
**Origen:** validacion de input.  
**Comportamiento:** rechazar antes de persistir.  
**Persistencia:** sin cambios.  
**Evento:** no.  
**Respuesta:** 400/422 con campos invalidos.

## EX-DB-001 — PostgreSQL no disponible
**Origen:** cualquier lectura/escritura canonica.  
**Comportamiento:** detener operacion; no sustituir con Atlas.  
**Resultado:** servicio temporalmente no disponible.  
**Persistencia:** ninguna escritura nueva confirmada.  
**Evento:** no si la transaccion no confirmo.  
**Respuesta:** 503/500 controlado.

## EX-CONC-001 — Conflicto de concurrencia
**Origen:** mutacion sensible con version/estado cambiado.  
**Comportamiento:** no sobrescribir silenciosamente; informar conflicto.  
**Retorno:** recargar estado y reintentar.  
**Persistencia:** sin mutacion del intento fallido.  
**Respuesta:** 409.  
**Estado:** DISEÑADO para areas sin control explicito actual.

## EX-INT-001 — Motor de inteligencia falla
**Origen:** paso analitico posterior a lectura canonica.  
**Comportamiento:** conservar datos operativos; devolver inteligencia degradada/no disponible.  
**Persistencia:** no inventar resultado.  
**Evento:** no crear evento analitico exitoso.  
**Respuesta:** 200 con estado degradado cuando el CU operacional puede continuar, o 503 si el objetivo depende totalmente del motor.

## EX-ATLAS-001 — Atlas no disponible
**Origen:** proyeccion/memoria computacional.  
**Comportamiento:** no invalidar transaccion canonica ya confirmada; registrar fallo y dejar evento recuperable.  
**Persistencia:** PostgreSQL conserva verdad; Atlas sin cambio.  
**Evento:** evento canonico permanece.  
**Respuesta usuario:** operacion operacional puede ser exitosa con inteligencia temporalmente degradada.

## EX-RT-001 — Canal realtime desconectado
**Origen:** SSE/WebSocket/Change Stream delivery.  
**Comportamiento:** cliente conserva estado actual y puede reconsultar API canonica.  
**Persistencia:** sin efecto.  
**Retorno:** reconexion/refresh.  
**Regla:** realtime nunca es fuente de verdad.

---

# 3. CU-CMD-001 — Dirigir venture con evidencia

## Alternativas
**3A — No existe venture**  
1. VELA detecta ausencia de Venture.  
2. Devuelve estado SETUP/NO_VENTURE.  
3. UI ofrece crear/configurar venture.  
**Retorno:** FINALIZA consulta.  
**Persistencia:** ninguna.  
**Evento:** no.  
**Respuesta:** 200 con estado funcional, no 500.

**4A — Evidencia insuficiente**  
1. VELA detecta metricas sin soporte suficiente.  
2. Marca `INSUFFICIENT_DATA`/LOW confidence.  
3. Continua con las metricas disponibles.  
**Retorno:** paso 5.  
**Persistencia:** ninguna.

**6A — No existe Learning Memory relevante**  
1. VELA no encuentra memoria comparable.  
2. Omite recomendacion historica.  
3. Continua con prioridad actual.  
**Retorno:** paso 7.

**8A — Actor decide no iniciar intervencion**  
Resultado: CU finaliza en consulta.  
Persistencia/evento: ninguno.

## Excepciones
- EX-AUTH-001/002/003/004.
- EX-DB-001.
- EX-INT-001.
- EX-ATLAS-001 para memoria.
- EX-RT-001 para actualizacion en vivo.

---

# 4. CU-BLD-001 — Gestionar ejecucion

## Alternativas
**4A — Crear Objective**  
Valida titulo/status/prioridad → persiste → evento `objective_created` → retorna a paso 10.

**4B — Actualizar Objective**  
Valida recurso/scope → persiste → evento `objective_updated`.

**4C — Eliminar Objective**  
Valida recurso/scope → elimina.  
**Nota:** el codigo actual no emite evento de eliminacion; documentar como brecha si realtime/intelligence necesita invalidacion.

**8A — No existe sprint**  
VELA mantiene ejecucion por objetivos y muestra cadencia ausente.  
Retorno: paso 10.

**8B — Gate permanece pendiente**  
No impide necesariamente operar otros objetivos; se conserva `pending`.

**10A — Sin dependencias**  
Build Intelligence devuelve grafo vacio/estable, sin inventar critical path.

**10B — Dependencia ciclica**  
VELA marca cycle/risk y no presenta un critical path falso.  
Retorno: paso 11.

## Excepciones
- EX-AUTH-*.
- EX-DATA-001/002.
- EX-CONC-001.
- EX-DB-001.
- Si escritura Objective confirma pero proyeccion Atlas falla → EX-ATLAS-001.

---

# 5. CU-VAL-001 — Gestionar evidencia

## Alternativas
**5A — Signal sin Objective**  
Se guarda con objectiveId null.  
VELA la marca unlinked.  
Retorno: paso 9.

**6A — Objective inexistente**  
Rechazar; Signal no se crea.  
Respuesta: 404.

**6B — Objective existe pero actor no esta autorizado**  
Rechazar; sin revelar contenido del objetivo.  
Respuesta: 403/404 segun politica anti-enumeracion.

**10A — Cobertura suficiente**  
VELA devuelve STABLE y puede no sugerir nuevo Signal.

**10B — Actor elimina Signal**  
Validar scope → eliminar → recalcular cobertura.  
Evento actual de delete: no garantizado; brecha documental.

## Excepciones
EX-AUTH-*, EX-DATA-002, EX-DB-001, EX-INT-001.

---

# 6. CU-DEC-001 — Decision y aprendizaje

## Alternativas
**5A — Outcome aun desconocido**  
Decision permanece abierta.  
Sin evento de outcome.

**8A — Outcome registrado sin consolidar aprendizaje**  
Persistir outcome/outcomeStatus; emitir `decision_outcome_recorded`; no promover a Learning Memory.

**8B — Consolidar aprendizaje**  
Persistir learnedAt → emitir `decision_learning_consolidated` → intentar memoria derivada.

**9A — Atlas no disponible**  
Decision y learning canonico permanecen en PostgreSQL/event store.  
Memoria derivada queda pendiente de replay.

## Excepciones
- decision inexistente → 404;
- outcomeStatus invalido → 400;
- DB falla antes del commit → rollback;
- Atlas falla despues del commit → EX-ATLAS-001.

---

# 7. CU-TEAM-001 — Gestionar equipo

## Alternativas
**4A — Usuario no existe/inactivo**  
Rechazar incorporacion. 404/409. Sin cambios.

**7A — Membership ya existe activa**  
Actualizar role/responsibility mediante upsert.  
Evento: team_member_added actualmente puede representar reactivacion; considerar evento semantico distinto en backlog.

**7B — Membership existe inactiva**  
Reactivar status=active y actualizar datos.

**9A — Desactivar miembro**  
Actualizar status=inactive.  
No eliminar historial/asignaciones automaticamente.

**10A — Sin datos suficientes de skills/capacity**  
Mostrar brechas, no inventar coverage.

## Excepciones
- actor no autorizado;
- cross-venture member reference;
- DB conflict;
- audit fail despues de cambio sensible: si audit es requisito atomico futuro, rollback; hoy PARCIAL.

---

# 8. CU-RES-001 — Recursos

## Alternativas
**1A — No existe venture**  
Devuelve empty/409 segun lectura/escritura.

**3A — Recurso sin costo/responsable**  
Permitir campos opcionales; inteligencia reduce precision.

**6A — Limpiar ownerMemberId**  
Aceptar null y desasignar.

**8A — No hay recursos**  
Empty state, no score ficticio.

## Excepciones
- recurso no encontrado;
- recurso de otro venture;
- ownerMemberId de otro venture → rechazar;
- DB/constraint failure → sin estado parcial.

---

# 9. CU-CAP-001 — Base financiera

## Alternativas
**4A — Periodo ya existe**  
Upsert actualiza snapshot del mismo venture/periodo.

**4B — Campo opcional vacio**  
Persistir null cuando corresponda.

**4C — Revenue/operatingCosts invalidos**  
Rechazar 400; no crear snapshot.

## Excepciones
- sin venture → 409;
- DB failure → rollback;
- evento falla despues del snapshot: bajo arquitectura objetivo, evento/outbox debe quedar atomicamente garantizado; hoy brecha.

---

# 10. CU-CAP-002 — Estrategia de capital

## Alternativas
**3A — Sin snapshot**  
No ejecutar valuation/fundraising dependiente; indicar registrar base financiera.

**4A — Evidencia insuficiente para readiness**  
Devolver `INSUFFICIENT_DATA`.

**6A — Solo valoracion deterministica**  
Ejecutar valuation engine; no GWO/Twin.

**6B — Actor solicita escenario**  
Ejecutar scenario optimizer/Digital Twin sin cambiar estado operacional.

**6C — Actor solicita fundraising**  
Validar snapshot → construir plan → persistir FundraisingPlan.

**7A — Parametros adaptativos fuera de gobernanza**  
Aplicar parametros gobernados/fallback; registrar version.

**10A — Resultado de baja confidence**  
Presentar confidence/evidence y evitar lenguaje concluyente.

## Excepciones
- motor falla → no persistir resultado exitoso;
- timeout → operacion analitica no muta estado operacional;
- Atlas falla al almacenar computational run → resultado canonico analitico en PG permanece si fue confirmado.

---

# 11. CU-CAP-003 — Ejecutar plan de capital

## Alternativas
**4A — Actor cancela/no confirma**  
No mutar FundraisingPlan. Finaliza.

**5A — confirmed != true**  
Responder 409; no mutacion/evento.

**2A — Plan no pertenece al venture**  
404/403; no revelar detalle.

## Excepciones
- DB failure antes de update → sin cambios;
- evento/outbox debe ser atomico con activacion en arquitectura objetivo.

---

# 12. CU-RISK-001 — Riesgo

## Alternativas
**3A — Sin snapshot financiero**  
Rechazar creacion y solicitar evidencia base.

**4A — Exposiciones opcionales ausentes**  
Motor calcula solo con evidencia disponible y reduce confidence si corresponde.

**5A — No aparecen señales criticas**  
Persistir assessment/resilience sin inventar riesgos.

## Excepciones
- motor falla antes de persistir → no crear assessment parcial;
- fallo al crear RiskSignals dentro del assessment → transaccion debe revertir assessment/resilience relacionados;
- evento posterior falla → outbox objetivo debe garantizar recuperacion.

---

# 13. CU-BLD-002 / CU-VAL-002 / CU-RES-002 — Colaboracion autorizada

## Alternativas comunes
**3A — Membership no existe**  
403/404; finaliza.

**3B — Membership inactive**  
403; finaliza.

**4A — Capability read-only**  
Permitir lectura, negar mutacion.

**5A — Recurso asignado a otro miembro pero role permite lectura**  
Mostrar segun capability; negar escritura si no corresponde.

**7A — Capability cambia entre lectura y escritura**  
Revalidar antes de persistir; si ya no existe, 403 sin mutacion.

## Excepciones
EX-AUTH-*, EX-CONC-001, EX-DB-001.

---

# 14. CU-ORG-001 — Membership organizacional

## Alternativas
**3A — Sin miembros**  
Mostrar empty state.

**4A — Usuario ya miembro**  
Actualizar role en lugar de duplicar.

**5A — Actor es viewer/mentor sin members.manage**  
403; sin cambios.

**5B — Role solicitado no pertenece al vocabulario permitido**  
400/422.

## Excepciones
- Organization inexistente;
- actor sin membership;
- audit failure: objetivo futuro debe definir atomicidad de membership+audit.

---

# 15. CU-ORG-002 — Portafolio autorizado

## Alternativas
**2A — Actor no es miembro**  
403/404; no cargar portfolio.

**4A — Venture no ha consentido detalle**  
Incluir solo agregado permitido/redactado.

**5A — Sin cohorts/ventures**  
PortfolioState vacio valido.

**5B — Falta RiskSnapshot**  
Risk section `INSUFFICIENT_DATA`.

## Excepcion actual
**E-ORG-SCHEMA-001 — OrganizationUser.status inexistente**  
Origen: buildPortfolioState.  
Comportamiento requerido: no ejecutar query invalida.  
Resolucion: alinear schema o quitar filtro antes de considerar CU operativo.  
Estado actual: CRITICO.

---

# 16. CU-ORG-003 — Riesgo agregado

## Alternativas
**3A — Parte del portfolio no autoriza detalle**  
Agregar solo datos permitidos/anonymized aggregate.

**3B — Sin snapshots suficientes**  
Devolver insuficiencia, no extrapolar.

## Excepciones
- auth contextual;
- datos incompatibles/versiones distintas → excluir y reportar calidad;
- DB/engine failure → no persistir snapshot agregado parcial.

---

# 17. CU-INV-001 — Oportunidad compartida

## Alternativas
**3A — Consentimiento revocado**  
Denegar acceso inmediatamente.

**3B — Oportunidad expirada/inactiva**  
Mostrar no disponible.

**5A — Acceso solo lectura**  
Ocultar accion de review.

**6A — Investor registra review**  
Revalidar capability/consent antes de persistir.

## Excepciones
- identidad no verificada;
- recurso no compartido;
- datos sensibles sin policy de redaccion → DENY por defecto.

---

# 18. CU-REL-001 — Relacion profesional

## Alternativas
**4A — Crear follow**  
Persistir type follow.

**4B — Collaborate**  
Persistir collaborate; no crear membership.

**4C — Mentor**  
Persistir mentor; no conceder acceso.

**8A — Eliminar conexion**  
deleteMany direccion correspondiente + evento removed.

## Excepciones
- target=self → 400;
- target inexistente/inactivo → 404;
- type invalido → 400;
- DB conflict → sin duplicado por unique/upsert.

---

# 19. CU-ADM-001 — Usuarios de plataforma

## Alternativas
**3A — Crear usuario**  
Validar payload/role → persistir → audit user_created.

**3B — Actualizar usuario sin cambio de role**  
Persistir; audit segun politica.

**3C — Cambiar role**  
Persistir + audit user_role_changed.

## Excepciones
- no admin → 403;
- payload invalido → 400;
- email duplicado → 409 recomendado;
- audit failure tras role change → definir atomicidad futura; actualmente brecha.

---

# 20. CU-AUTH-001 — Sesion segura

## Alternativas
**4A — MFA no requerido**  
Continuar directamente a sesion habilitada.

**4B — MFA requerido**  
Solicitar segundo factor.

**8A — Usuario revoca sesion**  
Marcar revokedAt y terminar sesiones futuras.

**8B — Admin revoca por seguridad**  
Igual comportamiento + SecurityEvent.

## Excepciones
- credenciales invalidas → 401 + AccessLog failure;
- codigo MFA invalido/expirado → 401/400; sin habilitar sesion;
- session record missing → negar;
- rate limit → 429.

---

# 21. CUS-DF-001 — Proyeccion Atlas

## Alternativas
**3A — Atlas no configurado**  
SKIPPED; evento canonico permanece.

**6A — Documento ya existe**  
Upsert idempotente; no duplicar.

**6B — Proyeccion no necesaria para tipo de evento**  
Marcar/omitir segun projector registry.

## Excepciones
- Atlas timeout → no marcar proyectado/checkpoint;
- payload no parseable → dead-letter/error state objetivo;
- schema/version desconocida → detener esa proyeccion y registrar incompatibilidad.

---

# 22. CUS-RT-001 — Change Streams / Realtime

## Alternativas
**2A — Cambio no relevante**  
Descartar sin publicacion.

**3A — Resume token valido tras reconexion**  
Reanudar desde token.

**7A — No existen subscribers autorizados**  
No publicar; no es error.

## Excepciones
- Change Stream cae → reconnect/backoff;
- resume token invalido/expired → estrategia controlada de re-sincronizacion, no salto silencioso;
- Atlas no disponible → realtime degradado, APIs canonicas siguen funcionales.

---

# 23. CUS-TRUST-001 — Trust Layer

## Alternativas
**8A — ALLOW**  
Publicar payload minimizado.

**8B — REDACT**  
Eliminar campos sensibles y publicar subset.

**8C — DENY**  
No publicar; auditar si es sensible.

## Excepciones
- no se puede resolver audience → DENY por defecto;
- consent data no disponible → DENY/RETRY, nunca ALLOW por defecto;
- fingerprint/provenance invalida → DENY + SecurityEvent;
- policy engine falla → fail closed.

---

# 24. CUS-RPL-001 — Replay

## Alternativas
**2A — No hay eventos nuevos**  
Declarar IN_SYNC; finalizar.

**4A — Evento ya proyectado**  
Upsert idempotente; avanzar segun cursor.

**6A — Batch alcanza limite operativo**  
Persistir checkpoint y continuar en siguiente ciclo.

## Excepciones
**E-RPL-001 — PostgreSQL falla**  
Detener; no avanzar checkpoint.

**E-RPL-002 — Atlas falla**  
Detener; no avanzar checkpoint del evento fallido.

**E-RPL-003 — Evento corrupto/version incompatible**  
No saltar silenciosamente. Registrar error/dead-letter y definir policy de continuacion.

**E-RPL-004 — Checkpoint inconsistente**  
Recalcular/verificar contra event_documents antes de continuar.

---

# 25. Matriz de atomicidad

| Operacion | Estado canonico | Evento | Atlas | Politica |
|---|---|---|---|---|
| Crear Objective | PostgreSQL | requerido | derivado | PG+evento deben tender a outbox atomico |
| Crear Signal | PostgreSQL | segun tipo | derivado | no depender de Atlas |
| Decision outcome | PostgreSQL | requerido | Learning derivado | Atlas puede recuperar |
| Add Team Member | PostgreSQL | requerido | Graph derivado | membership canonica en PG |
| Financial Snapshot | PostgreSQL | requerido | opcional derivado | nunca perder snapshot por Atlas |
| Fundraising activation | PostgreSQL | requerido | derivado | confirmacion explicita + evento |
| Risk Assessment | PostgreSQL | requerido | derived state | assessment/signals/resilience atomicos |
| Organization role change | PostgreSQL | audit requerido | no | membership+audit politica a formalizar |
| Atlas projection | no cambia canonico | consume evento | Atlas | idempotente |
| Realtime publish | no cambia canonico | consume derivado | no canonico | best effort + Trust |
| Replay | lee canonico | consume eventos | reconstruye | checkpoint tras exito |

---

# 26. Matriz HTTP/UI recomendada

| Condicion | HTTP | UI |
|---|---:|---|
| no autenticado | 401 | login |
| autenticado sin permiso | 403 | access denied |
| recurso no encontrado | 404 | not found/empty |
| payload invalido | 400/422 | validaciones inline |
| conflicto | 409 | recargar/reintentar |
| rate limit | 429 | retry later |
| dependencia externa/Atlas degradado | 200 degradado o 503 segun CU | banner de inteligencia/realtime degradado |
| PostgreSQL indisponible | 503 | service unavailable |
| insufficient data | 200 | DataState INSUFFICIENT_DATA |
| operacion exitosa creada | 201 | success + refresh |
| operacion exitosa actualizada | 200 | success |

---

# 27. Eventos: cuando NO emitir

No emitir evento de exito cuando:
- autenticacion/autorizacion falla;
- input es invalido;
- recurso no existe;
- transaccion canonica hace rollback;
- motor falla antes de producir/persistir resultado requerido;
- usuario cancela una accion antes de confirmar;
- Trust Layer devuelve DENY.

Si la transaccion canonica ya confirmo, el evento/outbox debe quedar garantizado por el diseño objetivo; no debe depender de una segunda escritura best-effort no atomica.

---

# 28. Salida para FASE 8

FASE 8 debe formalizar relaciones UML de casos de uso con:
- actores y generalizaciones;
- includes obligatorios;
- extends condicionales;
- fronteras VENTURE / ORGANIZATION / PLATFORM / SYSTEM;
- separacion de actores humanos y VELA System;
- justificacion de cada relacion;
- Mermaid versionable.

Tambien debe corregir cualquier relacion `include/extend` que FASE 7 revele como secuencia simple en vez de reutilizacion/extension real.
