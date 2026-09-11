export type DomainEventMap = {
  objective_created: { objectiveId: string; ownerId: string };
  objective_updated: { objectiveId: string; ownerId: string };
  sprint_created: { sprintId: string; ownerId: string };
  sprint_completed: { sprintId: string; ownerId: string; actorId: string };
  interview_created: { signalId: string; ownerId: string; objectiveId: string | null };
  metric_recorded: { signalId: string; ownerId: string; objectiveId: string | null };
  capital_evaluated: { ownerId: string; readiness: number | null };
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
  for (const handler of (handlers[name] ?? []) as EventHandler<Name>[]) {
    await handler(event);
  }
  return event;
}

