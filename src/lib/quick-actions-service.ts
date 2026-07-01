import { prisma } from "@/lib/prisma";
import { QUICK_ACTIONS, type QuickActionKey } from "@/lib/quick-actions";

type RecordInput = {
  actionKey: QuickActionKey;
  module: "lums" | "insights" | "builder-lab" | "capital-ops";
  userId: string;
  userEmail: string;
  context?: string;
};

export async function recordQuickAction(input: RecordInput) {
  const action = QUICK_ACTIONS[input.actionKey];

  return prisma.quickActionExecution.create({
    data: {
      actionKey: input.actionKey,
      module: input.module,
      userId: input.userId,
      context: input.context?.trim() || null,
      message: action.message,
    },
  });
}

export async function listRecentQuickActions(limit: number) {
  return prisma.quickActionExecution.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      module: true,
      actionKey: true,
      message: true,
      context: true,
      userId: true,
      createdAt: true,
    },
  });
}