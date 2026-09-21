import { appendDomainEvent } from "@/lib/event-store";

export type DomainEventMap = {
  objective_created: { objectiveId: string; ownerId: string };
  objective_updated: { objectiveId: string; ownerId: string };
  sprint_created: { sprintId: string; ownerId: string };
  sprint_completed: { sprintId: string; ownerId: string; actorId: string };
  interview_created: { signalId: string; ownerId: string; objectiveId: string | null };
  metric_recorded: { signalId: string; ownerId: string; objectiveId: string | null };
  capital_evaluated: { ownerId: string; readiness: number | null };
  decision_created: { decisionId: string; ownerId: string };
  decision_outcome_recorded: { decisionId: string; ownerId: string };
  decision_learning_consolidated: { decisionId: string; ownerId: string; outcomeStatus: string };
  decision_memory_created: { learningId: string; decisionId: string; ownerId: string; outcomeStatus: string };
  team_member_added: { memberId: string; ventureId: string; ownerId: string; userId: string };
  team_member_updated: { memberId: string; ventureId: string; ownerId: string; status: string };
  team_work_assigned: { assignmentId: string; memberId: string; ventureId: string; ownerId: string; workType: string; workId: string };
  team_work_updated: { assignmentId: string; memberId: string; ventureId: string; ownerId: string; status: string };
  resource_created: { resourceId: string; ventureId: string; ownerId: string; resourceType: string };
  resource_updated: { resourceId: string; ownerId: string; status: string };
  resource_allocated: { allocationId: string; resourceId: string; ventureId: string; ownerId: string; workType: string; workId: string };
  resource_allocation_updated: { allocationId: string; resourceId: string; ventureId: string; ownerId: string; status: string };
  algorithm_challenger_promoted: { ownerId: string; family: string; fromVersion: string; toVersion: string };
  algorithm_rollback: { ownerId: string; family: string; fromVersion: string; toVersion: string; reason: string };
  gate_created: { gateId: string; ownerId: string };
  gate_updated: { gateId: string; ownerId: string; status: string };
  intervention_started: { interventionId: string; ownerId: string; targetMetric: string };
  intervention_completed: { interventionId: string; ownerId: string; outcomeStatus: string | null };
  learning_created: { learningId: string; interventionId: string; ownerId: string; outcomeStatus: string };
  relay_thread_created: { threadId: string; ownerId: string; category: string };
  relay_connection_created: { connectionId: string; ownerId: string; toUserId: string; type: string };
  relay_connection_removed: { ownerId: string; toUserId: string };
};

export type DomainEventName = keyof DomainEventMap;

export type DomainEvent<Name extends DomainEventName = DomainEventName> = {
  name: Name;
  occurredAt: string;
  payload: DomainEventMap[Name];
};

type EventHandler<Name extends DomainEventName> = (
  event: DomainEvent<Name>,
) => void | Promise<void>;

const handlers: Partial<{ [Name in DomainEventName]: EventHandler<Name>[] }> = {};

export function onDomainEvent<Name extends DomainEventName>(
  name: Name,
  handler: EventHandler<Name>,
) {
  const eventHandlers = (handlers[name] ??= []) as EventHandler<Name>[];
  eventHandlers.push(handler);
  return () => {
    const index = eventHandlers.indexOf(handler);
    if (index >= 0) eventHandlers.splice(index, 1);
  };
}

export async function dispatchDomainEvent<Name extends DomainEventName>(
  name: Name,
  payload: DomainEventMap[Name],
) {
  const event = {
    name,
    occurredAt: new Date().toISOString(),
    payload,
  } as DomainEvent<Name>;
  const ownerId = "ownerId" in payload && typeof payload.ownerId === "string" ? payload.ownerId : null;
  if (ownerId) {
    const idEntry = Object.entries(payload).find(([key, value]) => key.endsWith("Id") && key !== "ownerId" && typeof value === "string");
    await appendDomainEvent({
      ownerId,
      name,
      aggregate: idEntry ? idEntry[0].replace(/Id$/, "") : null,
      aggregateId: idEntry ? String(idEntry[1]) : null,
      payload,
      occurredAt: event.occurredAt,
    });
  }

  for (const handler of (handlers[name] ?? []) as EventHandler<Name>[]) {
    await handler(event);
  }
  return event;
}

