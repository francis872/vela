import { prisma } from "@/lib/prisma";

export type StoredDomainEventInput = {
  ownerId: string;
  name: string;
  aggregate?: string | null;
  aggregateId?: string | null;
  payload: unknown;
  occurredAt?: string | Date;
};

export async function appendDomainEvent(input: StoredDomainEventInput) {
  return prisma.domainEventRecord.create({
    data: {
      ownerId: input.ownerId,
      name: input.name,
      aggregate: input.aggregate ?? null,
      aggregateId: input.aggregateId ?? null,
      payload: JSON.stringify(input.payload ?? {}),
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
    },
  });
}

export async function readDomainEvents(ownerId: string, options?: { after?: Date; limit?: number }) {
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);
  const records = await prisma.domainEventRecord.findMany({
    where: {
      ownerId,
      ...(options?.after ? { occurredAt: { gt: options.after } } : {}),
    },
    orderBy: { occurredAt: "asc" },
    take: limit,
  });

  return records.map((record) => ({
    id: record.id,
    ownerId: record.ownerId,
    name: record.name,
    aggregate: record.aggregate,
    aggregateId: record.aggregateId,
    occurredAt: record.occurredAt.toISOString(),
    payload: safePayload(record.payload),
  }));
}

function safePayload(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
