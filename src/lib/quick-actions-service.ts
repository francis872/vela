import { prisma } from "@/lib/prisma";
import { QUICK_ACTIONS, type QuickActionKey, type QuickActionModule } from "@/lib/quick-actions";

async function resolveUserId(params: { userId: string; userEmail?: string }) {
  const byId = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true },
  });

  if (byId) {
    return byId.id;
  }

  if (params.userEmail) {
    const normalizedEmail = params.userEmail.trim().toLowerCase();
    const byEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (byEmail) {
      return byEmail.id;
    }
  }

  throw new Error("No se encontró el usuario para registrar la acción");
}

export async function recordQuickAction(params: {
  actionKey: QuickActionKey;
  module: QuickActionModule;
  userId: string;
  userEmail?: string;
  context?: string;
}) {
  const action = QUICK_ACTIONS[params.actionKey];
  const resolvedUserId = await resolveUserId({
    userId: params.userId,
    userEmail: params.userEmail,
  });

  return prisma.quickActionExecution.create({
    data: {
      actionKey: params.actionKey,
      module: params.module,
      context: params.context,
      message: action.successMessage,
      userId: resolvedUserId,
    },
    select: {
      id: true,
      actionKey: true,
      module: true,
      context: true,
      message: true,
      userId: true,
      createdAt: true,
    },
  });
}

export async function listRecentQuickActions(limit = 25) {
  return prisma.quickActionExecution.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      actionKey: true,
      module: true,
      context: true,
      message: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}
