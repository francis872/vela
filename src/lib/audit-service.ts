import { prisma } from "@/lib/prisma";

type AuditInput = {
  userId?: string;
  action: string;
  module: string;
  detail?: string;
  ip?: string;
  userAgent?: string;
};

export async function writeAuditLog(input: AuditInput) {
  return prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      module: input.module,
      detail: input.detail,
      ip: input.ip,
      userAgent: input.userAgent,
    },
  });
}
