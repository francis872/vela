import { prisma } from "@/lib/prisma";

export type PulseSnapshotInput = {
  ownerId: string;
  velocity: number | null;
  validation: number | null;
  risk: number | null;
  readiness: number | null;
  sprintCompletion: number | null;
  trajectoryStatus: string;
  commandStatus: string;
  commandPriority: string;
};

export type PulseHistoryPoint = {
  capturedAt: string;
  velocity: number | null;
  validation: number | null;
  risk: number | null;
  readiness: number | null;
  sprintCompletion: number | null;
};

export type PulseTrend = {
  status: "AVAILABLE" | "INSUFFICIENT_DATA";
  direction: "IMPROVING" | "STABLE" | "DECLINING" | null;
  velocityPerDay: number | null;
  delta: number | null;
  daysObserved: number | null;
  points: PulseHistoryPoint[];
  explanation: string;
  dynamics: {
    status: "AVAILABLE" | "INSUFFICIENT_DATA";
    state: "ACCELERATING" | "DECELERATING" | "DETERIORATING" | "TURNING_POSITIVE" | "TURNING_NEGATIVE" | "STEADY" | null;
    previousVelocityPerDay: number | null;
    recentVelocityPerDay: number | null;
    accelerationPerDay2: number | null;
    explanation: string;
  };
};

const SNAPSHOT_WINDOW_HOURS = 6;
const HISTORY_DAYS = 90;
const MIN_CHANGE = 3;
const MIN_DYNAMIC_POINTS = 4;
const MIN_SLOPE_SIGNAL = 0.75;
const MIN_ACCELERATION_SIGNAL = 0.75;

function bucketFor(date: Date) {
  const bucketHours = Math.floor(date.getUTCHours() / SNAPSHOT_WINDOW_HOURS) * SNAPSHOT_WINDOW_HOURS;
  return `${date.toISOString().slice(0, 10)}T${String(bucketHours).padStart(2, "0")}`;
}

function roundNullable(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

export async function capturePulseSnapshot(input: PulseSnapshotInput) {
  const now = new Date();
  const bucket = bucketFor(now);
  return prisma.venturePulseSnapshot.upsert({
    where: { ownerId_bucket: { ownerId: input.ownerId, bucket } },
    create: {
      ownerId: input.ownerId,
      bucket,
      velocity: roundNullable(input.velocity),
      validation: roundNullable(input.validation),
      risk: roundNullable(input.risk),
      readiness: roundNullable(input.readiness),
      sprintCompletion: roundNullable(input.sprintCompletion),
      trajectoryStatus: input.trajectoryStatus,
      commandStatus: input.commandStatus,
      commandPriority: input.commandPriority,
      capturedAt: now,
    },
    update: {
      velocity: roundNullable(input.velocity),
      validation: roundNullable(input.validation),
      risk: roundNullable(input.risk),
      readiness: roundNullable(input.readiness),
      sprintCompletion: roundNullable(input.sprintCompletion),
      trajectoryStatus: input.trajectoryStatus,
      commandStatus: input.commandStatus,
      commandPriority: input.commandPriority,
      capturedAt: now,
    },
  });
}

function operatingScore(point: PulseHistoryPoint) {
  const positive = [point.velocity, point.validation, point.readiness, point.sprintCompletion]
    .filter((value): value is number => typeof value === "number");
  const risk = typeof point.risk === "number" ? 100 - point.risk : null;
  if (risk !== null) positive.push(risk);
  if (positive.length < 2) return null;
  return positive.reduce((sum, value) => sum + value, 0) / positive.length;
}

function slopePerDay(items: { point: PulseHistoryPoint; score: number }[]) {
  if (items.length < 2) return null;
  const first = items[0];
  const last = items[items.length - 1];
  const elapsedDays = Math.max(
    (new Date(last.point.capturedAt).getTime() - new Date(first.point.capturedAt).getTime()) / 86400000,
    SNAPSHOT_WINDOW_HOURS / 24,
  );
  return (last.score - first.score) / elapsedDays;
}

function dynamicsFor(scored: { point: PulseHistoryPoint; score: number }[]): PulseTrend["dynamics"] {
  if (scored.length < MIN_DYNAMIC_POINTS) {
    return {
      status: "INSUFFICIENT_DATA",
      state: null,
      previousVelocityPerDay: null,
      recentVelocityPerDay: null,
      accelerationPerDay2: null,
      explanation: "VELA needs at least four comparable historical snapshots to distinguish acceleration, deceleration and turning points.",
    };
  }

  const split = Math.floor(scored.length / 2);
  const previous = scored.slice(0, split + 1);
  const recent = scored.slice(Math.max(0, split - 1));
  const previousSlope = slopePerDay(previous);
  const recentSlope = slopePerDay(recent);

  if (previousSlope === null || recentSlope === null) {
    return {
      status: "INSUFFICIENT_DATA",
      state: null,
      previousVelocityPerDay: null,
      recentVelocityPerDay: null,
      accelerationPerDay2: null,
      explanation: "Historical snapshots exist, but their spacing is not sufficient to calculate comparable slopes.",
    };
  }

  const acceleration = recentSlope - previousSlope;
  let state: PulseTrend["dynamics"]["state"] = "STEADY";

  if (previousSlope <= -MIN_SLOPE_SIGNAL && recentSlope >= MIN_SLOPE_SIGNAL) {
    state = "TURNING_POSITIVE";
  } else if (previousSlope >= MIN_SLOPE_SIGNAL && recentSlope <= -MIN_SLOPE_SIGNAL) {
    state = "TURNING_NEGATIVE";
  } else if (recentSlope <= -MIN_SLOPE_SIGNAL && acceleration <= -MIN_ACCELERATION_SIGNAL) {
    state = "DETERIORATING";
  } else if (recentSlope > 0 && acceleration >= MIN_ACCELERATION_SIGNAL) {
    state = "ACCELERATING";
  } else if (recentSlope > 0 && acceleration <= -MIN_ACCELERATION_SIGNAL) {
    state = "DECELERATING";
  } else if (recentSlope < 0) {
    state = "DETERIORATING";
  }

  const label = {
    ACCELERATING: "Improvement is gaining speed",
    DECELERATING: "The venture is still improving, but momentum is slowing",
    DETERIORATING: "Operating evidence is deteriorating",
    TURNING_POSITIVE: "VELA detected a positive turning point",
    TURNING_NEGATIVE: "VELA detected a negative turning point",
    STEADY: "The rate of change is broadly steady",
  }[state];

  return {
    status: "AVAILABLE",
    state,
    previousVelocityPerDay: Math.round(previousSlope * 10) / 10,
    recentVelocityPerDay: Math.round(recentSlope * 10) / 10,
    accelerationPerDay2: Math.round(acceleration * 10) / 10,
    explanation: `${label}. Previous slope: ${Math.round(previousSlope * 10) / 10} pts/day; recent slope: ${Math.round(recentSlope * 10) / 10} pts/day.`,
  };
}

export async function getPulseTrend(ownerId: string): Promise<PulseTrend> {
  const since = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000);
  const snapshots = await prisma.venturePulseSnapshot.findMany({
    where: { ownerId, capturedAt: { gte: since } },
    orderBy: { capturedAt: "asc" },
    take: 120,
    select: {
      capturedAt: true,
      velocity: true,
      validation: true,
      risk: true,
      readiness: true,
      sprintCompletion: true,
    },
  });

  const points = snapshots.map((item) => ({
    capturedAt: item.capturedAt.toISOString(),
    velocity: item.velocity,
    validation: item.validation,
    risk: item.risk,
    readiness: item.readiness,
    sprintCompletion: item.sprintCompletion,
  }));

  const scored = points
    .map((point) => ({ point, score: operatingScore(point) }))
    .filter((item): item is { point: PulseHistoryPoint; score: number } => item.score !== null);

  if (scored.length < 2) {
    return {
      status: "INSUFFICIENT_DATA",
      direction: null,
      velocityPerDay: null,
      delta: null,
      daysObserved: null,
      points,
      explanation: "VELA needs at least two historical Pulse snapshots with enough comparable metrics to measure direction and speed.",
      dynamics: dynamicsFor(scored),
    };
  }

  const first = scored[0];
  const last = scored[scored.length - 1];
  const elapsedDays = Math.max(
    (new Date(last.point.capturedAt).getTime() - new Date(first.point.capturedAt).getTime()) / 86400000,
    SNAPSHOT_WINDOW_HOURS / 24,
  );
  const delta = last.score - first.score;
  const direction = delta >= MIN_CHANGE ? "IMPROVING" : delta <= -MIN_CHANGE ? "DECLINING" : "STABLE";
  const velocityPerDay = delta / elapsedDays;
  const dynamics = dynamicsFor(scored);

  return {
    status: "AVAILABLE",
    direction,
    velocityPerDay: Math.round(velocityPerDay * 10) / 10,
    delta: Math.round(delta * 10) / 10,
    daysObserved: Math.round(elapsedDays * 10) / 10,
    points,
    explanation: `${direction === "IMPROVING" ? "Operating evidence is improving" : direction === "DECLINING" ? "Operating evidence is declining" : "Operating evidence is broadly stable"} across ${scored.length} comparable snapshots over ${Math.round(elapsedDays * 10) / 10} day(s).`,
    dynamics,
  };
}
