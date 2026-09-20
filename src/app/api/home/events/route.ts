import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { readDomainEvents } from "@/lib/event-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POLL_MS = 2000;
const HEARTBEAT_MS = 15000;
const MAX_STREAM_MS = 55000;

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const ownerId = auth.session.sub;
  const encoder = new TextEncoder();
  const requestedAfter = new URL(req.url).searchParams.get("after");
  let cursor = requestedAfter ? new Date(requestedAfter) : new Date(Date.now() - 5000);
  if (Number.isNaN(cursor.getTime())) cursor = new Date(Date.now() - 5000);

  const stream = new ReadableStream({
    async start(controller) {
      const started = Date.now();
      let lastHeartbeat = 0;

      try {
        controller.enqueue(encoder.encode(`event: ready\ndata: ${JSON.stringify({ connected: true, at: new Date().toISOString() })}\n\n`));

        while (Date.now() - started < MAX_STREAM_MS) {
          const events = await readDomainEvents(ownerId, { after: cursor, limit: 100 });
          for (const event of events) {
            controller.enqueue(encoder.encode(`id: ${event.id}\nevent: domain-event\ndata: ${JSON.stringify(event)}\n\n`));
            const occurredAt = new Date(event.occurredAt);
            if (occurredAt > cursor) cursor = occurredAt;
          }

          if (Date.now() - lastHeartbeat >= HEARTBEAT_MS) {
            controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
            lastHeartbeat = Date.now();
          }

          await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        }
      } catch (error) {
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: error instanceof Error ? error.message : "stream_failed" })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
