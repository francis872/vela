import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const checkedAt = new Date().toISOString();
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - startedAt;

    return NextResponse.json({
      status: "ok",
      checkedAt,
      app: {
        status: "up",
        uptimeSeconds: Math.floor(process.uptime()),
        env: process.env.NODE_ENV || "development",
      },
      database: {
        status: "up",
        latencyMs,
      },
    });
  } catch {
    const latencyMs = Date.now() - startedAt;

    return NextResponse.json(
      {
        status: "degraded",
        checkedAt,
        app: {
          status: "up",
          uptimeSeconds: Math.floor(process.uptime()),
          env: process.env.NODE_ENV || "development",
        },
        database: {
          status: "down",
          latencyMs,
        },
      },
      { status: 503 },
    );
  }
}
